# SyncPulse11 | Dream11 FDE submission

## Submission note (maximum 200 words)

**SyncPulse11: A Spoiler-Safe Sports Companion**

Fans watching live sport on delayed OTT streams often see a goal, wicket or match result on their phones before the moment appears on screen. They also lose context after interruptions.

I built SyncPulse11 to give fans control over when a score update becomes visible. Its **Live Match Center** reads external Bundesliga football and ATP/WTA tennis scoreboards, buffers changed snapshots privately, and lets the fan reveal them one at a time. Evidence-grounded catch-up explanations describe only scores already revealed, without inventing events. Other sports show their actual data coverage rather than fake live scores.

A separate interactive cricket **Demo Lab** proves the underlying idea at delivery level, with SyncShield cursor isolation, PulseBrief, Captain's Call, ad-break catch-up and a tactical prediction model. Its training results and match replays are explicitly labeled synthetic.

**AI tools used:** Gemini, DeepSeek and AI coding assistants supported design, implementation and testing. The demo includes an illustrative trained probability model and optional xAI Grok rewriting with a user-provided key. Default live summaries are deterministic, source-grounded explanations.

## Two-minute reviewer walkthrough

| Time | Action | What it proves |
| --- | --- | --- |
| 0–20 seconds | Open Live Match Center; highlight verified provider source, status and freshness | Real-world fan context |
| 20–45 seconds | Select a real ATP/WTA match; show the hidden score | Live-source integration with safe default |
| 45–65 seconds | Reveal a buffered provider snapshot; explain FIFO updates and source-grounded recap | Spoiler-safe second-screen design |
| 65–90 seconds | Switch to Demo & Learning Lab; show stadium ahead of viewer and PulseBrief lagging safely | Event-level noninterference |
| 90–110 seconds | Show Fan Focus bookmark/catch-up and Captain's Call gating | Useful fan interaction |
| 110–120 seconds | Show the System Proof graph and mention limits | Engineering ownership, honesty |

**Important qualifications:** The Live Center provides externally sourced *scores*, not video. Automatic synchronization with an OTT stream requires trusted player timestamps or provider event IDs. OpenLigaDB is a documented football source; ESPN tennis JSON is an unofficial best-effort endpoint. The cricket match simulation and its model-validation figures are synthetic. Badminton's free source offers limited schedule discovery, and cricket requires an authorized provider key for external results.

**Submission URLs:** https://syncpulse11.onrender.com and https://github.com/Vinayak150/SyncPulse.
