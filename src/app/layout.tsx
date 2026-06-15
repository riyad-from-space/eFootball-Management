import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import Navigation from "@/components/Navigation"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "eFootball Appifylab",
  description: "Official portal for eFootball Appifylab. Track fixtures, results, standings, brackets, and manage teams.",
  keywords: ["eFootball", "Appifylab", "konami", "pes", "esports", "championship", "tournament", "fixtures", "results", "standings"],
  authors: [{ name: "eFootball Appifylab" }],
}

export const viewport: Viewport = {
  themeColor: "#07080f",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-dark-bg text-foreground flex flex-col esports-grid selection:bg-brand-primary/30 selection:text-brand-primary">
        <Navigation />
        
        {/* Main Content Area — pb clears the fixed mobile bottom nav until the
            desktop nav takes over at lg; min-w-0 + overflow guard prevent any
            stray child from pushing the page wider than the viewport. */}
        <main className="flex-1 min-w-0 overflow-x-clip pb-24 lg:pb-6 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
          {children}
        </main>

        {/* Footer (desktop nav range) */}
        <footer className="hidden lg:block py-6 border-t border-dark-border text-center text-xs text-dark-muted bg-dark-bg/40">
          <p>© {new Date().getFullYear()} eFootball Appifylab. Created for ultimate competition.</p>
        </footer>
      </body>
    </html>
  )
}
