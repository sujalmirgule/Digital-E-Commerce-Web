import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Marketplace",
  description: "Discover, buy and sell premium digital products",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#090d16] text-slate-100">
        {children}
      </body>
    </html>
  );
}
