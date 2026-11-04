# SyncPulse11 V6.0 | Spoiler-Safe Sports Companion

> Follow the match. Protect the moment. Reveal on your own terms.

**Dream11 Forward Deployed Engineer internship artifact.** Fans watching OTT sports streams are frequently several seconds or deliveries behind score providers. Traditional companion scoreboards can expose match-changing moments before the viewer sees them. SyncPulse11 buffers updates behind a user-controlled viewer cursor and provides context only after the user explicitly reveals a score snapshot.

**Working demo:** https://syncpulse11-fde-demo.onrender.com
**Source:** https://github.com/Vinayak150/SyncPulse

## Two separate experiences

### 1. Live Match Center (default landing page)

This experience fetches **actual external scoreboard records**, with honest status and source metadata. It is **not a live video stream**, and it never displays cricket's synthetic scenarios as external live results.

| Sport | Source | Current coverage | Limits |
| --- | --- | --- | --- |
| Football | [OpenLigaDB](https://api.openligadb.de/index.html) | Bundesliga fixtures, final scores and reported goals | No-key documented API; competition coverage is limited |
| Tennis | [ESPN ATP/WTA scoreboards](https://www.espn.com/tennis/) | Provider-reported ATP/WTA competitions, set scores, statuses | Public but **unofficial/undocumented** JSON endpoint; no reliability or redistribution guarantee |
| Badminton | [TheSportsDB public v1](https://www.thesportsdb.com/documentation) | Partial free fixture discovery only | Free tier does **not** provide a verified real-time point-by-point feed |
| Cricket | [CricAPI](https://www.cricapi.com/) | Provider-backed match summaries **only if an authorized `CRICAPI_KEY` is set** | No real feed without credentials, and summaries are not ball-by-ball event synchronization |

**Live Match Center flow:** follow the clearly marked **three-step flow**: choose a sport -> select a fixture (both score and result status remain hidden) -> reveal **one oldest buffered snapshot at a time** when ready -> receive a factual, evidence-limited summary of score differences. The app checks for new source snapshots every 45 seconds and shares a 40-second server cache across visitors. It buffers a maximum of 40 changed score snapshots; overflow is explicitly disclosed. Scheduled matches display no invented 0-0 scores. Unavailable or stale sources remain labeled as such, with no artificial fallback.

**Honest synchronization limitation:** Without the actual OTT/player playback timestamp or a verified delivery/point ID feed, the app **cannot automatically infer when the viewer has seen an event**. SyncShield therefore implements manual disclosure of provider snapshots rather than asserting automatic video-perfect alignment. No unseen provider scores are rendered in the fixture list, visible scoreboard, or contextual insights. Browser network developer tools can still inspect returned JSON; preventing that would require a trusted server-side per-viewer buffer with authenticated playback synchronization.

### 2. Demo & Learning Lab (`/#demo`)

The original, fully preserved cricket engine includes curated death-over chase, scripted IND vs NZ replay, autonomous **simulated** scorer, detailed event-source projector, SyncShield's ball-by-ball cursor, PulseBrief, Fan Focus, Captain's Call, Monte Carlo, illustrative win probability, tactical graphs and system proof. This mode is a tutorial for how a future licensed ball-by-ball source could integrate with the event engine. Its events are **not real live match events**.

The demo's 12-feature probability model was trained and calibrated on **synthetically generated T20 chases**, using `scripts/train_and_calibrate_wp.mjs`; it does *not* ingest the bundled Cricsheet dataset. The model artifact's Brier 0.1196, AUC 0.9106 and ECE 1.42% are synthetic hold-out evaluation metrics, **not independent IPL historical out-of-sample validation**. DLS and tactical calculations are educational approximations, not official cricket systems. NetworkX-style SVG topology is hand-implemented JavaScript, not the Python NetworkX runtime.

## Run locally

Requires Node.js 20+.

```bash
npm test
npm run start:live
```

Open http://localhost:4111 for Live Match Center or http://localhost:4111/#demo for the cricket learning lab. Live Match Center requires internet access to upstream sports providers. The cricket demo's deterministic engines work without a paid model API, though Tailwind and web fonts load over public CDNs.

**Optional authorized cricket connector:** create an account with the upstream provider, verify the API's permitted use, then set `CRICAPI_KEY` as a Render environment secret or a local shell environment variable. Never paste API keys into the browser, GitHub, README or ChatGPT. Without the key, cricket displays a precise `CONFIG_REQUIRED` status.

**Optional Grok:** A user may explicitly provide their own xAI key for optional grounded rewriting in the Demo Lab. No organization-wide paid key is used for anonymous website traffic. The default briefing engine is deterministic, evidence-grounded synthesis, **not an LLM call**.

## Architecture and trust boundaries

```text
EXTERNAL SCORE PROVIDERS
  OpenLigaDB / ESPN Tennis / TheSportsDB / optional CricAPI
       -> server-side adapter (type-safe normalization + strict sports allowlist)
       -> bounded request timeout / 40s shared cache / concurrent fetch de-duplication
       -> GET /api/sports/matches?sport=...
       -> client-private FIFO score snapshot buffer
       -> explicit viewer reveal cursor -> factual snapshot-difference insight

CRICKET DEMO (INDEPENDENT)
  curated/synthetic delivery -> pure cricket event transition
       -> viewer-safe visible prefix -> win probability / Monte Carlo / brief / graph
       -> spoiler-gated Captain's Call + Fan Focus
       -> per-session Node scorer + SSE demonstration feed
```

The two products share the navigation shell but **not the score data or core event models**. New modules are `src/live/providerHub.mjs`, `src/live/liveCenter.mjs`, and `src/live/liveCenter.css`. The existing engine lives under `src/engine/`, `src/models/`, `src/ai/`, and `src/features/`.

The backend denies access to `.git`, raw archives and internal server source. The demo scorer uses per-browser HttpOnly session cookies and same-origin mutations. Rate limits and session isolation are demo controls, not a substitute for authentication, a persistent event store or production abuse prevention. External feeds and provider response time are outside this project's control. Source-specific licenses and provider terms must be reviewed before commercial use.

## Verification

```bash
npm test
node tests/live_center_verify.mjs
node tests/public_smoke_verify.mjs
```

Optional repeatable real-browser acceptance, requiring Playwright and an installed Chromium/Chrome browser:

```bash
# In a second terminal with the local server already running:
# npm install --no-save playwright  # only if Playwright is not installed
TEST_BASE_URL=http://localhost:4111 npm run test:browser
```

The browser release check intercepts one tennis provider response using **explicitly mocked test fixtures**, so its result verifies the spoiler and reveal behavior, not real-world tennis scores.

The default tests cover cricket invariants, original VM DOM flows, HTTP security, Fan Focus, source normalization, concurrency, cache behavior and FIFO spoiler isolation. See `ENGINEERING_AUDIT.md` for the exact counts and limitations, and `SUBMISSION_NOTE_AND_DEMO_SCRIPT.md` for the assignment's under-200-word submission note.

## Deployment and operating limits

`render.yaml` specifies a Node Web Service with `npm test` on build, `npm run start:live` for runtime and GitHub auto-deployment. Render's free plan can sleep when idle, lose its ephemeral process-local demo sessions and require a cold start. Source discovery is independent of the synthetic demo session; data provider outages display real error/stale states rather than invented updates.

The public API surface includes `GET /api/health`, `GET /api/sports/matches?sport=football|tennis|badminton|cricket`, the existing demo SSE/scorer routes, and the demo Grok/quant evaluation endpoints.

The app is a non-affiliated educational engineering artifact; no sports provider, tournament, Dream11 or broadcaster sponsors its external scores.
