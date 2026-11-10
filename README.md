# Cheat Sheet Stacker

A client-side web app that overlays multiple PDF pages into a single composite image using colour tinting, rotation and multiply blending — perfect for creating ultra-dense cheat sheets for exams.

**[Live demo → ttithipan.github.io/cheat-sheet-stacker](https://ttithipan.github.io/cheat-sheet-stacker/)**

## Example

Input → Output: a 3-page PDF becomes a single tri-colour composite page, rendered at 5× quality.

| Raw (3 pages) | Processed (1 page) |
|---|---|
| ![Raw input PDF](sample/raw.png) | ![Processed output PDF](sample/processed.png) |

## How It Works

1. Select a multi-page PDF (lecture notes, study guides, etc.)
2. Pages are grouped into sheets (3 per sheet by default)
3. Each page is tinted with its own colour, then placed on the sheet:
   - **Page 1** — upright, filling the whole sheet
   - **The remaining pages** — rotated 90° clockwise and scaled into equal horizontal bands across the sheet
4. All layers are **multiply-blended** — dark pixels (text) show through in their tinted colour, light pixels (background) become transparent white
5. Download the result as a PDF

Because different colours are used for each page, you can visually separate which text came from which page — all on a single sheet.

## Usage

1. **Select a PDF.** Everything runs in your browser — nothing is uploaded.
2. **Set pages per sheet.** 3 is the default: one upright page plus two rotated bands. There is no upper limit, but each extra page gets a thinner band.
3. **Pick light tint colours.** Multiply blending only darkens, so a pale tint stays readable on its own and turns into a deeper shade where pages overlap. Dark tints multiply into a solid mask.
4. **Raise the quality for print.** Scale 2 is fine on screen; 4–5 is worth it for a document you intend to print.
5. **Save, then print at 100%.** Don't use the printer's "fit to page" option — it rescales the type you carefully sized.

### Preparing the source document

- Use a plain sans-serif face (**Arial/Helvetica**) at **12 pt or larger**.
- Keep margins tight — text that fills the page is exactly what you are compressing.
- Avoid images and oversized headings: where pages overlap they multiply into mush.

## Settings

| Option | Description |
|---|---|
| **Pages per sheet** | How many source pages are stacked onto one output sheet. No upper limit. |
| **Quality (scale)** | PDF render scale. Higher is sharper but slower and uses more memory. |
| **Tint colours** | One colour picker per page in the stack. Pages beyond the five defaults inherit a nearby hue derived from the palette. |

## Tech Stack

- **React 19** + **Vite** — UI framework & build tool
- **Tailwind CSS 4** + **MUI** — styling & components
- **pdfjs-dist** — PDF rendering in the browser
- **Canvas API** — image processing (tint, rotate, multiply blend)
- **jsPDF** — client-side PDF generation for download

Everything runs **100% client-side**. No files are uploaded to any server.

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production (outputs to dist/)
npm run build
```

### Deploying to GitHub Pages

The `vite.config.js` automatically sets the base path to `/cheat-sheet-stacker/` during production builds.

```bash
npm run build
# Deploy the dist/ folder to your gh-pages branch
```

## Project Structure

```
├── public/                Static assets (favicon, icons)
├── sample/                Sample input & output files
│   ├── raw.pdf            3-page input
│   ├── raw.png            page 1 of raw.pdf
│   ├── dense.pdf          5-page full-bleed lorem ipsum input (near-zero margins)
│   ├── processed.png      1-page composite, rendered at 5× quality
│   └── processed.pdf      the same composite as a PDF
├── src/
│   ├── App.jsx            Main app layout & state
│   ├── main.jsx           React entry point
│   ├── processor.js       PDF rendering, tinting & compositing logic
│   ├── index.css          Global styles & Tailwind
│   └── components/
│       ├── PreviewCanvas.jsx   Canvas display & empty state
│       ├── Sidebar.jsx         Settings, nav, privacy
│       └── TopRibbon.jsx       Burger menu & title bar
├── index.html             HTML entry point
├── vite.config.js         Vite build configuration
├── package.json           Dependencies & scripts
└── README.md
```

## License

GNU GPLv3 © 2026
