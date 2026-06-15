import "./globals.css";

export const metadata = {
  title: "Kokky Coupon Maker",
  description: "Generate customized Kokky gift vouchers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
