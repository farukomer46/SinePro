import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SİNEPRO | Film ve Dizi Portalı",
  description: "En güncel içerikler ve favori listeniz.",
  icons: {
    icon: "/logo-sinepro.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
      {/* Bu satır tarayıcıyı logoyu almaya zorlar */}
      <link rel="icon" href="/logo-sinepro.png" sizes="any" />
    </head>
      <body>{children}</body>
    </html>
  );
}