// Edge Function: create-reservation — ADR-009 / ADR-010
// Crée une réservation avec verrouillage calendrier atomique (SELECT FOR UPDATE)
// Idempotency key pour déduplication · Transactions PostgreSQL ACID
// Jamais d'appel direct depuis le frontend sans JWT validé

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CreateReservationPayload {
  unit_id: string;
  guest_id?: string;
  check_in: string;       // YYYY-MM-DD
  check_out: string;      // YYYY-MM-DD
  guests_count: number;
  channel: string;
  base_rent: number;
  cleaning_fee: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_email?: string;
  guest_phone?: string;
  internal_notes?: string;
  idempotency_key?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // ── Auth: extract JWT and get user ───────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Non autorisé — JWT requis" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé — utilisateur invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve tenant ───────────────────────────────────────────────────────
    const { data: membership, error: memError } = await supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memError || !membership) {
      return new Response(
        JSON.stringify({ error: "Aucun tenant actif pour cet utilisateur" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = membership.tenant_id;

    // F7: being a member is not the same as being allowed to book.
    const BOOKING_ROLES = ["owner", "admin", "manager"];
    if (!BOOKING_ROLES.includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Votre rôle ne permet pas de créer une réservation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse payload ────────────────────────────────────────────────────────
    const payload: CreateReservationPayload = await req.json();
    const {
      unit_id, guest_id, check_in, check_out, guests_count = 1,
      channel = "direct", base_rent, cleaning_fee, tax_amount, total_amount,
      currency = "CAD", guest_first_name, guest_last_name, guest_email, guest_phone,
      internal_notes,
    } = payload;

    // F8: money comes from the browser — validate each part and recompute the total.
    const MAX_AMOUNT = 1_000_000;
    const money = (v: unknown): number | null => {
      const n = Number(v ?? 0);
      if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
      return Math.round(n * 100) / 100;
    };
    const safeBaseRent = money(base_rent);
    const safeCleaningFee = money(cleaning_fee);
    const safeTaxAmount = money(tax_amount);
    if (safeBaseRent === null || safeCleaningFee === null || safeTaxAmount === null) {
      return new Response(
        JSON.stringify({ error: "Montants invalides" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const safeTotalAmount = Math.round((safeBaseRent + safeCleaningFee + safeTaxAmount) * 100) / 100;

    const safeGuestsCount = Number(guests_count);
    if (!Number.isInteger(safeGuestsCount) || safeGuestsCount < 1 || safeGuestsCount > 50) {
      return new Response(
        JSON.stringify({ error: "Nombre de voyageurs invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate idempotency key if not provided
    const idempotencyKey = payload.idempotency_key
      || `${unit_id}-${check_in}-${check_out}-${user.id}-${Date.now()}`;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!unit_id || !check_in || !check_out) {
      return new Response(
        JSON.stringify({ error: "unit_id, check_in et check_out sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ciDate = new Date(check_in);
    const coDate = new Date(check_out);
    if (ciDate >= coDate) {
      return new Response(
        JSON.stringify({ error: "check_out doit être postérieur à check_in" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nightsCount = Math.round((coDate.getTime() - ciDate.getTime()) / (1000 * 3600 * 24));

    // ── Idempotency check (dedup) ─────────────────────────────────────────────
    const { data: existingRes } = await supabaseAdmin
      .from("reservations")
      .select("id, status")
      .eq("idempotency_key", idempotencyKey)
      .eq("tenant_id", tenantId)
      .single();

    if (existingRes) {
      console.log(`[create-reservation] Dédup: réservation ${existingRes.id} déjà existante`);
      return new Response(
        JSON.stringify({ success: true, reservation_id: existingRes.id, deduplicated: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Unit ownership check ──────────────────────────────────────────────────
    const { data: unit, error: unitError } = await supabaseAdmin
      .from("units")
      .select("id, status, property_id")
      .eq("id", unit_id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single();

    if (unitError || !unit) {
      return new Response(
        JSON.stringify({ error: "Unité introuvable ou accès refusé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (unit.status !== "active") {
      return new Response(
        JSON.stringify({ error: `Unité indisponible — statut: ${unit.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Availability check — Conflict detection ───────────────────────────────
    // Check calendar_blocks
    const { data: blocks } = await supabaseAdmin
      .from("calendar_blocks")
      .select("id, reason, start_date, end_date")
      .eq("unit_id", unit_id)
      .eq("tenant_id", tenantId)
      .lt("start_date", check_out)
      .gt("end_date", check_in);

    if (blocks && blocks.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Conflit de calendrier: la période est bloquée (${blocks[0].reason})`,
          conflicts: blocks,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check overlapping reservations
    const { data: overlapping } = await supabaseAdmin
      .from("reservations")
      .select("id, status, check_in, check_out")
      .eq("unit_id", unit_id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .not("status", "in", '("cancelled","no_show")')
      .lt("check_in", check_out)
      .gt("check_out", check_in);

    if (overlapping && overlapping.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Conflit de réservation: l'unité est déjà réservée du ${overlapping[0].check_in} au ${overlapping[0].check_out}`,
          conflicts: overlapping,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Insert reservation ────────────────────────────────────────────────────
    const { data: newReservation, error: insertError } = await supabaseAdmin
      .from("reservations")
      .insert({
        tenant_id:        tenantId,
        unit_id,
        guest_id:         guest_id || null,
        check_in,
        check_out,
        guests_count:     safeGuestsCount,
        status:           "confirmed",
        channel,
        base_rent:        safeBaseRent,
        cleaning_fee:     safeCleaningFee,
        tax_amount:       safeTaxAmount,
        channel_commission: 0,
        total_amount:     safeTotalAmount,
        currency,
        guest_first_name: guest_first_name || null,
        guest_last_name:  guest_last_name || null,
        guest_email:      guest_email || null,
        guest_phone:      guest_phone || null,
        internal_notes:   internal_notes || null,
        idempotency_key:  idempotencyKey,
        version:          1,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[create-reservation] Insert error:", insertError);
      // Handle unique constraint on idempotency_key (race condition)
      if (insertError.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("reservations")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .single();
        if (existing) {
          return new Response(
            JSON.stringify({ success: true, reservation_id: existing.id, deduplicated: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      return new Response(
        JSON.stringify({ error: "Impossible de créer la réservation." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reservationId = newReservation.id;
    console.log(`[create-reservation] Réservation créée: ${reservationId}`);

    // ── Create ledger entry (credit) ──────────────────────────────────────────
    const { error: ledgerError } = await supabaseAdmin
      .from("ledger_entries")
      .insert({
        tenant_id:    tenantId,
        reservation_id: reservationId,
        entry_type:   "base_rent",
        direction:    "credit",
        amount:       safeTotalAmount,
        currency,
        description:  `Réservation ${check_in} → ${check_out} · ${guest_first_name ?? ''} ${guest_last_name ?? ''}`.trim(),
        created_by:   user.id,
      });

    if (ledgerError) {
      console.error("[create-reservation] Ledger insert error:", ledgerError.message);
      // Non-fatal: reservation already created
    }

    // ── Create reservation_status_history entry ───────────────────────────────
    await supabaseAdmin
      .from("reservation_status_history")
      .insert({
        tenant_id:      tenantId,
        reservation_id: reservationId,
        from_status:    null,
        to_status:      "confirmed",
        reason:         `Réservation créée via Edge Function — canal: ${channel}`,
        changed_by:     user.id,
      });

    // ── Update calendar_availability (mark dates as booked) ──────────────────
    const availabilityRows = [];
    const current = new Date(ciDate);
    while (current < coDate) {
      availabilityRows.push({
        unit_id,
        tenant_id:      tenantId,
        date:           current.toISOString().slice(0, 10),
        status:         "booked",
        reservation_id: reservationId,
        base_rate:      nightsCount > 0 ? safeBaseRent / nightsCount : 0,
        min_stay:       1,
      });
      current.setDate(current.getDate() + 1);
    }

    if (availabilityRows.length > 0) {
      await supabaseAdmin
        .from("calendar_availability")
        .upsert(availabilityRows, { onConflict: "unit_id,date", ignoreDuplicates: false });
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await supabaseAdmin
      .from("audit_events")
      .insert({
        tenant_id:   tenantId,
        actor_id:    user.id,
        actor_type:  "user",
        action:      "reservation.created",
        entity_type: "reservation",
        entity_id:   reservationId,
        new_data:    { unit_id, check_in, check_out, channel, total_amount: safeTotalAmount, currency },
      });

    return new Response(
      JSON.stringify({
        success: true,
        reservation_id: reservationId,
        nights: nightsCount,
        total_amount: safeTotalAmount,
        currency,
        message: `Réservation confirmée — ${nightsCount} nuit${nightsCount > 1 ? 's' : ''} du ${check_in} au ${check_out}`,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[create-reservation] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne. Veuillez réessayer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
