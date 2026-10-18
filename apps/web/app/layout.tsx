import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUNK24 — Art Prints",
  description: "Contemporary art and limited print editions by Turner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
