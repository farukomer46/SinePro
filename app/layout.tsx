import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // Eğer genel bir CSS dosyan varsa

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SİNEPRO | Film ve Dizi Portalı',
  description: 'SİNEPRO, sinema tutkunları için geliştirilmiş yapay zeka destekli devasa bir film ve dizi topluluğudur.',
  applicationName: 'SİNEPRO',
  
  // SOSYAL MEDYA VE ARAMA MOTORLARI İÇİN EKSTRA GÜÇ
  openGraph: {
    title: 'SİNEPRO | Film ve Dizi Portalı',
    description: 'Sinema tutkunlarının buluşma noktası.',
    url: 'https://sinepro.vercel.app/',
    siteName: 'SİNEPRO', // Burası çok kritik
    locale: 'tr_TR',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'SİNEPRO',
    description: 'Yapay zeka destekli film portalı.',
  },

  appleWebApp: {
    title: 'SİNEPRO',
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