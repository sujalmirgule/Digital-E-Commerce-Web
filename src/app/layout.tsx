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
  title: "Marketify — Digital Product Marketplace",
  description:
    "Good digital products deserve to be discovered. Discover, buy and sell premium digital products with instant access and verified creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="antialiased min-h-screen bg-[#120A12] text-[#F7EFE2] selection:bg-[#F43F5E]/30 selection:text-[#F7EFE2]">
        {children}
      </body>
    </html>
  );
}

