# How to Make Coupons — Quick Guide

## Start the app
1. Open a terminal in the `kokky-coupon-maker` folder.
2. Run `npm run dev`.
3. Open **http://localhost:3000** in your browser.

(First time only: run `npm install` once before `npm run dev`, and make sure
your fonts are in `public/fonts/` and your template is at `public/template.png`.)

---

## Pick a voucher type first
At the top of the form choose:
- **Gift voucher** — the value shows as `MVR 500` on the red strip.
- **Discount voucher** — type free text like `20% OFF`.

(Optional: for a different background on discount vouchers, add
`public/template-discount.png`. If it's missing, the gift template is used.)

## Make a single coupon
1. Stay on the **Single coupon** tab.
2. Fill in the **value/discount**, **Valid until** (pick a date), and **Voucher code**.
3. Watch the **Live preview** on the right — it updates as you type. The
   barcode is created automatically from the code.
4. Click **Download PNG** or **Download PDF**.

That's it.

---

## Make many coupons at once
1. Click the **Bulk (CSV / Excel)** tab.
2. Upload a `.csv` or `.xlsx` file, or paste rows into the box. A `code` column
   is required; `amount` and `date` are optional and override the form values
   per row:

   ```
   amount,date,code
   500,2026-07-25,0444-E436-4304
   250,2026-08-01,0445-A111-2222
   100,2026-09-10,0446-B222-3333
   ```
   - A file with **just a list of codes** (one `code` column) also works — every
     coupon then uses the value/date/type set in the form.
   - Dates must be written as `YYYY-MM-DD`.
   - The preview shows your **first row** so you can check it looks right.
3. Click **Generate ZIP**. You'll get one ZIP containing a PNG for every coupon
   plus `print-sheet-A4.pdf` — a print-ready A4 with **3 coupons per page**.

---

## Lining things up (do this once)
If the amount, date, code, or barcode aren't sitting in the right spot:

1. Click **Adjust positions** under the form.
2. Use the sliders for each item:
   - **X / Y** — move it left/right and up/down.
   - **Size** — make the text bigger or smaller.
   - **Rotation** — tilt it (the amount on the red strip is rotated −90°).
   - **Font / Color** — switch between Skynight and Bestime, pick a colour.
   - **Width / Height** (barcode only) — resize the barcode.
3. Use the **zoom (−/+/Fit)** buttons above the preview to check fine details.

Once it looks perfect, those positions stay for the rest of your session. To
make them permanent (so they load that way every time), open `lib/render.js`,
find `DEFAULT_LAYOUT` at the top, and type your final numbers in.

---

## Tips
- **Empty a field** (like the prefix "MVR " or "Valid until ") by editing the
  `prefix` value in `DEFAULT_LAYOUT` in `lib/render.js`.
- **Barcode won't scan?** It uses CODE128 by default — keep codes to letters,
  numbers, and dashes.
- **Print:** the PDF is sized exactly to your coupon image, so it prints crisp.
