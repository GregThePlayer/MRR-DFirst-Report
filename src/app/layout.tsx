import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Sidebar } from "@/components/sidebar"
import { Providers } from "./providers"
import "./globals.css"

const inter = Inter({ variable: "--font-sans", subsets: ["latin", "latin-ext"] })
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DFIRST.AI — Metrics Platform",
  description: "SaaS Metrics, CRM & Revenue Analytics",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#FAFAFA]`}>
        <Providers>
          <TooltipProvider>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto">
                <div className="p-6 max-w-[1440px] mx-auto">
                  {children}
                </div>
              </main>
            </div>
            <Toaster />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
