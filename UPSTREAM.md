# Upstream Maintenance

This document records how DeepPoint tracks vendored third-party crawler code.
It exists so future sync work is reviewable, repeatable, and license-aware.
The authoritative vendored-code inventory is maintained in `VENDORED.md`.

## Vendored Component

| Field | Value |
| --- | --- |
| Component | MediaCrawler Douyin crawler subset |
| Upstream repository | https://github.com/NanmiCoder/MediaCrawler |
| Local path | `lib/crawlers/douyin_new/` |
| Upstream license | NON-COMMERCIAL LEARNING LICENSE 1.1 |
| Local license boundary | Excluded from the root MIT license grant; see `NOTICE.md` |
| DeepPoint import commit | `2d857cea81202924b901e845ce30d55e224d0062` (`2026-01-10`) |
| Recorded upstream baseline | Unknown; no upstream commit SHA was recorded when the code was imported |
| Last upstream check | `2026-07-03` |
| Upstream `main` at last check | `076dcba978b102bb12ff69ba226d1d39158481e5` |
| Vendored inventory | `VENDORED.md` |

The local import commit is not a substitute for an upstream baseline SHA. The
exact original upstream import SHA was not recorded, so current sync work uses
the reviewed upstream SHA above as the comparison point and records accepted or
skipped commits in this document. If a future path-level diff reconstructs the
original import SHA, update both this file and `VENDORED.md`.

## Path Mapping

| Local path | Upstream path |
| --- | --- |
| `lib/crawlers/douyin_new/crawler/` | `media_platform/douyin/` |
| `lib/crawlers/douyin_new/tools/` | `tools/` |
| `lib/crawlers/douyin_new/store/` | `store/douyin/` and shared `store/` helpers |
| `lib/crawlers/douyin_new/proxy/` | `proxy/` |
| `lib/crawlers/douyin_new/cache/` | `cache/` |
| `lib/crawlers/douyin_new/config/` | `config/` |
| `lib/crawlers/douyin_new/model/m_douyin.py` | `model/m_douyin.py` |
| `lib/crawlers/douyin_new/cmd_arg/` | `cmd_arg/` |
| `lib/crawlers/douyin_new/libs/` | Upstream browser/signature assets used by the Douyin crawler |
| `lib/crawlers/douyin_new/main.py` | Local integration entrypoint plus upstream crawler startup logic |

DeepPoint-specific integration lives outside the vendored subtree, especially in
`lib/services/douyin-new-service.ts`, where Next.js starts the Python crawler and
reads CSV output. That integration layer anonymizes New Douyin authors and
comment usernames before returning API/export data.

For the full vendored inventory, local adaptation list, privacy boundary, and
license boundary, see `VENDORED.md`.

## Current Upstream Delta

The following upstream changes happened after the DeepPoint import and should be
reviewed before any crawler behavior changes:

| Upstream commit | Date | Why it matters |
| --- | --- | --- |
| `9311d21` | `2026-05-19` | Fixes Douyin creator handling. |
| `0c5f281` | `2026-04-21` | Restricts reused-browser cookies to platform domains, reducing oversized or cross-domain cookie leakage. |
| `125e02a` | `2026-03-17` | Adds an HTTP client factory and opt-in SSL verification disable flag across platforms, including Douyin. |
| `5294b6d` | `2026-04-15` | Adds support for connecting to an existing Chrome instance through CDP. |
| `8e93438` | `2026-05-29` | Keeps proxy/API limit overrides bounded and opt-in. |
| `51d4853` | `2026-07-01` | Relaxes Python dependencies for Python 3.13 compatibility. |
| `9f4f8bf` | `2026-07-01` | Removes personal profile collection and anonymizes creator data in the teaching edition. |

The latest upstream commit at the last check (`076dcba`) is WebUI-focused and is
not directly relevant to the local vendored Douyin crawler, but it confirms the
upstream project is active.

## Synced Douyin Changes

The following upstream changes have been ported into the local Douyin subset:

| Local sync | Upstream basis | Status |
| --- | --- | --- |
| Cookie domain filtering | `0c5f281` and current `media_platform/douyin` cookie URL handling | Ported by limiting browser cookie reads to Douyin-related domains. |
| HTTPX SSL client factory | `125e02a` and current `tools/httpx_util.py` | Ported through local `tools/httpx_util.py` and `DISABLE_SSL_VERIFY=False` default. |
| Existing-browser CDP connection | `5294b6d` and current `tools/cdp_browser.py` | Ported as opt-in `CDP_CONNECT_EXISTING=False` to preserve DeepPoint's current launch behavior. |
| Privacy anonymization | `9f4f8bf` and current `store/douyin/__init__.py` | Ported by hashing raw user IDs, masking nicknames, blanking avatar/IP fields, and skipping creator profile persistence. |

Skipped or intentionally deferred:

- Full upstream file replacement, because DeepPoint carries local process,
  storage, and integration changes.
- Broad dependency lower-bound changes that do not affect the local copied code.
- WebUI and non-Douyin platform changes.

## Sync Policy

Keep sync PRs small and purpose-driven:

1. Create a branch named `codex/sync-mediacrawler-YYYYMMDD` from `main`.
2. Compare only the mapped paths, not the entire upstream repository.
3. Group changes by behavior: stability fixes, dependency updates, privacy or
   license changes, storage/schema changes, and platform support changes.
4. Cherry-pick or port changes manually. Do not replace
   `lib/crawlers/douyin_new/` wholesale unless the PR explicitly explains why.
5. Preserve DeepPoint's TypeScript integration contract:
   `DouyinNewService` starts the crawler, reads CSV files, maps rows into
   `DataSourceVideo` and `DataSourceComment`, and returns `DeepCrawlResult`.
6. Update `requirements.txt` only when the synced code needs it.
7. Update `VENDORED.md` when path mappings, local adaptations, privacy policy,
   or license boundaries change.
8. Update this document with the new upstream baseline, reviewed commits, and
   skipped commits.

Do not sync unrelated upstream platforms, WebUI code, database backends, or broad
framework changes unless a DeepPoint feature explicitly needs them.

## Validation Gates

Every upstream sync PR should run:

```bash
npm run check
python -m compileall lib/crawlers/douyin_new
```

When credentials and a browser session are available, also run a small live
Douyin smoke test with one keyword, a low video limit, and comments disabled
first. Live crawler checks are intentionally separate from CI because they depend
on external platform behavior and login state.

## Compliance Notes

- Keep upstream copyright and repository headers in vendored files.
- Keep `NOTICE.md` accurate whenever vendored scope changes.
- Keep `VENDORED.md` accurate whenever path mappings or local adaptations
  change.
- Do not describe `lib/crawlers/douyin_new/` as MIT-licensed.
- Treat upstream privacy-oriented changes as high priority because DeepPoint
  stores and exports raw crawler data.
- Preserve application-layer author and comment username anonymization unless a
  future PR explicitly introduces a stronger privacy model.
