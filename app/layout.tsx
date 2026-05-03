import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SİNEPRO | Film ve Dizi Portalı",
  description: "Film ve dizi tutkunlarının buluşma noktası SİNEPRO! İzlediğin yapımları puanla, kendi eleştirilerini yaz ve SİNE Aİ ile yeni favorilerini anında keşfet.", 
  applicationName: "SİNEPRO", 
  keywords: ["film yorumları", "dizi inceleme", "sinepro", "film önerisi", "sinema topluluğu", "film puanlama", "yapay zeka film bulucu"], // Keywords kısmını da yorum sitesine göre güncelledim!
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  verification: {
    google: "lmDwjSLizRKR5WITo7zpUv0pwyVdP57ntVRqlDOFbqo",
  },
  // WHATSAPP VE SOSYAL MEDYA ÖNİZLEMESİ İÇİN:
  openGraph: {
    title: "SİNEPRO | Film ve Dizi Portalı",
    description: "Film ve dizi tutkunlarının buluşma noktası SİNEPRO! İzlediğin yapımları puanla, kendi eleştirilerini yaz ve SİNE Aİ ile yeni favorilerini anında keşfet.",
    siteName: "SİNEPRO", 
    type: "website",
    url: "https://sinepro.vercel.app/", // Vercel'den ismini değiştirince burayı da aynı isimle güncellemeyi unutma!
    images: [
      {
        url: "/icon.png", 
        width: 800,
        height: 600,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}