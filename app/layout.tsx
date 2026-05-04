import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // Eğer genel bir CSS dosyan varsa

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SİNEPRO | Film ve Dizi Portalı',
  description: 'Yapay zeka destekli, devasa bir film ve dizi topluluğu.',
  icons: {
    icon: '/icon.png', // PWA ikonun için
    apple: '/icon.png',
  },
  themeColor: '#66FCF1', // Mobil durum çubuğu rengi için
  manifest: '/manifest.json', // PWA manifest dosyan için
  verification: {
    google: 'lmDwjSLizRKR5WITo7zpUv0pwyVdP57ntVRqlDOFbqo', 
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>{children}</body>
    </html>
  )
}