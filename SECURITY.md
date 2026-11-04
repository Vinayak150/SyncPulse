# Security policy

## Scope

SyncPulse11 is an educational prototype, **not** an authenticated production sports-data platform.

Security-relevant boundaries include Node HTTP routes, per-browser demo session cookies, the external source adapters, optional user-supplied xAI API access, and the frontend score-reveal gate.

## Reporting a vulnerability

Do not post exploits, credentials, private data or sensitive findings in public GitHub issues.

Use the repository's **Report a vulnerability** feature if GitHub private vulnerability reporting is enabled. Otherwise, contact the repository maintainer privately via their GitHub profile. Provide reproduction steps, the affected commit and the expected vs. actual result. Do not test against other users' sessions without authorization.

There is no guaranteed response time or bug bounty program.

## Known limitations

- The externally sourced Live Match Center hides score updates in its **UI**, but raw provider JSON can still be inspected in the browser developer tools. It is not a network-level confidentiality boundary.
- Anonymous browser demo sessions are ephemeral and rate-limited per session, not linked to authenticated people or resilient against distributed abuse.
- Provider integrations may be undocumented or lack production availability commitments. Upstream usage rights must be independently verified before commercial deployment.
- No live broadcast/OTT clock synchronization, production penetration test, or comprehensive accessibility certification is claimed.
- Avoid configuring organization-wide paid xAI credentials for public anonymous traffic; the app uses user-supplied optional keys.

## Supported versions

Only the current `main` branch receives maintenance. Older commits and forks have no maintenance guarantee.

## Local secret handling

Store optional `CRICAPI_KEY` as a Render environment secret or local environment variable. Never commit it to source, paste it in an issue, or include it in screenshots or logs.
