# Sketch Party v1.0.1

## What’s in this build
- Party-themed popup palette, switch-style receive toggle, friend-first onboarding, and Google sign-in CTA.
- Login required for sending/adding/accepting; Pro surfaces hidden until a friend is added.
- Preview button to show effects locally before sending.
- Auth callback still captures accountId/email/plan and Patreon success/fail.
- Background worker: analytics batching, rate limits (free vs pro), inbox polling, paywall/login redirects.
- Content script: confetti, fireworks burst, pulse overlay.

## How to load
1) `npm install` (once)  
2) `npm run build`  
3) Chrome → `chrome://extensions` → Developer Mode → Load unpacked → select `dist/`

## Packaging
- Zip: `SketchParty-Production-v1.0.1.zip` (built from current `dist/`)

## Notes
- Analytics endpoint: `https://harika-extensions-backend.notetaker-app-burak.workers.dev/api/analytics/events/batch`
- Payment CTA routes to hub payment page with required params (source, appId, clientId, accountId, email).
- Friend/backend send/inbox paths are stubbed to `/api/sketch-party/effects/send` and `/inbox`; adjust if backend differs.
