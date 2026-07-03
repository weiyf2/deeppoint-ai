# Vendored Code Inventory

This document defines the maintenance boundary for third-party code vendored
into DeepPoint. It complements `NOTICE.md`, which records license attribution,
and `UPSTREAM.md`, which records the sync process.

## MediaCrawler Douyin Subset

| Field | Value |
| --- | --- |
| Component | MediaCrawler Douyin crawler subset |
| Upstream repository | `https://github.com/NanmiCoder/MediaCrawler` |
| Local root | `lib/crawlers/douyin_new/` |
| Current reviewed upstream SHA | `076dcba978b102bb12ff69ba226d1d39158481e5` |
| Review date | `2026-07-03` |
| Original import SHA | Not recorded at import time |
| Local import commit | `2d857cea81202924b901e845ce30d55e224d0062` |
| Upstream license | NON-COMMERCIAL LEARNING LICENSE 1.1 |
| Local license boundary | Not covered by DeepPoint's root MIT license grant |

The exact upstream commit used for the original import was not preserved. Until
that baseline is reconstructed by path-level diffing, sync work should compare
the local mapped files against the current reviewed upstream SHA above and
record each accepted or skipped upstream change in `UPSTREAM.md`.

## Path Mapping

| Local path | Upstream path | Notes |
| --- | --- | --- |
| `lib/crawlers/douyin_new/base/` | `base/` | Shared crawler interfaces used by the local Douyin runner. |
| `lib/crawlers/douyin_new/cache/` | `cache/` | Local memory cache only; Redis remains out of scope. |
| `lib/crawlers/douyin_new/cmd_arg/` | `cmd_arg/` | Trimmed CLI surface used by DeepPoint's service process. |
| `lib/crawlers/douyin_new/config/` | `config/` and `media_platform/douyin/` defaults | Local defaults cap crawler scope and enable CDP integration. |
| `lib/crawlers/douyin_new/crawler/` | `media_platform/douyin/` | Main Douyin platform implementation. |
| `lib/crawlers/douyin_new/libs/` | `libs/` and platform signing assets | Browser/signature assets required by the Douyin crawler. |
| `lib/crawlers/douyin_new/model/m_douyin.py` | `model/m_douyin.py` | Douyin URL model helpers. |
| `lib/crawlers/douyin_new/proxy/` | `proxy/` | Upstream proxy interfaces with DeepPoint limits. |
| `lib/crawlers/douyin_new/store/` | `store/` and `store/douyin/` | CSV/JSON/Excel persistence adapted for service ingestion. |
| `lib/crawlers/douyin_new/tools/` | `tools/` | Browser, CDP, cookie, HTTP, and utility helpers. |
| `lib/crawlers/douyin_new/main.py` | Upstream crawler bootstrap plus local runner glue | DeepPoint entrypoint for the Python subprocess. |

DeepPoint integration outside the vendored root lives mainly in
`lib/services/douyin-new-service.ts`, which starts the Python subprocess,
parses CSV output, limits returned records, and maps crawler rows into
application-level data contracts.

## Local Adaptations

The vendored tree is not a byte-for-byte copy. Known DeepPoint-specific changes
include:

- A smaller command-line surface for keyword search, comments, headless mode,
  and CSV output.
- Local process bootstrap and cleanup in `main.py` so Next.js can run the
  crawler as a child process.
- Conservative defaults for note count, comment count, concurrency, and media
  download behavior.
- CSV/JSON/Excel store support tuned for the service reader under
  `lib/services/douyin-new-service.ts`.
- CDP browser helpers that support using an existing local Chrome/Edge session.
- Application-layer anonymization of author and comment labels before data is
  returned to the product UI or exports.

Any future sync PR must update this list when it adds, removes, or materially
changes a local adaptation.

## Privacy Boundary

The vendored crawler can observe direct user/profile fields such as `nickname`,
`avatar`, and `ip_location`. DeepPoint's product layer should not expose those
raw identity fields unless a PR explicitly documents why the field is required,
how it is minimized, and how exports handle it.

Current policy:

- Keep raw crawler output confined to local crawler output files.
- Do not return raw `nickname`, `avatar`, or `ip_location` from
  `DouyinNewService` API-facing mappings.
- Prefer deterministic pseudonyms for grouping authors/comments when identity
  labels are needed for analysis.
- Treat upstream privacy-removal commits as high-priority sync candidates.

## License Boundary

`lib/crawlers/douyin_new/` remains governed by MediaCrawler's
NON-COMMERCIAL LEARNING LICENSE 1.1. DeepPoint's root `LICENSE` applies to
first-party project code, but it does not relicense this vendored subtree.

When vendored scope changes:

1. Update this file.
2. Update `NOTICE.md` if the license boundary or vendored paths changed.
3. Update `UPSTREAM.md` with the upstream commits reviewed and the validation
   performed.
4. Keep upstream copyright and repository headers in vendored files.
