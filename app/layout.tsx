import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "SİNEPRO | Sinema ve Sosyal Keşif Platformu",
  description: "SİNEPRO ile en yeni filmleri keşfet, toplulukla tartış, kişisel profilini oluştur ve SİNE-Aİ ile zevkine uygun film tavsiyeleri al!, Küresel sohbete katıl.ZAMAN GEÇİRMENİN EN İYİ YOLU,Haydi Bir Dene!! ",
  keywords: "film izle, dizi izle, sinema platformu, sinepro, sine ai, film önerisi, film inceleme",

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
};

// İŞTE HATAYI ÇÖZECEK OLAN ANA BİLEŞEN KISMI BURASI:
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SİNEPRO",
    "url": "https://sinepro.vercel.app/"
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