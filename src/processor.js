/**
 * processor.js — Client-side PDF processing pipeline.
 *
 * Uses pdfjs-dist for PDF rendering and the Canvas API for
 * tinting, rotation, and multiply-blend compositing.
 */

import * as pdfjsLib from "pdfjs-dist";

// Use local worker from node_modules via Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const DARK_THRESHOLD = 180;

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
// Compose a group of 1-3 pages
// ---------------------------------------------------------------------------

function composeGroup(pages, colorsRgb) {
  const basePage = pages[0];
  const width = basePage.width;
  const height = basePage.height;

  // Page 1: tint + multiply onto white
  const tintedBase = tintImage(basePage, colorsRgb[0]);
  let result = multiplyBlend(createWhiteCanvas(width, height), tintedBase);

  // Pages 2-3: tint → rotate 90° CW → scale to region → multiply blend
  const rotatedPages = pages.slice(1);
  const numRotated = rotatedPages.length;

  for (let idx = 0; idx < numRotated; idx++) {
    const color = colorsRgb[idx + 1] || colorsRgb[1];
    const tinted = tintImage(rotatedPages[idx], color);

    // Rotate 90° clockwise
    const rotated = document.createElement("canvas");
    rotated.width = tinted.height;
    rotated.height = tinted.width;
    const rotCtx = rotated.getContext("2d");
    rotCtx.translate(rotated.width, 0);
    rotCtx.rotate(Math.PI / 2);
    rotCtx.drawImage(tinted, 0, 0);

    // Region dimensions
    const regionHeight =
      numRotated > 1 ? Math.floor(height / numRotated) : height;
    const regionTop = numRotated > 1 ? idx * regionHeight : 0;

    // Scale rotated page to fit within the region (preserve aspect ratio)
    const scaleX = width / rotated.width;
    const scaleY = regionHeight / rotated.height;
    const scaleFactor = Math.min(scaleX, scaleY);

    const newW = Math.floor(rotated.width * scaleFactor);
    const newH = Math.floor(rotated.height * scaleFactor);

    const scaled = document.createElement("canvas");
    scaled.width = newW;
    scaled.height = newH;
    const scaleCtx = scaled.getContext("2d");
    scaleCtx.drawImage(rotated, 0, 0, newW, newH);

    // Center within the region
    const offsetX = Math.floor((width - newW) / 2);
    const offsetY = regionTop + Math.floor((regionHeight - newH) / 2);

    // White layer with scaled rotated page pasted on
    const layer = createWhiteCanvas(width, height);
    layer.getContext("2d").drawImage(scaled, offsetX, offsetY);

    // Multiply blend onto result
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
export async function processPdf(pdfBytes, scale = 2.0, colorsHex = null) {
  if (!colorsHex) {
    colorsHex = ["#ED553B", "#3CAEA3", "#173F5F"];
  }

  const colorsRgb = colorsHex.map(hexToRgb);
  const { pages, totalPages } = await renderPdfPages(pdfBytes, scale);

  // Group pages into triplets
  const groups = [];
  for (let i = 0; i < pages.length; i += 3) {
    groups.push(pages.slice(i, i + 3));
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
