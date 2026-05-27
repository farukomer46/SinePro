import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "SİNEPRO | Sine-AI Destekli Sinema ve Sosyal Keşif Platformu",
  description: "SİNEPRO ile sinema dünyasını yeniden keşfet! Yapay zeka asistanı Sine-AI ile sana en uygun film ve dizi önerilerini al, kendi izleme listelerini oluştur, detaylı incelemeler yaz ve global sinema topluluğuyla favori yapımlarını tartışmaya başla. Dijital sinema evrenin seni bekliyor.",
  keywords: ["SİNEPRO", "Sine AI", "film önerisi", "hangi filmi izlesem", "film inceleme", "dizi tavsiyeleri", "sosyal sinema platformu", "yapay zeka film asistanı", "küresel sohbet", "film listesi"], 
  openGraph: {
    title: "SİNEPRO - Sinema ve Sosyal Keşif Platformu",
    description: "Yapay zeka asistanı Sine-AI ile kişiselleştirilmiş film önerileri al, kendi listelerini oluştur ve global sinema topluluğuna hemen katıl.",
    type: "website",
    locale: "tr_TR",
    url: "https://sinepro.com.tr", 
    siteName: "SİNEPRO",
  },
  applicationName: 'SİNEPRO',
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
};

export const viewport = {
  themeColor: '#66FCF1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // İŞTE APPLE'IN YAKINLAŞTIRMASINI ENGELLEYEN SİHİRLİ KOD
};

// İŞTE HATAYI ÇÖZECEK OLAN ANA BİLEŞEN KISMI BURASI:
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SİNEPRO",
    "url": "https://sinepro.com.tr" // BURASI DA YENİ ALAN ADIYLA DEĞİŞTİ
  };

  return (
    <html lang="tr">
      <head>
        <script 
          type="application/ld+json" 
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} 
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}