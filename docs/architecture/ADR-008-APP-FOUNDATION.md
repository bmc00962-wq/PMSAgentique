# ADR-008 — Application Foundation (Architecture Frontend + Service Layer)

**Date**: 2026-08-09
**Status**: ACCEPTED
**Frozen**: YES
**Décidé en**: PROMPT 07

---

## Contexte

Les phases 00–06 ont établi la documentation, les ADRs, le modèle de données, le RBAC, et la stratégie RLS. PROMPT 07 crée la fondation applicative concrète : structure de répertoires, couche service, abstractions, i18n, routing, et composants UI réutilisables.

---

## Décision

**Architecture en couches avec séparation stricte UI / Service / Repository / Supabase.**

---

## Structure de Répertoires (Gelée)

```
src/
├── lib/
│   ├── utils.ts          — cn(), formatDate(), formatCurrency()
│   ├── auth.ts           — canUserPerform() stub + types Permission/Role
│   ├── tenant.ts         — resolveTenantContext() + PLAN_FEATURES
│   ├── i18n.ts           — translations fr/en/ar + t() + isRTL()
│   └── api.ts            — API client stub + getApiHeaders()
├── constants/
│   └── index.ts          — APP_NAME, NAV_GROUPS, MODULE_READINESS, enums
├── types/
│   └── index.ts          — 20+ interfaces TypeScript (BaseEntity → AuditEvent)
├── hooks/
│   ├── useAuth.ts        — Auth state + signOut
│   ├── useI18n.ts        — Language switching + localStorage
│   └── useTenant.ts      — Tenant context resolution
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx  — Sidebar + Header + ErrorBoundary
│   │   ├── Sidebar.tsx    — Navigation 23 modules (groupée par couche)
│   │   └── Header.tsx     — Language switcher + Notifications + User menu
│   ├── features/
│   │   ├── ErrorBoundary.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingSpinner.tsx
│   └── ui/               — shadcn/ui (READ-ONLY)
├── pages/
│   ├── Login.tsx          — Email/Password + OTP (bilingue fr/en/ar + RTL)
│   ├── Dashboard.tsx      — Overview stats + Quick actions + Module status
│   ├── Index.tsx          — Documentation architecture (phases 00–19)
│   └── NotFound.tsx
└── App.tsx                — BrowserRouter + Routes
```

---

## Couche Service (Pattern)

```
UI Component
    ↓ appel
Application Service (hook / action)
    ↓ valide canUserPerform()
Edge Function (Supabase)
    ↓ canUserPerform() → ALLOW
Repository (Supabase query)
    ↓ RLS filtre automatiquement
PostgreSQL
    ↓ succès
AuditEvent créé
    ↓
Résultat retourné
```

**Règle absolue** : Aucun composant React ne fait de décision d'autorisation.

---

## i18n — 3 Langues + RTL

| Langue | Code | Direction | Marché |
|--------|------|-----------|--------|
| Français | `fr` | LTR | Canada (Québec), Maroc |
| English | `en` | LTR | International |
| العربية | `ar` | **RTL** | Maroc, MENA |

- `useI18n()` hook : language switching + localStorage persistence
- `applyLanguageToDOM()` : met à jour `dir` et `lang` sur `<html>`
- Namespaces : `nav` · `common` · `auth` · `status` · `dashboard`
- Ajout de nouveaux namespaces sans modifier les composants existants

---

## Authentification (Flow Complet — Backend requis)

```
User → Login form (email/password ou OTP)
    ↓ supabase.auth.signInWithPassword() / signInWithOtp()
Supabase Auth → JWT émis avec app_metadata:
    { tenant_id, role, membership_id }
    ↓ stocké dans session
useAuth() → session active
    ↓ JWT envoyé dans chaque requête Supabase
resolveTenantContext() → TenantContext résolu depuis JWT
    ↓
Toutes les requêtes Supabase filtrées par RLS (tenant_id = auth.get_tenant_id())
```

---

## Navigation — 23 Modules (4 couches)

| Couche | Modules | Couleur |
|--------|---------|---------|
| Fondation | dashboard · settings | Violet |
| Core | owners · properties · calendar · reservations · channels · guests | Bleu |
| Domaine | housekeeping · maintenance · transport · finance · reports | Émeraude |
| Gouvernance | agents | Orange |

Sidebar : collapsible desktop (260px → 60px) + drawer mobile + `Lock` icon sur modules non implémentés.

---

## Composants UI

| Composant | Usage |
|-----------|-------|
| `AppLayout` | Layout principal avec sidebar + header + ErrorBoundary |
| `Sidebar` | Navigation groupée, collapsible, i18n |
| `Header` | Language switcher + Notifications + User dropdown |
| `LoadingSpinner` | 4 tailles (xs/sm/md/lg) |
| `EmptyState` | Icon + titre + description + action optionnelle |
| `ErrorBoundary` | Class component avec retry |

---

## Stubs (Backend requis)

| Stub | Implémentation prévue |
|------|----------------------|
| `canUserPerform()` | Edge Function Supabase (PROMPT 07 backend) |
| `resolveTenantContext()` | Supabase session JWT (PROMPT 07 backend) |
| `useAuth()` | `supabase.auth.onAuthStateChange()` |
| `api.get/post/patch()` | `supabase.from().select/insert/update()` |
| `supabase.ts` | `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` |

---

## Conventions Gelées

1. **Types** : toutes les entités étendent `BaseEntity` ou `SoftDeleteEntity`
2. **Montants monétaires** : `number` (représentation JS de `NUMERIC(12,4)`)
3. **Dates** : `string` ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
4. **Imports** : toujours `@/` prefix (jamais chemins relatifs profonds)
5. **Composants** : PascalCase, un composant par fichier, max 100 lignes cible
6. **Hooks** : `use` prefix, camelCase
7. **Icons** : lucide-react uniquement, type `React.ComponentType<{ className?: string }>`
8. **Autorisation** : jamais dans un composant React — toujours Edge Function

---

## Conséquences

### Positives
- Séparation claire UI / Service / DB — chaque couche testable indépendamment
- i18n prêt dès le départ — pas de migration future
- RTL supporté dès la fondation (ar)
- Stubs → remplacement progressif par vraie implémentation Supabase
- Module readiness visible dans la sidebar et le dashboard

### Risques / Mitigations
- Stubs retournent toujours `{ allowed: true }` → rappeler que backend requis avant mise en prod
- localStorage non sécurisé pour langue → acceptable (préférence UI uniquement, pas de donnée sensible)

---

## Décision Gelée

**GELÉE**. La structure de répertoires, les patterns de couches, les conventions de types, et le flow d'autorisation UI ne peuvent pas être remis en question sans nouvel ADR.

---

## Documents Associés

- [RBAC.md](../security/RBAC.md) — canUserPerform()
- [RLS.md](../security/RLS.md) — Isolation PostgreSQL
- [DATA_MODEL.md](../database/DATA_MODEL.md) — Types TypeScript alignés
- [TENANCY_MODEL.md](./TENANCY_MODEL.md) — resolveTenantContext()
