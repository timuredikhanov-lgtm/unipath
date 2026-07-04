import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-heading", display: "swap", weight: ["400", "500"] });
const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "UniPath",
  description: "ИИ-консультант по поступлению в университеты США и ЕС",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className={`${fraunces.variable} ${inter.variable} h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
