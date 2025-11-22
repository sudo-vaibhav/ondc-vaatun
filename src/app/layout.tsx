import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ONDC Vaatun - Open Network for Digital Commerce Integration",
  description: "A Next.js service for integrating with the Open Network for Digital Commerce (ONDC). Handle subscription verification, domain ownership, and cryptographic operations with ease.",
  keywords: ["ONDC", "Open Network for Digital Commerce", "Next.js", "API", "Integration", "E-commerce", "India"],
  authors: [{ name: "Vaatun" }],
  openGraph: {
    title: "ONDC Vaatun",
    description: "ONDC Network Integration Service - Subscription verification and domain ownership",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
