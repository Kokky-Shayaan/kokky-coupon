"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  DEFAULT_LAYOUT,
  loadImage,
  ensureFonts,
  drawCoupon,
} from "@/lib/render";
import { downloadPng, downloadPdf, downloadBulkZip } from "@/lib/export";

// Template files in /public. Discount falls back to the gift template if a
// dedicated /public/template-discount.png isn't present.
const TEMPLATES = {
  gift: "/template.png",
  discount: "/template-discount.png",
};

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso; // not ISO — show whatever was typed
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Map arbitrary spreadsheet columns onto our amount/date/code fields.
function normalizeRows(rows) {
  return rows.map((r) => {
    const out = {};
    for (const k of Object.keys(r)) {
      const key = k.trim().toLowerCase();
      const val = r[k];
      if (/code/.test(key)) out.code = val;
      else if (/amount|value|mvr|discount/.test(key)) out.amount = val;
      else if (/date|valid/.test(key)) out.date = val;
    }
    // A single-column "list of codes" file: use that column as the code.
    if (out.code === undefined) {
      const vals = Object.values(r);
      if (vals.length === 1) out.code = vals[0];
    }
    return out;
  });
}

export default function Page() {
  const [tab, setTab] = useState("single");
  const [voucherType, setVoucherType] = useState("gift"); // "gift" | "discount"
  const [img, setImg] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);

  // single-coupon fields
  const [amount, setAmount] = useState("500");
  const [dateIso, setDateIso] = useState("2026-07-25");
  const [code, setCode] = useState("0444-E436-4304");

  // bulk
  const [csvText, setCsvText] = useState(
    "amount,date,code\n500,2026-07-25,0444-E436-4304\n250,2026-08-01,0445-A111-2222"
  );
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  const [zoom, setZoom] = useState(1);

  const previewRef = useRef(null);
  const workRef = useRef(null); // hidden full-res canvas for export

  // How the strip value reads, based on voucher type.
  function amountDisplay(raw) {
    const v = (raw ?? "").toString().trim();
    if (!v) return "";
    return voucherType === "gift" ? `MVR ${v}` : v; // discount: free text like "20% OFF"
  }

  // Load template (per voucher type) + fonts.
  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureFonts();
      const primary = TEMPLATES[voucherType] || TEMPLATES.gift;
      try {
        const image = await loadImage(primary);
        if (alive) {
          setImg(image);
          setImgError(false);
        }
      } catch {
        // discount template missing → fall back to the gift template
        if (voucherType === "discount") {
          try {
            const fb = await loadImage(TEMPLATES.gift);
            if (alive) {
              setImg(fb);
              setImgError(false);
            }
            return;
          } catch {}
        }
        if (alive) setImgError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [voucherType]);

  const singleData = useMemo(
    () => ({ amount: amountDisplay(amount), date: formatDate(dateIso), code }),
    [amount, dateIso, code, voucherType]
  );

  // Preview mirrors the first bulk row so you see what the batch produces.
  const previewData = useMemo(() => {
    if (tab !== "bulk") return singleData;
    try {
      const parsed = Papa.parse(csvText.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      const r = parsed.data[0];
      if (r) {
        return {
          amount: amountDisplay((r.amount ?? "").toString().trim() || amount),
          date: formatDate((r.date ?? "").toString().trim() || dateIso),
          code: (r.code ?? "").toString().trim(),
        };
      }
    } catch {}
    return { amount: "", date: "", code: "" };
  }, [tab, singleData, csvText, voucherType, amount, dateIso]);

  // Redraw preview whenever anything changes
  useEffect(() => {
    if (!img || !previewRef.current) return;
    drawCoupon(previewRef.current, img, previewData, layout);
  }, [img, previewData, layout]);

  function updateField(field, key, value) {
    setLayout((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  }

  function renderToWork(data) {
    if (!img) return null;
    drawCoupon(workRef.current, img, data, layout);
    return workRef.current;
  }

  function handlePng() {
    if (renderToWork(singleData)) downloadPng(workRef.current, `coupon-${code || "kokky"}.png`);
  }
  function handlePdf() {
    if (renderToWork(singleData)) downloadPdf(workRef.current, `coupon-${code || "kokky"}.pdf`);
  }

  async function handleBulk() {
    if (!img) return;
    setBulkBusy(true);
    setBulkMsg("");
    try {
      const parsed = Papa.parse(csvText.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      const rows = parsed.data;
      if (!rows.length) {
        setBulkMsg("No rows found. Need at least a 'code' column.");
        setBulkBusy(false);
        return;
      }
      await ensureFonts();
      const items = [];
      rows.forEach((r, i) => {
        const data = {
          amount: amountDisplay((r.amount ?? "").toString().trim() || amount),
          date: formatDate((r.date ?? "").toString().trim() || dateIso),
          code: (r.code ?? "").toString().trim(),
        };
        const c = document.createElement("canvas");
        drawCoupon(c, img, data, layout);
        items.push({ canvas: c, name: data.code || `coupon-${i + 1}` });
      });
      await downloadBulkZip(items, "kokky-coupons.zip", 3);
      setBulkMsg(
        `Generated ${items.length} coupon(s): individual PNGs + a 3-up A4 print sheet. Check your downloads.`
      );
    } catch (e) {
      setBulkMsg("Error: " + e.message);
    }
    setBulkBusy(false);
  }

  // Handles both CSV and Excel uploads. Excel is converted to CSV text so it
  // flows through the same pipeline and stays editable in the box.
  function onBulkFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const name = f.name.toLowerCase();
    const reader = new FileReader();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      reader.onload = () => {
        try {
          const wb = XLSX.read(new Uint8Array(reader.result), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
          const norm = normalizeRows(rows);
          if (!norm.length) {
            setBulkMsg("That spreadsheet had no rows.");
            return;
          }
          setCsvText(Papa.unparse(norm));
          setBulkMsg(`Loaded ${norm.length} row(s) from ${f.name}.`);
        } catch (err) {
          setBulkMsg("Could not read Excel file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      reader.onload = () => setCsvText(reader.result);
      reader.readAsText(f);
    }
  }

  const amountLabel = voucherType === "gift" ? "Gift value (MVR)" : "Discount text";
  const amountPlaceholder = voucherType === "gift" ? "500" : "20% OFF";

  return (
    <div className="wrap">
      <h1>Kokky Coupon Maker</h1>
      <p className="sub">Customize gift &amp; discount vouchers and export them as PNG or PDF.</p>

      {imgError && (
        <div className="warn">
          Could not load <b>{TEMPLATES[voucherType]}</b>. Add your coupon
          template image to the <b>public</b> folder (see README) and refresh.
        </div>
      )}

      <div className="tabs">
        <button
          className={"tab" + (tab === "single" ? " active" : "")}
          onClick={() => setTab("single")}
        >
          Single coupon
        </button>
        <button
          className={"tab" + (tab === "bulk" ? " active" : "")}
          onClick={() => setTab("bulk")}
        >
          Bulk (CSV / Excel)
        </button>
      </div>

      <div className="layout">
        <div>
          <div className="panel" style={{ marginBottom: 12 }}>
            <h2>Voucher type</h2>
            <select
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value)}
            >
              <option value="gift">Gift voucher (MVR value)</option>
              <option value="discount">Discount voucher (e.g. 20% OFF)</option>
            </select>
          </div>

          {tab === "single" ? (
            <div className="panel">
              <h2>Coupon details</h2>

              <label>{amountLabel}</label>
              <input
                type="text"
                value={amount}
                placeholder={amountPlaceholder}
                onChange={(e) => setAmount(e.target.value)}
              />

              <label>Valid until</label>
              <input
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
              />

              <label>Voucher code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

              <div className="btns">
                <button className="btn-primary" onClick={handlePng}>
                  Download PNG
                </button>
                <button className="btn-secondary" onClick={handlePdf}>
                  Download PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="panel">
              <h2>Bulk generate</h2>
              <p className="hint">
                Upload a <code>.csv</code> or <code>.xlsx</code> file (or paste
                rows). A <code>code</code> column is required; optional{" "}
                <code>amount</code> and <code>date</code> columns override the
                values above per row. Dates as YYYY-MM-DD.
              </p>
              <label>Upload CSV or Excel</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                onChange={onBulkFile}
              />
              <label>…or paste rows</label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
              <div className="btns">
                <button
                  className="btn-primary"
                  onClick={handleBulk}
                  disabled={bulkBusy}
                >
                  {bulkBusy ? "Generating…" : "Generate ZIP (PNGs + A4 sheet)"}
                </button>
              </div>
              {bulkMsg && <p className="hint">{bulkMsg}</p>}
            </div>
          )}

          <PositionPanel layout={layout} updateField={updateField} />
        </div>

        <div className="preview-col">
          <div className="preview-bar">
            <span>Live preview{tab === "bulk" ? " (first row)" : ""}</span>
            <div className="zoom">
              <button className="btn-ghost" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button className="btn-ghost" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}>+</button>
              <button className="btn-ghost" onClick={() => setZoom(1)}>Fit</button>
            </div>
          </div>
          <div className="preview-stage">
            <canvas ref={previewRef} style={{ width: zoom * 100 + "%", height: "auto" }} />
          </div>
          <canvas ref={workRef} style={{ display: "none" }} />
          {!img && !imgError && <p className="hint">Loading template…</p>}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }) {
  const decimals = step < 1 ? 3 : 0;
  const clamp = (v) => Math.min(max, Math.max(min, parseFloat(v.toFixed(6))));
  const nudge = (dir) => onChange(clamp(value + dir * step));
  return (
    <div className="slider-row">
      <span>{label}</span>
      <div className="slider-ctl">
        <button type="button" className="nudge" onClick={() => nudge(-1)} title={`-${step}`}>−</button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <button type="button" className="nudge" onClick={() => nudge(1)} title={`+${step}`}>+</button>
      </div>
      <span>{(+value).toFixed(decimals)}</span>
    </div>
  );
}

function TextFieldControls({ name, cfg, updateField }) {
  return (
    <div className="field-block">
      <strong>{name}</strong>
      <div className="slider-row" style={{ gridTemplateColumns: "70px 1fr" }}>
        <span>Show</span>
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => updateField(name, "enabled", e.target.checked)}
        />
      </div>
      <Slider label="X" value={cfg.x} min={0} max={1} step={0.001}
        onChange={(v) => updateField(name, "x", v)} />
      <Slider label="Y" value={cfg.y} min={0} max={1} step={0.001}
        onChange={(v) => updateField(name, "y", v)} />
      <Slider label="Size" value={cfg.size} min={0.01} max={0.4} step={0.002}
        onChange={(v) => updateField(name, "size", v)} />
      <Slider label="Rotation" value={cfg.rotation} min={-180} max={180} step={1}
        onChange={(v) => updateField(name, "rotation", v)} />
      <div className="row" style={{ marginTop: 8 }}>
        <div>
          <label>Font</label>
          <select
            value={cfg.font}
            onChange={(e) => updateField(name, "font", e.target.value)}
          >
            <option value="Skynight">Skynight</option>
            <option value="Bestime">Bestime</option>
          </select>
        </div>
        <div>
          <label>Color</label>
          <input
            type="color"
            value={cfg.color}
            onChange={(e) => updateField(name, "color", e.target.value)}
            style={{ width: "100%", height: 38, padding: 2 }}
          />
        </div>
      </div>

      <div className="slider-row" style={{ gridTemplateColumns: "70px 1fr", marginTop: 8 }}>
        <span>Outline</span>
        <input
          type="checkbox"
          checked={!!cfg.stroke}
          onChange={(e) => updateField(name, "stroke", e.target.checked)}
        />
      </div>
      {cfg.stroke && (
        <>
          <Slider label="Outline w" value={cfg.strokeWidth ?? 0.12} min={0} max={0.4} step={0.005}
            onChange={(v) => updateField(name, "strokeWidth", v)} />
          <div className="row" style={{ marginTop: 8 }}>
            <div>
              <label>Outline color</label>
              <input
                type="color"
                value={cfg.strokeColor ?? "#16243f"}
                onChange={(e) => updateField(name, "strokeColor", e.target.value)}
                style={{ width: "100%", height: 38, padding: 2 }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PositionPanel({ layout, updateField }) {
  const bc = layout.barcode;
  return (
    <div className="panel adjust" style={{ marginTop: 16 }}>
      <details>
        <summary>Adjust positions</summary>
        <p className="hint">
          Drag sliders until everything lines up on your template. Values are
          fractions of the image (0–1).
        </p>
        <TextFieldControls name="amount" cfg={layout.amount} updateField={updateField} />
        <TextFieldControls name="date" cfg={layout.date} updateField={updateField} />
        <TextFieldControls name="code" cfg={layout.code} updateField={updateField} />

        <div className="field-block">
          <strong>barcode</strong>
          <div className="slider-row" style={{ gridTemplateColumns: "70px 1fr" }}>
            <span>Show</span>
            <input
              type="checkbox"
              checked={bc.enabled}
              onChange={(e) => updateField("barcode", "enabled", e.target.checked)}
            />
          </div>
          <Slider label="X" value={bc.x} min={0} max={1} step={0.001}
            onChange={(v) => updateField("barcode", "x", v)} />
          <Slider label="Y" value={bc.y} min={0} max={1} step={0.001}
            onChange={(v) => updateField("barcode", "y", v)} />
          <Slider label="Width" value={bc.width} min={0.05} max={0.6} step={0.002}
            onChange={(v) => updateField("barcode", "width", v)} />
          <Slider label="Height" value={bc.height} min={0.02} max={0.3} step={0.002}
            onChange={(v) => updateField("barcode", "height", v)} />
        </div>
      </details>
    </div>
  );
}
