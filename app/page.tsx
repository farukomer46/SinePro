"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercel/speed-insights/next";
import emailjs from '@emailjs/browser';

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]); 
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [contentType, setContentType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"home" | "profile">("home");
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const sendVerificationEmail = async (email: string, code: string) => {
    try {
      const serviceID = "service_9d5qlk9";    
      const templateID = "template_tlqw67x";   
      const publicKey = "OGQEmxiu2oahk21gg";     
      const templateParams = { email: email, user_name: formData.username, auth_code: code };
      await emailjs.send(serviceID, templateID, templateParams, publicKey);
      return true;
    } catch (error) {
      console.error("Mail hatası:", error);
      return false;
    }
  };

  const handleRegisterStart = async () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    if (users.find((u: any) => u.email === formData.email)) return alert("Bu e-posta zaten kayıtlı!");
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    if (await sendVerificationEmail(formData.email, code)) {
      alert("Kod gönderildi!");
      setAuthMode("verify");
    }
  };

  const handleVerifyAndFinish = () => {
    if (verificationCode === generatedCode) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      const newUser = { ...formData, id: Date.now(), joined: new Date().toLocaleDateString('tr-TR') };
      users.push(newUser);
      localStorage.setItem("sinepro_database_users", JSON.stringify(users));
      alert("Kayıt başarılı!");
      setAuthMode("login");
    } else { alert("Hatalı kod!"); }
  };

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const userMatch = users.find((u: any) => u.email === formData.email && u.password === formData.password);
    if (userMatch) {
      setCurrentUser(userMatch);
      localStorage.setItem("sinepro_active_session", JSON.stringify(userMatch));
      setShowLogin(false);
    } else { alert("Hatalı bilgiler!"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("sinepro_active_session");
    setCurrentUser(null);
    setViewMode("home");
  };

  useEffect(() => {
    setMounted(true);
    const session = localStorage.getItem("sinepro_active_session");
    if (session) setCurrentUser(JSON.parse(session));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!mounted) return;
      try {
        const url = `https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR&page=1${selectedGenre ? `&with_genres=${selectedGenre}` : ""}`;
        const res = await axios.get(url, { headers: { Authorization: API_TOKEN } });
        setItems(res.data.results || []);
        const resNew = await axios.get(`https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR`, { headers: { Authorization: API_TOKEN } });
        setNewReleases(resNew.data.results || []);
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, [contentType, selectedGenre, mounted]);

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0B0C10', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => setViewMode("home")}>
            <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900' }}>SİNE</span>
            <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: '22px', fontWeight: '900' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); }} style={{ background: 'none', border: 'none', color: contentType === "movie" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); }} style={{ background: 'none', border: 'none', color: contentType === "tv" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>DİZİLER</button>
          </div>
        </div>
        <div>
          {currentUser ? (
            <button onClick={() => setViewMode("profile")} style={{ background: '#1F2833', color: '#66FCF1', padding: '10px 20px', borderRadius: '25px', border: '1px solid #45A29E', cursor: 'pointer', fontWeight: 'bold' }}>
              👤 {currentUser.username}
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* MODAL / LOGIN (AYNI KALDI) */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '350px', border: '1px solid #66FCF1' }}>
            {authMode === "verify" ? (
              <div style={{ textAlign: 'center' }}>
                <input type="text" placeholder="6 Haneli Kod" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px' }} onChange={(e) => setVerificationCode(e.target.value)} />
                <button onClick={handleVerifyAndFinish} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>DOĞRULA</button>
              </div>
            ) : (
              <>
                <h2 style={{ color: '#66FCF1', textAlign: 'center' }}>{authMode === "login" ? "Giriş Yap" : "Kayıt Ol"}</h2>
                {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px' }} onChange={(e) => setFormData({...formData, username: e.target.value})} />}
                <input type="email" placeholder="E-posta" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px' }} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder="Şifre" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '20px' }} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <button onClick={authMode === "login" ? handleLogin : handleRegisterStart} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{authMode === "login" ? "GİRİŞ" : "KOD GÖNDER"}</button>
                <p onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', cursor: 'pointer', color: '#45A29E' }}>{authMode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten üye misin? Giriş yap"}</p>
              </>
            )}
            <p onClick={() => setShowLogin(false)} style={{ textAlign: 'center', color: '#555', marginTop: '10px', cursor: 'pointer' }}>Kapat</p>
          </div>
        </div>
      )}

      {/* İÇERİK ALANI */}
      <div style={{ padding: '20px 5%' }}>
        {viewMode === "home" ? (
          <>
            <h2 style={{ color: '#66FCF1', borderLeft: '4px solid #66FCF1', paddingLeft: '15px', marginBottom: '20px' }}>ÖNE ÇIKANLAR</h2>
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '30px', scrollbarWidth: 'none' }}>
              {newReleases.slice(0, 10).map(item => (
                <div key={item.id} style={{ minWidth: '160px' }}>
                  <img src={getImgUrl(item.poster_path)} style={{ width: '100%', borderRadius: '15px', border: '1px solid #1F2833' }} alt="" />
                </div>
              ))}
            </div>
            <h2 style={{ color: '#66FCF1', borderLeft: '4px solid #66FCF1', paddingLeft: '15px', margin: '40px 0 20px' }}>TÜMÜ</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
              {items.map(item => (
                <div key={item.id}>
                  <img src={getImgUrl(item.poster_path)} style={{ width: '100%', borderRadius: '15px' }} alt="" />
                  <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '10px' }}>{item.title || item.name}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* PROFİL SAYFASI BURASI */
          <div style={{ maxWidth: '600px', margin: '50px auto', background: '#1F2833', padding: '40px', borderRadius: '30px', border: '1px solid #66FCF1', textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', background: '#66FCF1', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#0B0C10' }}>
              {currentUser?.username.charAt(0).toUpperCase()}
            </div>
            <h1 style={{ color: '#66FCF1', marginBottom: '10px' }}>{currentUser?.username}</h1>
            <p style={{ color: '#45A29E', marginBottom: '30px' }}>{currentUser?.email}</p>
            
            <div style={{ textAlign: 'left', background: '#0B0C10', padding: '20px', borderRadius: '15px', marginBottom: '30px' }}>
              <p><strong>Hesap Durumu:</strong> <span style={{ color: '#66FCF1' }}>Doğrulanmış Üye ✅</span></p>
              <p><strong>Katılım Tarihi:</strong> {currentUser?.joined}</p>
              <p><strong>Paket:</strong> SinePro Premium</p>
            </div>

            <button onClick={handleLogout} style={{ background: '#ff4d4d', color: 'white', padding: '12px 30px', borderRadius: '15px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
              OTURUMU KAPAT
            </button>
          </div>
        )}
      </div>

      <SpeedInsights />
    </main>
  );
}