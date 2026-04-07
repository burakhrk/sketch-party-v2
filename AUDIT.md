# Sketch Party v2 — initial audit (2026-04-07)

## Repository state
- Repo was empty; added Vite + React + `@crxjs/vite-plugin` scaffold for MV3.
- Basic popup, background, and content-script entrypoints exist; no product logic yet.

## Known requirements to wire
- Analytics: batch POST to `https://harika-extensions-backend.notetaker-app-burak.workers.dev/api/analytics/events/batch` with `appId=sketch-party`, `clientId`, `accountId`, `email`, `source=chrome-extension`, `timestamp`, and event names: install, login, open, create session, send effect, open paywall, open checkout, connect patreon success/fail.
- Auth: handoff to hub website login (Supabase / Google). Capture accountId/email when available, store locally, include in analytics.
- Payments: all upgrade CTAs must route to hub payment page first (not direct Patreon). Payment URL format with `source`, `appId`, `clientId`, `accountId`, `email`. Patreon checkout link provided for handoff.
- UI copy: short, premium tone with primary CTA “Connect Patreon”; paywall/promo surfaces needed.
- Effects/product: create session flow + at least one “send effect” action; ensure analytics hooks fire.
- Build + distribution: `npm run build` should emit `dist/` for “Load unpacked”; create versioned zip for Web Store (e.g., `SketchParty-Production-v1.0.0.zip`). Keep permissions minimal.

## Decisions & assumptions
- Using React + Vite + CRX. MV3 service worker will host analytics queue; storage + alarms + identity + tabs permissions kept minimal; host permissions limited to backend + hub domains.
- Will generate/stash `clientId` in `chrome.storage`; account data optional and updated after login/payment handoff callbacks.
- Plan to keep secrets out of repo; any API keys must come from env-prefixed vars if introduced.

## Next steps
1) Implement analytics queue + install/open hooks in background and wire popup to enqueue events.  
2) Add auth/payment UI: login handoff, paywall, Patreon redirect with required query params, handle success/fail callbacks.  
3) Build product surface: quick session starter and a visual “effect” (e.g., confetti overlay) plus content-script to render it.  
4) Polish UI/copy, then build dist + versioned zip and push milestones.
