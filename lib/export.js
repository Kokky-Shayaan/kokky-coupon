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

// Build a print-ready A4 PDF with `rows` coupons stacked per page (3-up).
// Each coupon is fitted into its cell preserving aspect ratio and centred.
export function buildA4SheetPdf(items, rows = 3) {
  const A4_W = 210; // mm
  const A4_H = 297; // mm
  const margin = 10; // mm outer margin
  const gap = 8; // mm gap between coupons
  const cellW = A4_W - margin * 2;
  const cellH = (A4_H - margin * 2 - gap * (rows - 1)) / rows;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  items.forEach((it, i) => {
    const slot = i % rows;
    if (i > 0 && slot === 0) pdf.addPage();

    const cw = it.canvas.width;
    const ch = it.canvas.height;
    const scale = Math.min(cellW / cw, cellH / ch);
    const w = cw * scale;
    const h = ch * scale;
    const x = margin + (cellW - w) / 2;
    const y = margin + slot * (cellH + gap) + (cellH - h) / 2;

    pdf.addImage(it.canvas.toDataURL("image/png"), "PNG", x, y, w, h);
  });

  return pdf;
}

// Bulk: array of { canvas, name }. Produces a single zip with every coupon as
// a PNG plus a print-ready A4 sheet PDF (3 coupons per page).
export async function downloadBulkZip(items, zipName = "coupons.zip", rowsPerPage = 3) {
  const zip = new JSZip();

  items.forEach((it) => {
    zip.file(`${it.name}.png`, canvasToPngBlob(it.canvas));
  });

  if (items.length) {
    const sheet = buildA4SheetPdf(items, rowsPerPage);
    zip.file("print-sheet-A4.pdf", sheet.output("blob"));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, zipName);
}
