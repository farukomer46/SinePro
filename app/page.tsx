"use client";

import React from 'react';

export default function Home() {
  return (
    <div style={{ 
      backgroundColor: '#ff0000', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: 'white', 
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '60px', fontWeight: '900', textShadow: '2px 2px 10px black' }}>
        🚨 TEST EKRANI 🚨
      </h1>
      
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '40px', borderRadius: '20px', marginTop: '30px' }}>
        <h2 style={{ fontSize: '30px' }}>Eğer şu an bu kırmızı ekranı görüyorsan:</h2>
        <ul style={{ fontSize: '24px', textAlign: 'left', marginTop: '20px', lineHeight: '1.8' }}>
          <li>✅ VS Code ve Next.js tıkır tıkır çalışıyor demektir.</li>
          <li>✅ Yanlış dosyayı değiştirmiyorsun demektir.</li>
          <li>❌ **Sorun kesinlikle bendedir (eski kodlarda bir yeri atlamışımdır).**</li>
        </ul>
      </div>

      <div style={{ background: 'black', padding: '30px', borderRadius: '20px', marginTop: '30px', border: '3px dashed yellow' }}>
        <h2 style={{ fontSize: '30px', color: 'yellow' }}>Eğer HALA eski SinePro sitesini görüyorsan:</h2>
        <ul style={{ fontSize: '24px', textAlign: 'left', marginTop: '20px', lineHeight: '1.8' }}>
          <li>❌ Yanlış `page.tsx` dosyasını değiştiriyorsun demektir.</li>
          <li>❌ VS Code dosyayı kaydetmiyor (`Ctrl + S` yapmamışsındır) demektir.</li>
          <li>❌ Next.js kafayı yemiş, `.next` klasörünü silip `npm run dev` yapman gerekiyor demektir.</li>
        </ul>
      </div>
    </div>
  );
}