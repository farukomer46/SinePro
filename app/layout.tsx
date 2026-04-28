import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SİNEPRO | Film ve Dizi Portalı",
  description: "En güncel içerikler ve favori listeniz.",
  icons: {
    icon: "https://img.icons8.com/neon/96/movie-beginning.png",
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
        <link rel="icon" href="https://img.icons8.com/neon/96/movie-beginning.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}