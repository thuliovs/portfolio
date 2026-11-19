import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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
  title: {
    default: "Thúlio Silva — Product Engineer | Full-Stack & Applied AI",
    template: "%s — Thúlio Silva",
  },
  description:
    "Product Engineer building full-stack software for complex business workflows, with experience in application architecture, enterprise integrations, and applied AI.",
  applicationName: "Thúlio Silva — Portfolio",
  authors: [{ name: "Thúlio Silva" }],
  creator: "Thúlio Silva",
  keywords: [
    "Product Engineer",
    "Full-Stack Engineer",
    "Application Architecture",
    "Applied AI",
    "Software Engineering",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Thúlio Silva",
    title: "Thúlio Silva — Product Engineer | Full-Stack & Applied AI",
    description:
      "Full-stack product development, application architecture, enterprise integrations, and applied AI.",
  },
  twitter: {
    card: "summary",
    title: "Thúlio Silva — Product Engineer | Full-Stack & Applied AI",
    description:
      "Full-stack product development, application architecture, enterprise integrations, and applied AI.",
  },
  robots: {
    index: process.env.PORTFOLIO_PUBLIC === "true",
    follow: process.env.PORTFOLIO_PUBLIC === "true",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="site-shell">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
