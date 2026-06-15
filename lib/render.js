import JsBarcode from "jsbarcode";

// ---------------------------------------------------------------------------
// DEFAULT LAYOUT
// Every position/size is a FRACTION (0..1) of the template image dimensions,
// so it scales no matter what resolution your template is. Tune these live
// with the sliders in the app — when they look right, copy the values back
// here to make them the new defaults.
// ---------------------------------------------------------------------------
export const DEFAULT_LAYOUT = {
  amount: {
    enabled: true,
    font: "Bestime",
    color: "#ffffff",
    x: 0.122, // horizontal centre
    y: 0.182, // vertical centre
    size: 0.046, // font size as fraction of image height
    rotation: -90, // degrees (the red strip text runs vertically)
    align: "center",
    prefix: "", // the voucher type sets "MVR " (gift) or nothing (discount)
    stroke: true, // white text + dark outline, like the printed coupon
    strokeColor: "#16243f",
    strokeWidth: 0.19, // outline thickness as fraction of font size
  },
  date: {
    enabled: true,
    font: "Skynight",
    color: "#16243f",
    x: 0.434,
    y: 0.237,
    size: 0.012,
    rotation: 0,
    align: "center",
    prefix: "Valid until ",
    stroke: false,
    strokeColor: "#ffffff",
    strokeWidth: 0.12,
  },
  code: {
    enabled: true,
    font: "Skynight",
    color: "#16243f",
    x: 0.745,
    y: 0.261,
    size: 0.012,
    rotation: 0,
    align: "center",
    prefix: "",
    stroke: false,
    strokeColor: "#ffffff",
    strokeWidth: 0.12,
  },
  barcode: {
    enabled: true,
    x: 0.743, // centre
    y: 0.229, // centre
    width: 0.208, // fraction of image width
    height: 0.04, // fraction of image height
    color: "#16243f",
  },
};

// Centimetre <-> pixel helpers. Physical size only matters at export time:
// a coupon "9 cm wide at 300 DPI" is just an image that is round(9/2.54*300)
// pixels wide. The layout stays fractional, so it lines up at any size.
export const CM_PER_INCH = 2.54;

export function cmToPx(cm, dpi) {
  return Math.max(1, Math.round((cm / CM_PER_INCH) * dpi));
}

// Aspect ratio (width / height) of the loaded template image.
export function imageAspect(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  return h ? w / h : 1;
}

// Load the template image once and reuse it.
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Make sure the custom fonts are actually ready before drawing to canvas,
// otherwise the browser silently falls back to a default font.
export async function ensureFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('64px "Skynight"'),
      document.fonts.load('64px "Bestime"'),
      document.fonts.ready,
    ]);
  } catch (e) {
    // ignore — will fall back to default font
  }
}

function drawText(ctx, W, H, cfg, value) {
  if (!cfg.enabled || !value) return;
  const fontSize = cfg.size * H;
  ctx.save();
  ctx.translate(cfg.x * W, cfg.y * H);
  if (cfg.rotation) ctx.rotate((cfg.rotation * Math.PI) / 180);
  ctx.font = `${fontSize}px "${cfg.font}"`;
  ctx.textAlign = cfg.align || "center";
  ctx.textBaseline = "middle";
  const text = (cfg.prefix || "") + value;
  if (cfg.stroke && (cfg.strokeWidth || 0) > 0) {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = cfg.strokeColor || "#000000";
    ctx.lineWidth = cfg.strokeWidth * fontSize;
    ctx.strokeText(text, 0, 0);
  }
  ctx.fillStyle = cfg.color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawBarcode(ctx, W, H, cfg, code) {
  if (!cfg.enabled || !code) return;
  const tmp = document.createElement("canvas");
  try {
    JsBarcode(tmp, String(code), {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      background: "transparent",
      lineColor: cfg.color || "#16243f",
      width: 2,
      height: 100,
    });
  } catch (e) {
    return; // invalid barcode value — skip rather than crash
  }
  const w = cfg.width * W;
  const h = cfg.height * H;
  ctx.drawImage(tmp, cfg.x * W - w / 2, cfg.y * H - h / 2, w, h);
}

// Draw a single coupon onto the given canvas.
// data   = { amount, date, code }
// opts   = { width, height } target pixel size (optional). When omitted, the
//          template's native pixel size is used (original behaviour). Because
//          every layout value is a fraction of W/H, the coupon lines up no
//          matter what size you render it at.
export function drawCoupon(canvas, img, data, layout, opts = {}) {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  const W = Math.max(1, Math.round(opts.width || natW));
  const H = Math.max(1, Math.round(opts.height || natH));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);

  drawText(ctx, W, H, layout.amount, data.amount);
  drawText(ctx, W, H, layout.date, data.date);
  drawText(ctx, W, H, layout.code, data.code);
  drawBarcode(ctx, W, H, layout.barcode, data.code);
}
