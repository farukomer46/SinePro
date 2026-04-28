import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SİNEPRO | Film ve Dizi Portalı",
  description: "En güncel içerikler ve favori listeniz.",
  icons: {
    icon: "/icon.png",
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