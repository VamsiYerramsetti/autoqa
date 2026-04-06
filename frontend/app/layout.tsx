import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "500", "600", "700", "800"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "AutoQ&A — Grounded answers for live presentations",
  description: "Upload presentation material, clarify what matters, and share one QR code that opens a chatbot answering from your slides.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body className="font-body bg-background text-white antialiased selection:bg-orange-500/40 selection:text-white">{children}</body>
    </html>
  );
}
