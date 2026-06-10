import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'High Country Classic',
  description: 'Annual Golf Tournament at Apple Mountain Golf Resort',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}