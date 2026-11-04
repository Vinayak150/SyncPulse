# SyncPulse11 V5.5 | Dream11 FDE submission

## Submission note (under 200 words)

**SyncPulse11: Spoiler-Safe AI Cricket Co-Pilot**

Cricket fans following a match on delayed OTT streams often receive score updates before they see the ball. They also lose context after ads or interruptions.

I built SyncPulse11 to solve these problems. It separates incoming match events from the last delivery the viewer has watched, keeping unrevealed outcomes out of scoreboards, commentary, model estimates, and prediction results. Fans can catch up through evidence-grounded briefings in Analyst, Hinglish, or Silent mode, bookmark watched deliveries in Fan Focus, review an ad-break recap, share spoiler-safe receipts, and participate in spoiler-gated Captain's Call challenges.

The application includes an interactive event replay, seeded simulations, model-driven cricket explanations, a tactical network visualization, and a browser-session-isolated telemetry demo. Its win-probability model is trained and evaluated on **synthetic simulated chases** and is labeled accordingly. The included match scenarios are demonstrations rather than verified live feeds.

**AI tools used:** Gemini, DeepSeek, and AI coding assistants helped develop and test the application. Runtime explanations use a deterministic grounded engine, with optional xAI Grok rewriting when a user provides their own API key.

## Two-minute demo

| Time | Reviewer action | Product proof |
| --- | --- | --- |
| 0–20 sec | Open the Death-Over Chase demo and point to the visible viewer cursor | Clear fan problem |
| 20–50 sec | Advance stadium events while viewer is delayed; inspect scoreboard and AI brief | Spoiler isolation |
| 50–75 sec | Open Fan Focus, bookmark a watched ball, advance the viewer, refresh recap and copy a safe receipt | Spoiler-safe ad-break recovery |
| 75–100 sec | Lock Captain's Call; reveal the delivery and resolve it | Fan interaction |
| 100–120 sec | Open optional system proof and brief quant/network view | Engineering depth |

**Data disclosure:** The featured IND vs NZ match is a scripted illustrative replay. Simulated probability calibration metrics must not be represented as real-match validation. FNV-1a digests are non-cryptographic equality checks; prefix-equivalence testing is the noninterference evidence.

**Pre-submit checklist:** Public homepage and health 200; SSE, scorer and reset usable from an isolated browser; private paths 404; offline fallback works; mobile layout readable; source URL and demo URL accessible.
