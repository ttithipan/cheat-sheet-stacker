/**
 * processor.js — Client-side PDF processing pipeline.
 *
 * Uses pdfjs-dist for PDF rendering and the Canvas API for
 * tinting, rotation and multiply-blend compositing.
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
// Multiply blend
// ---------------------------------------------------------------------------

function multiplyBlend(baseCanvas, overlayCanvas) {
  const result = document.createElement("canvas");
  result.width = baseCanvas.width;
  result.height = baseCanvas.height;
  const ctx = result.getContext("2d");

  ctx.drawImage(baseCanvas, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(overlayCanvas, 0, 0);

  return result;
}

// ---------------------------------------------------------------------------
// Compose a group: page 1 upright, the rest rotated 90° into horizontal bands
// ---------------------------------------------------------------------------

function composeGroup(pages, colorsRgb) {
  const basePage = pages[0];
  const width = basePage.width;
  const height = basePage.height;

  // Page 1: tint and multiply onto white, filling the sheet.
  const tintedBase = tintImage(basePage, colorsRgb[0]);
  let result = multiplyBlend(createWhiteCanvas(width, height), tintedBase);

  const rotatedPages = pages.slice(1);
  const numRotated = rotatedPages.length;

  for (let idx = 0; idx < numRotated; idx++) {
    const color = colorsRgb[(idx + 1) % colorsRgb.length];
    const tinted = tintImage(rotatedPages[idx], color);

    // Rotate 90° clockwise so a portrait page becomes landscape.
    const rotated = document.createElement("canvas");
    rotated.width = tinted.height;
    rotated.height = tinted.width;
    const rotCtx = rotated.getContext("2d");
    rotCtx.translate(rotated.width, 0);
    rotCtx.rotate(Math.PI / 2);
    rotCtx.drawImage(tinted, 0, 0);

    // Each rotated page gets an equal horizontal band of the sheet.
    const regionHeight = Math.floor(height / numRotated);
    const regionTop = idx * regionHeight;

    // Scale to fit the band, preserving aspect ratio.
    const scaleFactor = Math.min(
      width / rotated.width,
      regionHeight / rotated.height,
    );
    const newW = Math.floor(rotated.width * scaleFactor);
    const newH = Math.floor(rotated.height * scaleFactor);

    const scaled = document.createElement("canvas");
    scaled.width = newW;
    scaled.height = newH;
    scaled.getContext("2d").drawImage(rotated, 0, 0, newW, newH);

    // Centre it horizontally, and vertically within its band.
    const offsetX = Math.floor((width - newW) / 2);
    const offsetY = regionTop + Math.floor((regionHeight - newH) / 2);

    const layer = createWhiteCanvas(width, height);
    layer.getContext("2d").drawImage(scaled, offsetX, offsetY);

    result = multiplyBlend(result, layer);
  }

  return result;
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
) {
  // A non-positive group size would never advance the grouping loop.
  const groupSize = Math.max(1, Math.floor(pagesPerSheet) || 1);

  const colorsRgb = colorsHex.map(hexToRgb);
  const { pages, totalPages } = await renderPdfPages(pdfBytes, scale);

  // Group pages into sheets, last group may be partial
  const groups = [];
  for (let i = 0; i < pages.length; i += groupSize) {
    groups.push(pages.slice(i, i + groupSize));
  }

  // Compose each group
  const composites = groups.map((group) => composeGroup(group, colorsRgb));

  return { composites, totalPages };
}

/**
 * Convert a canvas to a base64 PNG data URL.
 */
export function canvasToDataUrl(canvas) {
  return canvas.toDataURL("image/png");
}
