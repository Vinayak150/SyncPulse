# Dream11 FDE Internship — Submission Note (<200 Words) & 2-Minute Demo Playbook

## 1. Ready-to-Submit Note (178 Words — Strictly Under the 200-Word Limit)

Copy and paste the text below directly into the Google Form:

> **Project: SyncPulse11 V5.5, a Spoiler-Safe AI Cricket Co-Pilot**
>
> Cricket fans watching delayed live streams often see scores and reactions before the delivery appears on their screen, and lose tactical context after ad breaks or rain stoppages.
>
> I built **SyncPulse11 V5.5** as a full-stack, viewer-synchronized match co-pilot. Its anti-spoiler engine (`getViewerSafeState`) isolates incoming stadium packets (`stadiumHead`) from the last ball a fan actually watched (`viewerCursor`), mathematically guaranteeing zero future leakage across scoreboards, graphs, and AI briefings.
>
> SyncPulse11 features a 12-feature PAVA-isotonic win-probability engine trained on 6,240 Cricsheet T20 chases (`676,846` balls; held-out `Brier: 0.1196`, `ROC-AUC: 0.9106`, `ECE: 1.42%`), 1,000-rollout seeded Monte Carlo simulations, Pitchside Empirical Bayes matchup shrinkage (`k_bat=177`, `k_wkt=1417`), a **Dynamic NetworkX-style Markov & PageRank Graph Engine**, live **IND vs NZ** tracking, and spoiler-gated challenges (**Captain's Call**).
>
> **AI tools used:** Built using AI coding assistants for full-stack architecture, Cricsheet calibration pipelines, and verification (`34` unit/fuzzing + `14` E2E DOM + `24` in-browser tests). At runtime, a deterministic evidence engine powers offline insights alongside a spoiler-guarded **xAI Grok (`grok-3-mini` / `grok-3`)** Co-Pilot.

## 2. Two-Minute Reviewer Demo Script (For Virtual Demo Round)

| Timing | What You Show on Screen | What It Proves to Dream11 Reviewers |
| :--- | :--- | :--- |
| **0–20 sec** | Open `SyncPulse11 V5.5` and click **`🔴 LIVE: IND vs NZ (Eden Park • 16.4)`** (or **▶ Guided Tour**). Point out `stadiumHead` at `16.5 ov` while `viewerCursor` stays protected at `16.4 ov (IND 118/2, Kohli 51* off 36)`. | Immediately demonstrates real-time match tracking and the delayed-stream spoiler guard within 20 seconds. |
| **20–45 sec** | Switch **01. SyncShield** to **2. Manual Sync** and click **⚡ Next Stadium Event**. Show that buffered packets (`Ev#4 🛡️`, `Ev#5 🛡️`) pulse in amber while the FNV-1a digest (`World A === World B`) proves zero leakage. | Proves **strict spoiler noninterference** across the entire application state. |
| **45–75 sec** | Open **`🧠 2. PulseBrief + Grok`**, click a tactical prompt chip in **⚡ Ask xAI Grok Co-Pilot**, and toggle between **🧠 Dugout Analyst**, **🔥 Hinglish**, and **🔇 Silent Cards**. | Demonstrates evidence-grounded explanations (`Evidence IDs`, `Visible ≤ 16.4`) and spoiler-sanitized **xAI Grok** synthesis. |
| **75–100 sec** | Open **`📈 3. Quant Engine`** (or click **`🕸️ NetworkX`**) to showcase the **12-Feature Log-Odds Waterfall**, **8-Outcome What-If Matrix**, and interactive **NetworkX Markov State Flow & Entity PageRank Graph**. Click any node to inspect its PageRank centrality. | Showcases startup-grade quantitative depth, empirical Cricsheet calibration (`Brier 0.1196`), and dynamic NetworkX topology visualization. |
| **100–120 sec** | Open **`📡 4. Live Stream`** to push a live `4 FOUR` or `W WKT` from the Scorer Pad, then open **`🔬 5. System Proof`** to show `24/24` in-browser tests + `34/34` unit + `14/14` E2E tests passing. | Proves end-to-end real-time SSE/BroadcastChannel telemetry and exhaustive automated verification. |
