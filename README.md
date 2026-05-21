# PGSH Frontend

**Plateforme de Gestion des Stages Hospitaliers**

React 19 · TypeScript · Mantine 8 · RTK Query · Keycloak · Vite 7

## Quick start

```bash
# Full stack via Aspire (recommended)
dotnet run --project ../PGSH.AppHost

# Frontend only
npm install
npm run dev
```

## Environment

Copy `.env.example` → `.env`. All Keycloak vars are required.
The API URL is not needed — Vite proxies `/api` → backend automatically via Aspire.

## Docs

| File | Purpose |
|---|---|
| `CLAUDE.md` | AI coding guidance — stack, patterns, conventions |
| `DESIGN.md` | Design system — colors, typography, spacing, components |
| `API.md` | Backend API contract with TypeScript types |
| `ARCHITECTURE.md` | Structural decisions — state, auth, routing |
| `PHASES.md` | Development roadmap |
| `design_images/` | Visual reference screenshots (source of truth for UI) |
