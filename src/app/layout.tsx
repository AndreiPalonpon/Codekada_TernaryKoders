import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import Providers from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SyncForge | Hybrid Scheduler",
  description: "An intelligent, collaborative, hybrid time-blocking platform.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} bg-slate-50 font-sans text-slate-900 antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
