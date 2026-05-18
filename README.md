# inspecext

Local-first Chrome extension for production-grade web data extraction and CSV export.

## Scope
Implements core architecture and functional baseline for:
- page mapping
- table/grid/list detection
- API-aware dataset capture (network observer)
- CSV export (visible/loaded)
- sensitive field warnings
- popup + in-page controls
- per-site settings

## Tech
- Manifest V3
- Vanilla TypeScript-compatible JS modules
- No backend (local storage only)

## Run
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked → `inspecext/`

## Status
Initial production-grade functional foundation committed. Next steps are listed in `docs/ROADMAP.md`.
