import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // Eğer genel bir CSS dosyan varsa

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SİNEPRO | Film ve Dizi Portalı',
  description: 'SİNEPRO, sinema tutkunları için geliştirilmiş yapay zeka destekli devasa bir film ve dizi topluluğudur.',
  applicationName: 'SİNEPRO', // <-- "VERCEL" YAZISINI "SİNEPRO" YAPACAK KOD
  appleWebApp: {
    title: 'SİNEPRO', // Apple cihazlar için site adı
  },
  icons: {
    icon: '/icon.png', 
    apple: '/icon.png',
  },
  manifest: '/manifest.json',
  verification: {
    google: 'lmDwjSLizRKR5WITo7zpUv0pwyVdP57ntVRqlDOFbqo', 
  },
}
export const viewport = {
  themeColor: '#66FCF1',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Google Botları için Sitenin Resmi Kimliği (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SİNEPRO",
    "url": "https://sinepro.vercel.app/"
  };

  return (
    <html lang="tr">
      <head>
        {/* Google'ın okuması için kimliği buraya gömüyoruz */}
        <script 
          type="application/ld+json" 
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} 
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}