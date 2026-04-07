# Sketch Party v1.0.0

## What’s in this build
- MV3 Chrome extension with friend-gated effects, receiving toggle/mute, and Pro upsell.
- Auth callback page to capture accountId/email/plan and Patreon success/fail.
- Background worker handles analytics batching, rate limits (free vs pro), inbox polling, and paywall/login redirects.
- Popup UI: quick send sheet, pending requests, block, mute, login, Connect Patreon CTA, Pro perks card.
- Content script: confetti, fireworks burst, pulse overlay.

## How to load
1) `npm install` (once)  
2) `npm run build`  
3) Chrome → `chrome://extensions` → Developer Mode → Load unpacked → select `dist/`

## Packaging
- Zip: `SketchParty-Production-v1.0.0.zip` (built from current `dist/`)

## Notes
- Analytics endpoint: `https://harika-extensions-backend.notetaker-app-burak.workers.dev/api/analytics/events/batch`
- Payment CTA routes to hub payment page with required params (source, appId, clientId, accountId, email).
- Friend/backend send/inbox paths are stubbed to `/api/sketch-party/effects/send` and `/inbox`; adjust if backend differs.
