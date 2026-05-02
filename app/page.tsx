"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercel/speed-insights/next";
import emailjs from '@emailjs/browser'; // Bunu yüklediğinden emin ol: npm install @emailjs/browser

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]); 
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [contentType, setContentType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"home" | "favorites" | "profile" | "settings">("home");
  
  // 🔐 GERÇEK MAİL DOĞRULAMALI ÜYELİK SİSTEMİ
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const mainNewScrollRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

 // 🎯 GÜNCELLENMİŞ MAİL FONKSİYONU
  const sendVerificationEmail = async (email: string, code: string) => {
    try {
      const serviceID = "service_9d5qlk9";    
      const templateID = "template_tlqw67x";   
      const publicKey = "OGQEmxiu2oahk21gg";     

      const templateParams = {
        email: email,              // 👈 Burayı 'email' yaptık (Paneldeki {{email}} ile eşleşti)
        user_name: formData.username,
        auth_code: code,
      };

      // Parametreleri gönderiyoruz
      await emailjs.send(serviceID, templateID, templateParams, publicKey);
      return true;
    } catch (error) {
      console.error("Mail hatası detayları:", error);
      return false;
    }
  };
  const handleRegisterStart = async () => {
    if (!formData.email.includes("@")) return alert("Geçerli bir e-posta girin!");
    if (formData.password.length < 6) return alert("Şifre en az 6 karakter olmalı!");
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    const success = await sendVerificationEmail(formData.email, code);
    if (success) {
      alert("Doğrulama kodu mail adresine gönderildi!");
      setAuthMode("verify");
    } else {
      alert("Mail gönderilirken hata oluştu. EmailJS ayarlarını kontrol et!");
    }
  };

  const handleVerifyAndFinish = () => {
    if (verificationCode === generatedCode) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      const newUser = { ...formData, id: Date.now(), joined: new Date().toLocaleDateString('tr-TR') };
      users.push(newUser);
      localStorage.setItem("sinepro_database_users", JSON.stringify(users));
      alert("Üyelik başarıyla tamamlandı!");
      setAuthMode("login");
    } else {
      alert("Girdiğin kod yanlış!");
    }
  };

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const userMatch = users.find((u: any) => u.email === formData.email && u.password === formData.password);
    if (userMatch) {
      setCurrentUser(userMatch);
      localStorage.setItem("sinepro_active_session", JSON.stringify(userMatch));
      setShowLogin(false);
    } else {
      alert("Mail veya şifre hatalı! Sallama bilgilerle girilemez.");
    }
  };

  // 🔄 VERİ ÇEKME
  useEffect(() => {
    setMounted(true);
    const session = localStorage.getItem("sinepro_active_session");
    if (session) setCurrentUser(JSON.parse(session));
  }, []);

  const fetchData = async () => {
    if (!mounted) return;
    try {
      const getUrl = `https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR&page=1${selectedGenre ? `&with_genres=${selectedGenre}` : ""}`;
      const res = await axios.get(getUrl, { headers: { Authorization: API_TOKEN } });
      setItems(res.data.results || []);
      
      const resNew = await axios.get(`https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR`, { headers: { Authorization: API_TOKEN } });
      setNewReleases(resNew.data.results || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, [contentType, selectedGenre, mounted]);

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setViewMode("home")}>
            <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900' }}>SİNE</span>
            <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: '22px', fontWeight: '900', marginLeft: '4px' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); }} style={{ background: 'none', border: 'none', color: contentType === "movie" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); }} style={{ background: 'none', border: 'none', color: contentType === "tv" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>DİZİLER</button>
          </div>
        </div>

        <div>
          {currentUser ? (
            <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ background: '#1F2833', color: '#66FCF1', padding: '10px 20px', borderRadius: '25px', border: '1px solid #45A29E', cursor: 'pointer', fontWeight: 'bold' }}>
              @{currentUser.username} ▼
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* GİRİŞ MODALİ */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '400px', border: '1px solid #66FCF1' }}>
            {authMode === "verify" ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#66FCF1' }}>Mail Doğrula</h2>
                <p style={{ color: '#ccc', marginBottom: '20px' }}>Kod mailine gönderildi.</p>
                <input type="text" placeholder="6 Haneli Kod" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '15px', borderRadius: '12px', color: 'white', marginBottom: '20px' }} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
                <button onClick={handleVerifyAndFinish} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>DOĞRULA</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', marginBottom: '25px', borderBottom: '1px solid #333' }}>
                  <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: authMode === "login" ? '#66FCF1' : '#555', borderBottom: authMode === "login" ? '3px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>GİRİŞ</button>
                  <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: authMode === "register" ? '#66FCF1' : '#555', borderBottom: authMode === "register" ? '3px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>KAYIT</button>
                </div>
                {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px' }} onChange={(e) => setFormData({...formData, username: e.target.value})} />}
                <input type="email" placeholder="E-posta" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px' }} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder="Şifre" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '20px' }} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <button onClick={authMode === "login" ? handleLogin : handleRegisterStart} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  {authMode === "login" ? "OTURUM AÇ" : "KOD GÖNDER"}
                </button>
              </>
            )}
            <p onClick={() => setShowLogin(false)} style={{ textAlign: 'center', color: '#555', marginTop: '20px', cursor: 'pointer' }}>Kapat</p>
          </div>
        </div>
      )}

      {/* ANA SAYFA İÇERİĞİ */}
      <div style={{ padding: '20px 5%' }}>
        {/* KATEGORİLER */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '20px', scrollbarWidth: 'none' }}>
          <button onClick={() => setSelectedGenre(null)} style={{ padding: '10px 25px', borderRadius: '25px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tümü</button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '10px 25px', borderRadius: '25px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{g.name}</button>
          ))}
        </div>

        {/* ÖNE ÇIKANLAR (YATAY ŞERİT) */}
        <h2 style={{ color: '#66FCF1', borderLeft: '4px solid #66FCF1', paddingLeft: '15px', marginBottom: '20px' }}>ÖNE ÇIKANLAR</h2>
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '30px', scrollbarWidth: 'none' }}>
          {newReleases.map(item => (
            <div key={item.id} onClick={() => setSelectedItem(item)} style={{ minWidth: '180px', cursor: 'pointer', transition: '0.3s' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', borderRadius: '15px', border: '1px solid #333' }} />
              <p style={{ marginTop: '10px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>{item.title || item.name}</p>
            </div>
          ))}
        </div>

        {/* TÜMÜ / KEŞFET (GRID) */}
        <h2 style={{ color: '#66FCF1', borderLeft: '4px solid #66FCF1', paddingLeft: '15px', margin: '40px 0 20px' }}>{selectedGenre ? genres.find(g => g.id === selectedGenre)?.name.toUpperCase() : "TÜMÜ"}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '25px' }}>
          {items.map(item => (
            <div key={item.id} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', borderRadius: '15px', border: '1px solid #333' }} />
              <p style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>{item.title || item.name}</p>
            </div>
          ))}
        </div>
      </div>

      <SpeedInsights />
    </main>
  );
}