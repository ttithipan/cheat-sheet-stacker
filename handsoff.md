# Handsoff — Cheat Sheet Compressor

<!-- updated 2026-06-15 -->

Status tracking document. Records tasks, progress, blockers, and attempted solutions across sessions.

---

## Tasks

- [ ] Add loading progress indicator for multi-page PDFs
- [ ] Support drag-and-drop PDF selection

---

## Currently Doing

- (none)

---

## Bugs Fixed

- [x] `getOrInsertComputed is not a function` crash — switched pdfjs-dist from modern build to legacy build (which bundles core-js polyfills for Map.prototype.getOrInsertComputed, a TC39 proposal only natively available in Chrome 136+ / Firefox 144+ / Safari 18.4+)

---

## Completed

- [x] Port all PDF processing from Python backend to client-side JS (pdfjs-dist + Canvas API)
- [x] Remove backend directory (main.py, processor.py, requirements.txt)
- [x] Remove watermark ("shoveitin.me/stacker")
- [x] Remove Terms of Service modal and Privacy Policy page
- [x] Flatten project structure (move everything out of frontend/)
- [x] Create README.md and .gitignore
- [x] Remove file size limit
- [x] Add Save PDF button (saves all composite pages as multi-page PDF via jsPDF)
- [x] Move all buttons (Select PDF, Save PDF, navigation) from topbar to sidebar
- [x] Make topbar minimal: burger menu + title only
- [x] Merge Privacy/Disclaimer into settings sidebar, delete LeftSidebar component
- [x] Fix sidebar clipping under topbar on mobile (top offset)
- [x] Align sidebar margins with canvas container on mobile and desktop
- [x] Match sidebar height to canvas height on all screen sizes
- [x] Fix PDF canvas overflow on narrow screens (max-width + margin auto centering)
- [x] Add Android bottom safe area padding (pb-8)
- [x] Remove animated gradient border, use glass-panel styling consistently
- [x] Canvas maintains aspect ratio and fills available space
- [x] Replace "Upload" with "Select" throughout UI
- [x] Clean up UI: reduce text, remove page count chip, remove footer

---

## Attempted and Failed

- CDN worker URL for pdfjs-dist (`cdnjs.cloudflare.com`) — failed to fetch. Fixed by using `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` for local Vite resolution.
- `canvas-border-glow` animated gradient border — removed per user request, replaced with `glass-panel` for consistency.

---

## Might Work (Not Tried Yet)

- Use `OffscreenCanvas` + Web Worker for PDF processing to avoid blocking the main thread on large PDFs
- Lazy-load pdfjs-dist only when a file is selected to improve initial page load
- Cache processed results in IndexedDB for re-processing with different color settings without re-rendering
