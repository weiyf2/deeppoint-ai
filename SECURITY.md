# Security Policy

## Supported Versions

DeepPoint is pre-1.0. Security fixes target the default branch first.

## Reporting a Vulnerability

Please do not disclose exploitable details in public issues.

Use GitHub's private vulnerability reporting or create a minimal public issue
that asks for a private disclosure channel without including proof-of-concept
details.

Include the affected version or commit, reproduction scope, impact, and any safe
mitigation you have already tested.

## Dependency and Upstream Risk

This project combines a Next.js application with Python crawler integrations.
Dependency alerts for npm, pip, and GitHub Actions are tracked through
Dependabot.

The crawler code under `lib/crawlers/douyin_new/` is adapted from MediaCrawler
and has separate non-commercial license boundaries. Upstream crawler sync notes
and validation gates are documented in `UPSTREAM.md`.

Crawler runtime data is ignored by Git, but local CSV/browser-session files may
still contain raw platform data. Treat `lib/crawlers/douyin_new/data/` and
`lib/crawlers/douyin_new/browser_data/` as sensitive local runtime state.
