// Edge Function: cancel-reservation — ADR-010 / ADR-020
// Annule une réservation avec workflow d'approbation si nécessaire
// Libère le calendrier (calendar_availability → available)
// Crée ledger_entry de remboursement si applicable
// Append-only: reservation_status_history + audit_events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface CancelReservationPayload {
  reservation_id: string;
  reason: string;
  refund_amount?: number;
  requires_approval?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
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
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: membership } = await supabaseAdmin
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Aucun tenant actif" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const tenantId = membership.tenant_id;

    // F7: cancelling a booking is a privileged action, not a member action.
    const CANCEL_ROLES = ["owner", "admin", "manager"];
    if (!CANCEL_ROLES.includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Votre rôle ne permet pas d'annuler une réservation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse payload ─────────────────────────────────────────────────────────
    const { reservation_id, reason, refund_amount: rawRefund = 0, requires_approval = false }: CancelReservationPayload = await req.json();

    // F6: the refund is a value-carrying quantity supplied by the browser.
    const refundNumber = Number(rawRefund);
    if (!Number.isFinite(refundNumber) || refundNumber < 0) {
      return new Response(
        JSON.stringify({ error: "Montant de remboursement invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    let refund_amount = Math.round(refundNumber * 100) / 100;

    if (!reservation_id || !reason) {
      return new Response(
        JSON.stringify({ error: "reservation_id et reason sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch reservation ─────────────────────────────────────────────────────
    const { data: reservation, error: resError } = await supabaseAdmin
      .from("reservations")
      .select("id, status, unit_id, check_in, check_out, total_amount, currency, guest_first_name, guest_last_name, version")
      .eq("id", reservation_id)
      .eq("tenant_id", tenantId)
      .single();

    if (resError || !reservation) {
      return new Response(
        JSON.stringify({ error: "Réservation introuvable" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Already cancelled
    if (reservation.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: "Réservation déjà annulée" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cannot cancel checked_out reservations
    if (reservation.status === "checked_out") {
      return new Response(
        JSON.stringify({ error: "Impossible d'annuler une réservation avec check-out effectué" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // F6: a refund can never exceed what was actually charged.
    const reservationTotal = Number(reservation.total_amount) || 0;
    if (refund_amount > reservationTotal) {
      return new Response(
        JSON.stringify({ error: "Le remboursement ne peut pas dépasser le montant de la réservation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Check if approval required ────────────────────────────────────────────
    // F6: the gate keys on the refund itself, not only on the reservation total.
    const needsApproval = requires_approval ||
      (reservation.status === "checked_in") ||
      (refund_amount > 500) ||
      (reservationTotal > 1000 && refund_amount > 0);

    if (needsApproval) {
      // Create approval_request instead of immediate cancellation
      const { data: approvalReq, error: approvalError } = await supabaseAdmin
        .from("approval_requests")
        .insert({
          tenant_id:          tenantId,
          scenario:           "cancellation_with_refund",
          title:              `Annulation réservation — ${reservation.guest_first_name} ${reservation.guest_last_name}`,
          description:        `Demande d'annulation: ${reason}. Montant remboursement: ${refund_amount} ${reservation.currency}. Statut actuel: ${reservation.status}.`,
          priority:           refund_amount > 500 ? "high" : "normal",
          status:             "pending",
          approval_type:      "single",
          required_approvers: ["tenant_admin"],
          current_approvers:  [],
          entity_type:        "reservation",
          entity_id:          reservation_id,
          requested_action:   {
            action: "cancel_reservation",
            reservation_id,
            reason,
            refund_amount,
            currency: reservation.currency,
          },
          requested_by:       user.id,
          deadline:           new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          version:            1,
        })
        .select("id")
        .single();

      if (approvalError) {
        console.error("[cancel-reservation] Approval insert error:", approvalError);
        return new Response(
          JSON.stringify({ error: "Impossible de soumettre la demande d'approbation." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Audit log
      await supabaseAdmin.from("audit_events").insert({
        tenant_id:   tenantId,
        actor_id:    user.id,
        actor_type:  "user",
        action:      "reservation.cancellation_requested",
        entity_type: "reservation",
        entity_id:   reservation_id,
        new_data:    { reason, refund_amount, approval_request_id: approvalReq?.id },
      });

      return new Response(
        JSON.stringify({
          success:             true,
          requires_approval:   true,
          approval_request_id: approvalReq?.id,
          message:             "Demande d'annulation soumise pour approbation",
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Immediate cancellation ────────────────────────────────────────────────
    const prevStatus = reservation.status;

    // Update reservation status
    const { error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({
        status:     "cancelled",
        version:    (reservation.version ?? 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Impossible d'annuler la réservation." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Append status history
    await supabaseAdmin.from("reservation_status_history").insert({
      tenant_id:      tenantId,
      reservation_id,
      from_status:    prevStatus,
      to_status:      "cancelled",
      reason,
      changed_by:     user.id,
    });

    // Free calendar slots
    await supabaseAdmin
      .from("calendar_availability")
      .update({ status: "available", reservation_id: null })
      .eq("unit_id", reservation.unit_id)
      .eq("tenant_id", tenantId)
      .gte("date", reservation.check_in)
      .lt("date", reservation.check_out);

    // Ledger entry for refund (if applicable)
    if (refund_amount > 0) {
      await supabaseAdmin.from("ledger_entries").insert({
        tenant_id:      tenantId,
        reservation_id,
        entry_type:     "refund",
        direction:      "debit",
        amount:         refund_amount,
        currency:       reservation.currency,
        description:    `Remboursement annulation — ${reservation.guest_first_name} ${reservation.guest_last_name} — ${reason}`,
        created_by:     user.id,
      });
    }

    // Audit log
    await supabaseAdmin.from("audit_events").insert({
      tenant_id:   tenantId,
      actor_id:    user.id,
      actor_type:  "user",
      action:      "reservation.cancelled",
      entity_type: "reservation",
      entity_id:   reservation_id,
      old_data:    { status: prevStatus },
      new_data:    { status: "cancelled", reason, refund_amount },
    });

    return new Response(
      JSON.stringify({
        success:           true,
        reservation_id,
        previous_status:   prevStatus,
        refund_amount,
        currency:          reservation.currency,
        message:           `Réservation annulée — motif: ${reason}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[cancel-reservation] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne. Veuillez réessayer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
