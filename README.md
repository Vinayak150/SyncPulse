# SyncPulse11 V5.5 | Spoiler-Safe AI Cricket Co-Pilot

> Stay in sync. Understand every ball. Never lose the moment.

**Dream11 Forward Deployed Engineer internship artifact.** Live cricket viewers watching a delayed OTT stream can see outcomes spoiled by second-screen scoreboards and alerts. SyncPulse11's viewer cursor reveals only the events the fan has watched, while the incoming match-event cursor can continue to advance.

## 60-second product tour

1. Open the app and start the **Death-Over Chase** demo.
2. Use **Manual Sync** to stay behind a stadium delivery. The shield keeps the scoreboard, analysis, AI briefs, and predictions on the visible prefix.
3. Use **PulseBrief** to catch up in Analyst, Hinglish or Silent mode.
4. Lock **Captain's Call** before revealing its target ball; the result remains pending until the fan catches up.
5. Open **Fan Focus** to bookmark a delivery, simulate a 45-second ad break, get an evidence-limited catch-up recap, read it aloud on demand, or copy a spoiler-safe receipt. The module was adapted from the second independent DeepSeek SyncPulse11 prototype's ad-break, audio and receipt ideas.
6. Explore the optional Quant, Network Graph, and System Proof workspaces.

All included match scenarios are **illustrative, scripted or simulated**. IND vs NZ is a **demo replay**, not a connected real-time feed. The scorer pad and autonomous broadcaster generate **simulated** deliveries; they are not an official live data supplier.

## Run locally

Requires Node.js 20+.

```bash
npm test
npm run start:live
```

Open `http://localhost:4111` or set `PORT` to change the port. Core features work without external API keys. Note: the page loads Tailwind and font resources from CDNs when online, although its core deterministic engines do not require a paid AI API.

## Model provenance and limitations

The win-probability model has 12 engineered features, calibrated on a **synthetic T20 match simulator**. `scripts/train_and_calibrate_wp.mjs` generates 6,240 chases with seeded, manually specified phase/wicket transition probabilities. It **does not train on the bundled Cricsheet archive**. Reported Brier 0.1196, AUC 0.9106 and ECE 1.42% evaluate a *simulated held-out set* from this simulator; they are **not historical IPL out-of-sample scores**. They should not be compared to real-world research benchmarks. The Cricsheet data archive is excluded from Git. Simulations and model outputs are illustrative, not betting advice.

The deterministic offline briefing engine creates structured evidence-backed text; it is not a generative LLM. The Grok endpoint can optionally rewrite the viewer-visible briefing when a visitor explicitly supplies their own xAI API key. The server does not use global paid-provider keys for anonymous visitors. No paid model is required for the submission demonstration. DLS estimates and field diagrams are educational approximations, not official match technology. The NetworkX-style SVG visual is a hand-implemented graph, not a claim of Python NetworkX runtime dependency.

## Architecture

```text
Curated/simulated event input
   -> cricket state transition + event log
   -> viewer cursor projection (strict visible prefix)
   -> win-probability, Monte Carlo, graphs and explanations
   -> fan UI + spoiler-gated interactions

Node HTTP server -> session-specific scorer + SSE feed
                 -> per-session rate limits and restricted static assets
```

- `index.html`: self-contained browser UX and offline demo.
- `src/engine/cricketStateEngine.mjs`: match state, legal deliveries, striker changes and spoiler-safe projections.
- `src/models/winProbAndMonteCarlo.mjs`: estimated chase probabilities and seeded simulation.
- `src/models/networkGraphEngine.mjs`: Markov and tactical-entity visualization models.
- `src/ai/pulseBriefEngine.mjs`: evidence-grounded briefing.
- `src/features/fanFocus.mjs`: independent Fan Focus ad-break recovery, viewer-visible recap, opt-in speech and share receipt. A pure viewer-state bridge prevents hidden stadium events from entering its data flow.
- `src/server/liveTelemetryServer.mjs`: HTTP, isolated demo sessions, scorer, SSE, optional xAI proxy.
- `tests/`: unit, DOM and HTTP-security verification.

The public server only serves allowlisted frontend assets (including the Fan Focus module), not `.git`, raw archives or source files outside the allowlist. Demo SSE and match mutation state are isolated per browser session using an HttpOnly cookie. Sessions are ephemeral; they can reset after instance restart or Render free-plan sleep. Rate limits are basic per-session controls, not a substitute for authentication, distributed abuse prevention or production persistence.

## Tests

```bash
npm test
npm run test:unit
npm run test:e2e
node tests/security_http_verify.mjs
node tests/fan_focus_verify.mjs
node tests/fan_focus_dom_verify.mjs
```

The test suite includes 34 unit/property checks, 14 scripted DOM user flows, 21 HTTP security assertions, 16 Fan Focus noninterference/logic assertions, and 16 Fan Focus UI control-flow assertions (101 distinct automated checks). The DOM harness runs 24 embedded browser-like self-tests, but it is **not a substitute for real Chrome/Safari/mobile acceptance testing**.

## Deployment

`render.yaml` deploys a Node web service (free plan, `npm test` build, `npm run start:live` start), with GitHub auto-deploy. Render free instances may sleep during inactivity and lose process-local demo state. First hit after sleep may take longer than a normal page request. Keep `XAI_API_KEY` unset. For long-term production use, add durable match storage, proper authenticating operators, trusted event ingestion, horizontal coordination, and comprehensive provider-based real-world model evaluation.

Endpoints: `GET /`, `GET /api/health`, `GET /api/live/matches`, `GET /api/live/stream`, `GET /api/live/state`, `POST /api/live/delivery`, `POST /api/live/autostream`, `POST /api/live/reset`, `POST /api/quant/evaluate`, and `POST /api/ai/grok`.

## Submission

See `SUBMISSION_NOTE_AND_DEMO_SCRIPT.md` for a short (under 200 words) note and a spoiler-safe, two-minute reviewer walkthrough. For independently executed browser tests, security findings, and honest limitations see `ENGINEERING_AUDIT.md`. The app has no Dream11 affiliation and no official sports data feed.
