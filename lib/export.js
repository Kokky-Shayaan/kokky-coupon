import { jsPDF } from "jspdf";
import JSZip from "jszip";

function dataUrlToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canvasToPngBlob(canvas) {
  return dataUrlToBlob(canvas.toDataURL("image/png"));
}

// A PDF sized exactly to the coupon image (single page).
export function canvasToPdf(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const pdf = new jsPDF({
    orientation: w >= h ? "landscape" : "portrait",
    unit: "px",
    format: [w, h],
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, h);
  return pdf;
}

export function downloadPng(canvas, filename) {
  triggerDownload(canvasToPngBlob(canvas), filename);
}

export function downloadPdf(canvas, filename) {
  canvasToPdf(canvas).save(filename);
}

// Build a print-ready A4 PDF laying coupons out in a `cols` x `rows` grid per
// page. Each coupon is fitted into its cell preserving aspect ratio and centred.
export function buildA4SheetPdf(items, cols = 1, rows = 3) {
  const A4_W = 210; // mm
  const A4_H = 297; // mm
  const margin = 10; // mm outer margin
  const gap = 6; // mm gap between coupons
  const perPage = cols * rows;
  const cellW = (A4_W - margin * 2 - gap * (cols - 1)) / cols;
  const cellH = (A4_H - margin * 2 - gap * (rows - 1)) / rows;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  items.forEach((it, i) => {
    const slot = i % perPage;
    if (i > 0 && slot === 0) pdf.addPage();
    const col = slot % cols;
    const row = Math.floor(slot / cols);

    const cw = it.canvas.width;
    const ch = it.canvas.height;
    const scale = Math.min(cellW / cw, cellH / ch);
    const w = cw * scale;
    const h = ch * scale;
    const x = margin + col * (cellW + gap) + (cellW - w) / 2;
    const y = margin + row * (cellH + gap) + (cellH - h) / 2;

    pdf.addImage(it.canvas.toDataURL("image/png"), "PNG", x, y, w, h);
  });

  return pdf;
}

// Download an A4 sheet PDF directly (no zip) — used for single-voucher batches.
export function downloadA4Sheet(items, filename, cols = 1, rows = 3) {
  if (!items.length) return;
  buildA4SheetPdf(items, cols, rows).save(filename);
}

// Bulk: array of { canvas, name }. Produces a single zip with every coupon as
// a PNG plus a print-ready A4 sheet PDF using the chosen grid.
export async function downloadBulkZip(items, zipName = "coupons.zip", cols = 1, rows = 3) {
  const zip = new JSZip();

  // de-duplicate file names so repeats don't overwrite each other
  const used = {};
  items.forEach((it) => {
    let nm = it.name;
    if (used[nm] != null) {
      used[nm] += 1;
      nm = `${it.name}-${used[nm]}`;
    } else {
      used[nm] = 0;
    }
    zip.file(`${nm}.png`, canvasToPngBlob(it.canvas));
  });

  if (items.length) {
    const sheet = buildA4SheetPdf(items, cols, rows);
    zip.file("print-sheet-A4.pdf", sheet.output("blob"));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, zipName);
}
