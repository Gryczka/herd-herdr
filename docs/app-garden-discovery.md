# Herd Herdr discovery and deployment readiness

Assets-only Worker `herd-herdr`.
Canonical homepage: `https://herd-herdr.dwarven.workers.dev/`.

Added a useful public HTML description of the twelve open lessons, keyboard/touch controls, browser-local progress and Static Assets hosting. Resource anchors include garden referral parameters while retaining the dashboard's original `to` parameter. Real robots and XML sitemap keep the public game discoverable; Content Signals request `search=yes,ai-input=yes,ai-train=no`.

There is no Worker handler, backend gate, session, new secret, binding or migration. No request/storage/inference budget is introduced because the demo serves assets and runs locally in the visitor's browser. Existing keyboard, touch, audio and reduced-motion behavior is preserved.

```sh
npm run check
npm run deploy
```

`check` includes lint, tests and a dry-run build. Its formatting lifecycle rewrites files; review the diff before a later deployment. Content Signals are voluntary crawler guidance, not access control.
