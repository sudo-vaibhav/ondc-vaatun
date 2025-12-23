import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
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
  description:
    "A Next.js service for integrating with the Open Network for Digital Commerce (ONDC). Handle subscription verification, domain ownership, and cryptographic operations with ease.",
  keywords: [
    "ONDC",
    "Open Network for Digital Commerce",
    "Next.js",
    "API",
    "Integration",
    "E-commerce",
    "India",
  ],
  authors: [{ name: "Vaatun" }],
  applicationName: "ONDC Vaatun",
  appleWebApp: {
    capable: true,
    title: "ONDC Vaatun",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "ONDC x Vaatun",
    description:
      "Open Network for Digital Commerce Integration - Subscription verification and domain ownership",
    type: "website",
    siteName: "ONDC Vaatun",
  },
  twitter: {
    card: "summary_large_image",
    title: "ONDC x Vaatun",
    description:
      "Open Network for Digital Commerce Integration - Subscription verification and domain ownership",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
