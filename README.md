# Kokky Coupon Maker

A local Next.js app to make customizable Kokky vouchers. Pick **gift** (MVR
value) or **discount** (e.g. 20% OFF), fill in the value, valid-until date and
voucher code; it overlays them on your template image, auto-generates a
scannable barcode, and exports **PNG + PDF**. A **bulk mode** reads a
**CSV or Excel (.xlsx)** file and outputs a ZIP with every coupon as a PNG plus
a print-ready **A4 sheet (3 coupons per page)**.

Everything runs on your own PC — no internet needed once it's installed.

Optional: add `public/template-discount.png` for a separate discount-voucher
background. If it's missing, discount vouchers reuse the gift template.

---

## What you need first

- **Node.js 18 or newer** — download from https://nodejs.org (the "LTS" version).
  To check if you have it, open a terminal and run: `node -v`

---

## Step-by-step setup

### 1. Open a terminal in this folder
- **Windows:** open the `kokky-coupon-maker` folder, click the address bar,
  type `cmd`, press Enter.
- **Mac:** right-click the folder → "New Terminal at Folder".

### 2. Add your fonts
Copy your two font files into `public/fonts/` and rename them **exactly**:

```
public/fonts/Skynight.otf
public/fonts/Bestime.ttf
```

(You uploaded `Skynight (2).otf` — just rename it to `Skynight.otf`.)

### 3. Add your template image
Put your blank coupon template into `public/` named **exactly** `template.png`:

```
public/template.png
```

Crop it down to just the coupon (no big white margins) for the best default
alignment.

### 4. Install dependencies (one time)
In the terminal, run:

```
npm install
```

### 5. Start the app
```
npm run dev
```

Then open **http://localhost:3000** in your browser.

To stop it, press `Ctrl + C` in the terminal. To start it again later, just
run `npm run dev` again.

---

## How to use it

### Single coupon
1. Type the **Amount**, pick the **Valid until** date, type the **Voucher code**.
2. The preview updates live. The barcode is generated automatically from the code.
3. Click **Download PNG** or **Download PDF**.

### Bulk from CSV
1. Click the **Bulk from CSV** tab.
2. Upload a `.csv` file or paste rows. The first line must be the header:

   ```
   amount,date,code
   500,2026-07-25,0444-E436-4304
   250,2026-08-01,0445-A111-2222
   ```
   Dates must be `YYYY-MM-DD`.
3. Click **Generate ZIP**. You get one ZIP with a PNG for every coupon **plus**
   a single `all-coupons.pdf` with every coupon as a page.

### Lining things up (important)
The first time you run it, the amount / date / code / barcode probably won't sit
exactly where you want. Open **"Adjust positions"** under the form and drag the
sliders (X, Y, size, rotation, color, font) until everything lines up on your
template. Positions are fractions of the image, so they stay correct at any
resolution.

Once it looks perfect, you can make those values the permanent defaults: open
`lib/render.js`, find `DEFAULT_LAYOUT` at the top, and copy your tuned numbers in.

---

## Project structure

```
kokky-coupon-maker/
├─ app/
│  ├─ layout.js        app shell
│  ├─ page.js          the whole UI (form, preview, sliders, bulk)
│  └─ globals.css      styles + @font-face for your fonts
├─ lib/
│  ├─ render.js        draws a coupon on canvas (+ DEFAULT_LAYOUT to tune)
│  └─ export.js        PNG / PDF / ZIP download helpers
├─ public/
│  ├─ template.png     ← YOU ADD THIS
│  └─ fonts/           ← YOU ADD Skynight.otf + Bestime.ttf
├─ package.json
└─ README.md
```

## Notes
- Barcode format is CODE128 (works with most scanners). To change it, edit the
  `format` option in `lib/render.js`.
- The "MVR " and "Valid until " prefixes are set per field in `DEFAULT_LAYOUT`
  (the `prefix` value) — change or clear them there.
- Want a different default amount/date/code on load? Edit the `useState`
  initial values near the top of `app/page.js`.
