// Edge Function: send-message — ADR-012
// Génère un brouillon IA (OnSpace AI) depuis le contexte réservation
// JAMAIS auto-send — insert avec status='draft' pour validation humaine obligatoire
// Canaux supportés: email, sms, whatsapp, in_app

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SendMessagePayload {
  conversation_id?: string;         // Si conversation existante
  guest_id?: string;                // Pour créer une nouvelle conversation
  reservation_id?: string;          // Contexte réservation
  channel: string;                  // email | sms | whatsapp | in_app
  content?: string;                 // Contenu manuel (si pas d'IA)
  generate_draft?: boolean;         // Activer génération IA
  template_id?: string;             // Template à utiliser comme base
  language?: string;                // fr | en | ar
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

    // F7: guest-facing messaging is restricted to staff-level roles and above.
    const MESSAGING_ROLES = ["owner", "admin", "manager", "staff"];
    if (!MESSAGING_ROLES.includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "Votre rôle ne permet pas d'envoyer de message" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse payload ─────────────────────────────────────────────────────────
    const payload: SendMessagePayload = await req.json();
    const {
      conversation_id, guest_id, reservation_id, channel = "email",
      content, generate_draft = false, template_id, language = "fr",
    } = payload;

    if (!conversation_id && !guest_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id ou guest_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve or create conversation ────────────────────────────────────────
    let convId = conversation_id;

    // F3: a caller-supplied conversation id must belong to the caller's tenant.
    if (convId) {
      const { data: ownConv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("id", convId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!ownConv) {
        return new Response(
          JSON.stringify({ error: "Conversation introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!convId && guest_id) {
      // F9: the guest must belong to the caller's tenant before anything is linked to it.
      const { data: ownGuest } = await supabaseAdmin
        .from("guests")
        .select("id")
        .eq("id", guest_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!ownGuest) {
        return new Response(
          JSON.stringify({ error: "Voyageur introuvable" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing open conversation for this guest
      const { data: existingConv } = await supabaseAdmin
        .from("conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("guest_id", guest_id)
        .eq("channel", channel)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabaseAdmin
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            guest_id,
            reservation_id: reservation_id || null,
            channel,
            subject: `Nouveau message — ${channel}`,
            status: "open",
          })
          .select("id")
          .single();

        if (convError) {
          return new Response(
            JSON.stringify({ error: "Impossible de créer la conversation." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        convId = newConv.id;
      }
    }

    // ── Resolve template content ──────────────────────────────────────────────
    let baseContent = content ?? "";

    if (template_id) {
      const { data: template } = await supabaseAdmin
        .from("message_templates")
        .select("body, variables")
        .eq("id", template_id)
        .eq("tenant_id", tenantId)
        .single();

      if (template) {
        baseContent = template.body;
      }
    }

    // ── Context enrichment from reservation ───────────────────────────────────
    let contextData: Record<string, string> = {};

    if (reservation_id) {
      const { data: res } = await supabaseAdmin
        .from("reservations")
        .select("guest_first_name, guest_last_name, check_in, check_out, nights, total_amount, currency, channel, unit_id")
        .eq("id", reservation_id)
        .eq("tenant_id", tenantId)   // F2: never read a reservation outside the caller's tenant
        .maybeSingle();

      if (res) {
        contextData = {
          guest_name:   `${res.guest_first_name ?? ''} ${res.guest_last_name ?? ''}`.trim(),
          check_in:     res.check_in ?? '',
          check_out:    res.check_out ?? '',
          nights:       String(res.nights ?? ''),
          total_amount: `${Number(res.total_amount).toFixed(2)} ${res.currency}`,
          channel:      res.channel ?? '',
        };

        // Variable injection in template
        if (baseContent) {
          for (const [key, val] of Object.entries(contextData)) {
            baseContent = baseContent.replace(new RegExp(`{{${key}}}`, 'g'), val);
          }
        }
      }
    }

    // ── AI Draft generation (OnSpace AI) ──────────────────────────────────────
    let finalContent = baseContent;
    let isDraftGenerated = false;

    if (generate_draft && !baseContent) {
      // Build context-aware prompt
      const contextStr = Object.entries(contextData)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const prompt = language === "ar"
        ? `أنت موظف استقبال لدى شركة إدارة عقارات للإيجار القصير. اكتب رسالة مهنية ومهذبة للضيف. السياق: ${contextStr}. القناة: ${channel}. النبرة: ودية ومهنية. لا ترسل تلقائياً — هذا مسودة فقط.`
        : language === "en"
          ? `You are a property management assistant for a short-term rental company. Write a professional, friendly message for the guest. Context: ${contextStr}. Channel: ${channel}. Tone: warm and professional. This is a DRAFT — never send automatically.`
          : `Vous êtes un gestionnaire immobilier. Rédigez un message professionnel et chaleureux pour le voyageur. Contexte: ${contextStr}. Canal: ${channel}. Ton: aimable et professionnel. Ceci est un BROUILLON — ne jamais envoyer automatiquement.`;

      try {
        const aiResponse = await fetch("https://ai.onspace.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("ONSPACE_AI_KEY") ?? ""}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
            temperature: 0.7,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const draft = aiData?.choices?.[0]?.message?.content?.trim();
          if (draft) {
            finalContent = draft;
            isDraftGenerated = true;
            console.log("[send-message] Brouillon IA généré:", draft.slice(0, 80));
          }
        } else {
          console.warn("[send-message] AI service unavailable — using fallback");
          finalContent = language === "fr"
            ? `Bonjour ${contextData.guest_name ?? 'Madame/Monsieur'},\n\n[Rédigez votre message ici]\n\nCordialement,\nL'équipe de gestion`
            : `Dear ${contextData.guest_name ?? 'Guest'},\n\n[Write your message here]\n\nBest regards,\nProperty Management Team`;
        }
      } catch (aiErr) {
        console.error("[send-message] AI error:", aiErr);
        finalContent = `Bonjour,\n\n[Brouillon — à compléter]\n\nCordialement`;
      }
    }

    if (!finalContent) {
      finalContent = `[Message sans contenu — à compléter]`;
    }

    // ── Insert message as DRAFT (never auto-send — ADR-012) ───────────────────
    const { data: newMessage, error: msgError } = await supabaseAdmin
      .from("messages")
      .insert({
        tenant_id:       tenantId,
        conversation_id: convId,
        direction:       "outbound",
        content:         finalContent,
        content_type:    "text",
        sender_type:     "manager",
        sender_id:       user.id,
        status:          "draft",   // ⚠️ JAMAIS 'sent' automatiquement — ADR-012
        sent_at:         null,      // Null jusqu'à envoi manuel validé
      })
      .select("id")
      .single();

    if (msgError) {
      console.error("[send-message] Message insert error:", msgError);
      return new Response(
        JSON.stringify({ error: "Impossible d'enregistrer le message." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update conversation unread count + last_message_at
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        updated_at:      new Date().toISOString(),
      })
      .eq("id", convId);

    // Audit log
    await supabaseAdmin.from("audit_events").insert({
      tenant_id:   tenantId,
      actor_id:    user.id,
      actor_type:  "user",
      action:      "message.draft_created",
      entity_type: "message",
      entity_id:   newMessage.id,
      new_data: {
        conversation_id: convId,
        channel,
        is_ai_generated: isDraftGenerated,
        status: "draft",
        content_preview: finalContent.slice(0, 100),
      },
    });

    console.log(`[send-message] Brouillon créé: ${newMessage.id} dans conversation ${convId}`);

    return new Response(
      JSON.stringify({
        success:          true,
        message_id:       newMessage.id,
        conversation_id:  convId,
        status:           "draft",
        is_ai_generated:  isDraftGenerated,
        content:          finalContent,
        channel,
        note:             "ADR-012: Brouillon créé — validation humaine obligatoire avant envoi. Jamais d'envoi automatique.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[send-message] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne. Veuillez réessayer." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
