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
    font: "Skynight",
    color: "#ffffff",
    x: 0.095, // horizontal centre
    y: 0.5, // vertical centre
    size: 0.17, // font size as fraction of image height
    rotation: -90, // degrees (the red strip text runs vertically)
    align: "center",
    prefix: "", // the voucher type sets "MVR " (gift) or nothing (discount)
    stroke: true, // white text + dark outline, like the printed coupon
    strokeColor: "#16243f",
    strokeWidth: 0.12, // outline thickness as fraction of font size
  },
  date: {
    enabled: true,
    font: "Bestime",
    color: "#16243f",
    x: 0.43,
    y: 0.64,
    size: 0.05,
    rotation: 0,
    align: "center",
    prefix: "Valid until ",
    stroke: false,
    strokeColor: "#ffffff",
    strokeWidth: 0.12,
  },
  code: {
    enabled: true,
    font: "Bestime",
    color: "#16243f",
    x: 0.725,
    y: 0.72,
    size: 0.046,
    rotation: 0,
    align: "center",
    prefix: "",
    stroke: false,
    strokeColor: "#ffffff",
    strokeWidth: 0.12,
  },
  barcode: {
    enabled: true,
    x: 0.74, // centre
    y: 0.6, // centre
    width: 0.21, // fraction of image width
    height: 0.12, // fraction of image height
    color: "#16243f",
  },
};

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
// data = { amount, date, code }
export function drawCoupon(canvas, img, data, layout) {
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;
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
