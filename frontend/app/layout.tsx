
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Dust Aggregator",
  description: "Turn your small token balances into staked assets",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
