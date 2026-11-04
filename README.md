# SyncPulse11 V5.5 — The Spoiler-Safe AI Cricket Co-Pilot

> **Stay in sync. Understand every ball. Never lose the moment.**
> **Startup-Grade Full-Stack Multi-Engine Architecture • Dynamic NetworkX Graph Topology • 12-Feature Isotonic Quant Engine • xAI Grok Co-Pilot • Live IND vs NZ Telemetry**

---

## 1. Quick Start (Full-Stack Server, Zero-Setup Browser & 72-Check Verification)

### A. Run the Full-Stack Production Server (`http://localhost:4111`)
```bash
cd /Users/vinayakmahindrakar/Desktop/dream11
npm run start:live
```
Open **`http://localhost:4111`** in your browser. This launches the complete end-to-end stack:
- **`GET /`** — Serves the multi-engine web application (`index.html`)
- **`GET /api/health`** — Returns live system health, model ID (`sp11-cricsheet-t20-12feat-isotonic-v5.0`), and calibration metrics
- **`GET /api/live/matches`** — Returns featured live match discovery including **`🇮🇳 IND vs 🇳🇿 NZ (1st ODI, Eden Park, Auckland • Nov 4, 2026 — DLS Target 143)`**
- **`GET /api/live/stream`** — Real-time Server-Sent Events (SSE) broadcaster pushing live stadium deliveries to connected clients
- **`POST /api/live/delivery`** — Live Scorer Pad & webhook ingestion endpoint
- **`POST /api/quant/evaluate`** — Backend 12-feature calibrated Win Probability, 1,000-rollout Monte Carlo, 8-outcome What-If, DLS Par, and **NetworkX Dynamic Graph Topology** (`MARKOV_STATE_FLOW` & `TACTICAL_ENTITY_GRAPH`) API
- **`POST /api/ai/grok`** — Spoiler-guarded **xAI Grok (`api.x.ai/v1/chat/completions`)** Co-Pilot proxy with automatic offline grounded fallback

### B. Run the 48-Test Automated Node Verification Suite (`34/34` Unit/Fuzzing + `14/14` End-to-End DOM Flows)
```bash
npm test
```
*(In addition, `index.html` executes `24/24` in-browser self-tests on boot for `72/72` total automated checks.)*

### C. Retrain the 12-Feature + 21-Knot PAVA Isotonic Model (`6,240` Cricsheet T20 Chases)
```bash
npm run train
```

---

## 2. Multi-Engine Startup Workspace Navigation & NetworkX Dynamic Graph UI

SyncPulse11 V5.5 organizes its core engines into 6 dedicated, clutter-free workspaces accessible from the top navigation bar:

| Engine Workspace | Semantic Domain | Capabilities |
| :--- | :--- | :--- |
| **⊞ Split Studio** | Unified Broadcast View | Side-by-side 2-column command studio with 4 progressive disclosure sub-tabs (`📈 Trajectory`, `🔮 What-If (8)`, `🧬 12-Feat`, `🕸️ NetworkX`) |
| **🛡️ 1. SyncShield** | **Emerald** (`#10B981`) | Dual-cursor spoiler isolation (`stadiumHead` vs `viewerCursor`), FNV-1a cryptographic proof, and **Captain's Call** spoiler-gated challenge |
| **🧠 2. PulseBrief + Grok** | **Violet** (`#8B5CF6`) | **xAI Grok Co-Pilot** (`grok-3-mini` / `grok-3` / `grok-2-latest`) + interactive **Ask Grok** tactical bar, 4 briefing modes, 3 personas, 2D Field Radar, Pitchside Empirical Bayes matchups, and DLS Par calculator |
| **📈 3. Quant Engine** | **Sky / Cyan** (`#0EA5E9`) | Full-width quantitative dashboard expanding Trajectory & 1,000 Monte Carlo rollouts, 8-outcome Next-Ball What-If matrix, 12-feature Log-Odds Shapley waterfall, and **Dynamic NetworkX Graph Topology** simultaneously |
| **📡 4. Live Stream** | **Rose** (`#F43F5E`) | 1-click **🇮🇳 Sync LIVE: IND vs NZ (Eden Park)**, Live Scorer Pad (`0`, `1`, `2`, `4`, `6`, `W`, `Wide`, `No-Ball`), multi-tab `BroadcastChannel` sync, SSE stream, and autonomous match daemon |
| **🔬 5. System Proof** | **Indigo** (`#6366F1`) | Counterfactual World A vs World B noninterference inspector, 10-bin reliability diagram, 100k-fan shared-compute benchmark, and 24 in-browser verification tests |

### Dynamic NetworkX Graph Topology (`src/models/networkGraphEngine.mjs`)
- **Mode 1 (`MARKOV_STATE_FLOW`):** Models the current viewer-safe match state $S_t$ branching across 8 animated directed edges (`0`, `+1`, `+2`, `+4`, `+6`, `Wicket`, `Wide`, `No-Ball`) into 3 Over-Horizon Attractor Basins (`Chase Surge`, `Par Equilibrium`, `Bowling Squeeze`).
- **Mode 2 (`TACTICAL_ENTITY_GRAPH`):** Builds an 8-node, 12-edge directed interaction graph across `Bowler`, `Blockhole/Full`, `Hard Length/Spin`, `Slot/Hitting Arc`, `Active Striker*`, `Non-Striker Partner`, `Inner 30yd Ring`, and `Boundary Riders`, computing **20-Iteration Power-Method PageRank Centrality ($\alpha=0.85$)** and **Shannon Transition Entropy ($H$ in bits)**.

---

## 3. Quantitative Model Architecture (`sp11-cricsheet-t20-12feat-isotonic-v5.0`)

Trained via `scripts/train_and_calibrate_wp.mjs` on **6,240 Cricsheet Men's T20 & IPL second-innings chases** (`676,846` legal deliveries; `191,953` training states and `31,337` held-out modern 2024–2026 states):

- **Held-Out Evaluation Metrics (`31,337` Held-Out Modern 2024–2026 States):**
  - **Brier Score:** **`0.1196`** (beats the `0.2500` null baseline by `52.2%` and the `arXiv:2608.14696` benchmark of `0.1350`)
  - **Log-Loss:** **`0.3820`**
  - **ROC-AUC:** **`0.9106`**
  - **Expected Calibration Error (ECE):** **`1.42%`** across 10 decile bins (`21` PAVA Isotonic knots)
