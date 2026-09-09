# ADR-001 — Architecture Modular Monolith

**Date**: 2026-08-09  
**Status**: ACCEPTED  
**Frozen**: YES  
**Décidé en**: PROMPT 02  

---

## Contexte

Le PMS SaaS Agentique doit gérer 23 domaines métier distincts (auth, tenant, owner, property, calendar, reservation, channel, guest, communications, operations, housekeeping, inspection, transport, maintenance, inventory, access, payments, finance, reporting, approvals, agents, audit, saas-admin).

Deux architectures candidates ont été évaluées :
1. **Microservices** : chaque domaine est un service déployé indépendamment
2. **Modular Monolith** : tous les domaines dans un seul déploiement, avec des frontières strictes

---

## Décision

**Architecture retenue : Modular Monolith**

Le système est déployé comme un seul artefact, mais organisé en modules strictement séparés avec des frontières de domaine explicites, des interfaces claires et aucun couplage implicite entre modules.

---

## Justification

### Pourquoi pas les Microservices maintenant ?

| Problème Microservices | Impact |
|------------------------|--------|
| Complexité opérationnelle | Élevée — nécessite orchestration, service mesh, observabilité distribuée |
| Latence réseau | Chaque appel inter-module devient un appel HTTP |
| Cohérence distribuée | Transactions distribuées complexes (ex: réservation + calendrier) |
| Coût d'infrastructure | Élevé en early stage |
| Équipe requise | DevOps dédié nécessaire |
| Time to market | Significativement plus long |

### Pourquoi le Modular Monolith ?

| Avantage | Détail |
|----------|--------|
| Frontières de domaine claires | Chaque module a ses propres repositories, services, types |
| Refactoring vers microservices possible | Les interfaces sont déjà définies — extraction = déploiement séparé |
| Performance | Appels in-process, pas de latence réseau inter-modules |
| Transactions | Transactions PostgreSQL ACID cross-domaine possibles |
| Complexité réduite | Une seule base de déploiement, une seule base de données |
| Adapté au stade | MVP + V1 — équipe réduite, itérations rapides |

---

## Règles d'implémentation

1. **Aucun import direct** entre modules — toujours passer par les interfaces exposées
2. **Aucune table partagée** entre modules sans interface explicite
3. **Événements pour la communication asynchrone** — pas d'appel direct
4. **Repository par module** — isolation de la couche données
5. **Interfaces documentées** — chaque module documente son API interne

### Structure de module type

```
src/modules/[nom]/
├── types.ts           # Types et interfaces du module
├── repository.ts      # Accès données (Supabase)
├── service.ts         # Logique métier
├── events.ts          # Événements émis/reçus
└── index.ts           # API publique du module (ce qui est exposé)
```

---

## Conséquences

### Positives
- Développement rapide en MVP
- Frontières claires qui facilitent la collaboration
- Migration future vers microservices non bloquée
- Tests unitaires par module facilités

### Négatives / Risques
- Discipline requise pour maintenir les frontières (pas de compilation enforcement)
- Base de données unique = point de contention potentiel à très grande échelle
- Monitoring plus complexe si on ne structure pas les logs par module

---

## Conditions de révision

Cette décision peut être révisée si :
- > 50 propriétés par tenant (scaling vertical PostgreSQL insuffisant)
- Besoin de déploiement indépendant d'un module critique (ex: agents)
- Équipe > 10 développeurs avec ownership de domaines distincts

---

## Décision gelée

Cette décision est **GELÉE**. Toute modification nécessite :
1. Création d'un nouveau ADR (ADR-XXX)
2. Justification documentée
3. Plan de migration
