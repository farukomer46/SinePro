import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "SİNEPRO | Sine-AI Destekli Sinema ve Sosyal Keşif Platformu",
  description: "SİNEPRO ile en yeni filmleri keşfet, Sine-AI asistanından kişiselleştirilmiş tavsiyeler al ve küresel toplulukla tartış. Sinema dünyasının en sosyal hali burada. Haydi, keşfetmeye başla!",
  keywords: "SİNEPRO, Sine AI, film önerisi, hangi filmi izlesem, film inceleme, dizi tavsiyeleri, sosyal sinema platformu, yapay zeka film asistanı, küresel sohbet",
  openGraph: {
    title: "SİNEPRO - Sinema ve Sosyal Keşif Platformu",
    description: "Yapay zeka destekli film önerileri ve global sinema topluluğu.",
    type: "website",
    locale: "tr_TR",
    url: "https://sinepro.com", // Kendi URL'ini buraya yaz
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