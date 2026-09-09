# ADR-017 — Architecture Agentique : Human-in-the-Loop

**Statut** : FROZEN 🔒  
**Date** : 2026-08-10  
**PROMPT** : 17 — Architecture Agentique  

---

## Contexte

Le PMS SaaS intègre 6 agents IA spécialisés capables de lire des données, rédiger du contenu, suggérer des actions et — sous réserve d'approbation humaine — exécuter certaines opérations. Le workflow W-13 (Pipeline Agent IA) est le seul vecteur d'exécution post-approbation.

---

## Décision

**Aucun agent IA ne peut exécuter une action à impact élevé ou critique sans approbation humaine explicite.**

---

## Règles Permanentes

### RÈGLE-AGENT-001 — Tool Registry obligatoire
Les agents accèdent au système exclusivement via le **Tool Registry PMS** (Edge Functions exposées). Jamais d'accès direct à la base de données.

### RÈGLE-AGENT-002 — Human-in-the-Loop pour impact high/critical
Toute action `impact: 'high' | 'critical'` déclenche obligatoirement une `ApprovalRequest`. Exécution impossible sans validation humaine.

### RÈGLE-AGENT-003 — LLM interdit pour calculs financiers
Les agents ne peuvent jamais calculer des montants, taxes, commissions ou relevés. Ces opérations sont réservées aux fonctions déterministes PostgreSQL (ADR-015). Tentative = blocage + log.

### RÈGLE-AGENT-004 — Messages jamais envoyés automatiquement
Les agents de communication produisent uniquement des **brouillons**. L'envoi est toujours initié par un humain (ADR-012 — RGPD Art. 22).

### RÈGLE-AGENT-005 — Expiration des approbations
- Impact `critical` : 1 heure
- Impact `high` : 24 heures  
- Impact `medium` : 48 heures
- Impact `low` : 7 jours

Une approbation expirée ne peut jamais être réactivée. L'agent doit créer une nouvelle demande.

### RÈGLE-AGENT-006 — Audit trail complet
Chaque action agent génère une entrée `AgentLog` (append-only). Les actions bloquées sont journalisées avec le motif. Les approbations sont archivées avec l'identité de l'approbateur.

---

## Flux d'exécution

```
Agent → Tool Registry → canUserPerform() → ApprovalRequest créé
→ Dashboard notification → Gestionnaire valide
→ W-13 (POST /webhook/agent-action-approved)
→ Edge Function PMS → DB → AuditEvent → AgentLog(success)
```

```
Agent → action interdite → BLOCKED → AgentLog(blocked) — aucune opération DB
```

---

## Catalogue des agents

| Agent | Domaine | Modèle | Autonomie |
|-------|---------|--------|-----------|
| agent-booking | reservation | gpt-4o | Suggest + Approval |
| agent-pricing | calendar | claude-3-sonnet | Suggest + Approval |
| agent-housekeeping | housekeeping | gpt-4o-mini | Suggest + Low Approval |
| agent-communication | communications | gpt-4o | Draft only (ADR-012) |
| agent-maintenance | maintenance | gpt-4o-mini | Suggest + Approval |
| agent-reporting | finance | claude-3-haiku | Read + Draft + Approval |

---

## Conséquences

**Positif :** Zéro risque d'action financière/accès non autorisée · Conformité RGPD Art. 22 · Auditabilité complète · W-13 activable progressivement par domaine.

**Négatif :** Latence d'exécution (attente humaine) · Volume de notifications à monitorer.

**Mitigations :** Contextes d'approbation pré-remplis · Approbations groupées (V1) · Auto-approbation impact `low` configurable par tenant (V2).

---

*Ce document est FROZEN. Toute modification nécessite un nouveau ADR.*
