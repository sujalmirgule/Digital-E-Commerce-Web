import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Folio — Digital Products & Creator Marketplace",
  description:
    "Discover digital products made to move your work forward. Templates, design assets, developer kits, and guides created by independent sellers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="antialiased min-h-screen bg-[#FAF8F4] text-[#111111] selection:bg-[#D8BFA5]/50 selection:text-[#111111]">
        {children}
      </body>
    </html>
  );
}

