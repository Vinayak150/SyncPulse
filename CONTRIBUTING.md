# Contributing to SyncPulse11

Thank you for helping improve SyncPulse11. It is a small, dependency-light engineering demonstration. Prioritize fan trust, reproducible behavior, and accessibility over more dashboards or speculative predictions.

## Before opening a pull request

1. Open an issue describing the user problem, expected behavior, and how it will be tested. For security reports, use [SECURITY.md](SECURITY.md) rather than a public issue.
2. Fork the repository and branch from `main`. Make one focused change per pull request.
3. Use Node.js 20 or later and run `npm test`. All 136 existing regression assertions should pass.
4. For frontend or accessibility changes, run the optional real-browser check described in the README. Add an appropriate deterministic test for changed behavior.
5. Describe how the change affects score disclosure, viewer cursor handling, source reliability, and user experience. Include screenshots only when the UI actually changed.

## Project conventions

- **Never mix external provider match data with synthetic cricket demo data.**
- **Never leak an unseen match result through status, color, text, timestamps, recommendations, or event metadata.** The live interface buffers provider snapshots and reveals them manually.
- Write source-grounded descriptions. Do not fabricate goals, rallies, deliveries, tournaments, data provenance, or model accuracy.
- Keep provider API credentials out of the repository, browser state, logs and examples.
- Use established Node ESM conventions. Avoid adding runtime dependencies to features that can be implemented with standard APIs.
- Keep external endpoints allowlisted, time-bounded, and resilient to partial or unavailable results.
- Preserve the event-sourced cricket Demo Lab and the spoiler noninterference invariants.
- Avoid breaking keyboard support, reduced-motion preferences, mobile layouts, or screen-reader descriptions.

## Testing

```bash
npm test
npm run start:live
```

To run optional browser tests, install Playwright in your own development environment, start the server, then run `TEST_BASE_URL=http://localhost:4111 npm run test:browser`. The browser contract test mocks a tennis fixture and is not evidence of an actual live match.

## Review and merging

Pull requests should explain the root cause, show test evidence, and avoid needless refactors. Maintainers may request revisions. Passing checks are necessary but do not guarantee that a patch will be merged. No response-time or review SLA is promised.
