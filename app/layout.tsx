import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SİNEPRO | Film ve Dizi Portalı",
  description: "En güncel içerikler, reklamsız HD film ve dizi keyfi SinePro'da!", // Açıklamayı biraz daha ilgi çekici yaptık
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
    description: "En güncel içerikler, reklamsız HD film ve dizi keyfi SinePro'da!",
    type: "website",
    url: "https://farukomer46.vercel.app/", // Kendi site adresin
    images: [
      {
        url: "/icon.png", // Link atınca görünecek resim (logosunu koyduk)
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
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}