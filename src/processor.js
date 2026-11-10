/**
 * processor.js — Client-side PDF processing pipeline.
 *
 * Uses pdfjs-dist for PDF rendering and the Canvas API for
 * tinting and diagonal-offset multiply-blend compositing.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.min.mjs";

// Use legacy worker (bundles core-js polyfills for Map.prototype.getOrInsertComputed etc.)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const DARK_THRESHOLD = 180;

export const DEFAULT_PAGES_PER_SHEET = 3;

/**
 * Tint palette. Pages beyond the palette length get a nearby colour derived
 * from it (see defaultColorAt), so extra pages stay in the same family.
 */
export const DEFAULT_COLORS = [
  "#FFA57D", // peach
  "#F4A4C0", // pink
  "#A8C6FE", // blue
  "#B1DD8C", // green
  "#B18CFE", // violet
];

/** Default diagonal offset per page, as a percentage of the page. */
export const DEFAULT_OFFSET_PERCENT = 2.7;

// Stack geometry, expressed as a fraction of the sheet dimensions.
// PAGE_INSET is the margin around the outside of the stack.
const PAGE_INSET = 0.035;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h, s, l };
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  const hh = h * 6;

  let rgb;
  if (hh < 1) rgb = [c, x, 0];
  else if (hh < 2) rgb = [x, c, 0];
  else if (hh < 3) rgb = [0, c, x];
  else if (hh < 4) rgb = [0, x, c];
  else if (hh < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const channel = (v) =>
    Math.round(
      Math.min(1, Math.max(0, v + m)) * 255,
    )
      .toString(16)
      .padStart(2, "0");

  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`.toUpperCase();
}

/**
 * Colour for page slot `index`. The first `DEFAULT_COLORS.length` slots use the
 * palette as-is; later slots rotate the hue a little further each cycle and
 * nudge the lightness, so they read as siblings of the base colour rather than
 * as repeats.
 */
export function defaultColorAt(index) {
  const base = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  const cycle = Math.floor(index / DEFAULT_COLORS.length);
  if (cycle === 0) return base;

  const { h, s, l } = rgbToHsl(hexToRgb(base));
  const hue = (h + cycle * 0.05) % 1; // ~18° per cycle
  const lightness = Math.min(0.9, Math.max(0.5, l + (cycle % 2 === 1 ? -0.07 : 0.05)));

  return hslToHex(hue, s, lightness);
}

function createWhiteCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

// ---------------------------------------------------------------------------
// PDF rendering
// ---------------------------------------------------------------------------

async function renderPdfPages(pdfBytes, scale = 2.0) {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas);
  }

  return { pages, totalPages: pdf.numPages };
}

// ---------------------------------------------------------------------------
// Tint: dark pixels → color, light pixels → white
// ---------------------------------------------------------------------------

function tintImage(sourceCanvas, color) {
  const result = document.createElement("canvas");
  result.width = sourceCanvas.width;
  result.height = sourceCanvas.height;
  const ctx = result.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, result.width, result.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Standard luminance (BT.601)
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance < DARK_THRESHOLD) {
      const intensity = 1.0 - luminance / DARK_THRESHOLD;
      data[i] = Math.round(color.r * intensity + 255 * (1 - intensity));
      data[i + 1] = Math.round(color.g * intensity + 255 * (1 - intensity));
      data[i + 2] = Math.round(color.b * intensity + 255 * (1 - intensity));
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return result;
}

// ---------------------------------------------------------------------------
// Compose a group of pages as a diagonally offset stack
// ---------------------------------------------------------------------------

function composeGroup(pages, colorsRgb, offset) {
  const sheetW = pages[0].width;
  const sheetH = pages[0].height;
  const count = pages.length;

  const usableW = sheetW * (1 - 2 * PAGE_INSET);
  const usableH = sheetH * (1 - 2 * PAGE_INSET);

  // Each page sits `offset` (a fraction of the usable area) further right and
  // down than the previous one, and every page shrinks by the total offset so
  // the whole fan fits on the sheet. Pages are floored at one pixel so an
  // extreme offset degrades to a thin fan instead of an invalid canvas.
  const requestedStepX = count > 1 ? offset * usableW : 0;
  const requestedStepY = count > 1 ? offset * usableH : 0;
  const slotW = Math.max(1, usableW - requestedStepX * (count - 1));
  const slotH = Math.max(1, usableH - requestedStepY * (count - 1));

  // Derive the step from the actual slot so the last page stays on the sheet.
  const stepX = count > 1 ? (usableW - slotW) / (count - 1) : 0;
  const stepY = count > 1 ? (usableH - slotH) / (count - 1) : 0;

  const sheet = createWhiteCanvas(sheetW, sheetH);
  const ctx = sheet.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.globalCompositeOperation = "multiply";

  pages.forEach((page, idx) => {
    const tinted = tintImage(page, colorsRgb[idx % colorsRgb.length]);

    // Contain-fit the page in its slot, preserving aspect ratio.
    const fit = Math.min(slotW / tinted.width, slotH / tinted.height);
    const w = Math.round(tinted.width * fit);
    const h = Math.round(tinted.height * fit);

    // Cascade down-right: each page sits lower and further right than the last.
    const x = Math.round(PAGE_INSET * sheetW + idx * stepX + (slotW - w) / 2);
    const y = Math.round(PAGE_INSET * sheetH + idx * stepY + (slotH - h) / 2);

    // White is multiply's identity, so untouched areas keep what is beneath.
    ctx.drawImage(tinted, x, y, w, h);
  });

  ctx.globalCompositeOperation = "source-over";
  return sheet;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full pipeline: PDF bytes → grouped composites + page count.
 */
export async function processPdf(
  pdfBytes,
  scale = 2.0,
  colorsHex = DEFAULT_COLORS,
  pagesPerSheet = DEFAULT_PAGES_PER_SHEET,
  offsetPercent = DEFAULT_OFFSET_PERCENT,
) {
  // A non-positive group size would never advance the grouping loop, and a
  // negative offset would grow pages past the sheet.
  const groupSize = Math.max(1, Math.floor(pagesPerSheet) || 1);
  const offset = Math.max(0, offsetPercent) / 100;

  const colorsRgb = colorsHex.map(hexToRgb);
  const { pages, totalPages } = await renderPdfPages(pdfBytes, scale);

  // Group pages into sheets, last group may be partial
  const groups = [];
  for (let i = 0; i < pages.length; i += groupSize) {
    groups.push(pages.slice(i, i + groupSize));
  }

  // Compose each group
  const composites = groups.map((group) =>
    composeGroup(group, colorsRgb, offset),
  );

  return { composites, totalPages };
}

/**
 * Convert a canvas to a base64 PNG data URL.
 */
export function canvasToDataUrl(canvas) {
  return canvas.toDataURL("image/png");
}
