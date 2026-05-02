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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [contentType, setContentType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"home" | "favorites">("home");
  const [similar, setSimilar] = useState<any[]>([]);
  const [comments, setComments] = useState<any>({}); 
  const [newComment, setNewComment] = useState("");
  const [commentRating, setCommentRating] = useState<number>(10);

  // 🔐 AUTH & UI STATELERİ
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const mainNewScrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🛡️ MAİL & KAYIT SİSTEMİ
  const sendVerificationEmail = async (email: string, code: string) => {
    try {
      const serviceID = "service_9d5qlk9";    
      const templateID = "template_tlqw67x";   
      const publicKey = "OGQEmxiu2oahk21gg";     
      const templateParams = { email: email, user_name: formData.username, auth_code: code };
      await emailjs.send(serviceID, templateID, templateParams, publicKey);
      return true;
    } catch (error) { return false; }
  };

  const handleRegisterStart = async () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    if (users.find((u: any) => u.email === formData.email)) return alert("Bu e-posta zaten kayıtlı!");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    if (await sendVerificationEmail(formData.email, code)) { setAuthMode("verify"); }
  };

  const handleVerifyAndFinish = () => {
    if (verificationCode === generatedCode) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      const newUser = { ...formData, id: Date.now(), joined: new Date().toLocaleDateString('tr-TR') };
      users.push(newUser);
      localStorage.setItem("sinepro_database_users", JSON.stringify(users));
      setAuthMode("login");
      alert("Başarıyla kayıt oldun!");
    }
  };

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const userMatch = users.find((u: any) => u.email === formData.email && u.password === formData.password);
    if (userMatch) {
      setCurrentUser(userMatch);
      localStorage.setItem("sinepro_active_session", JSON.stringify(userMatch));
      setShowLogin(false);
    } else { alert("Hatalı mail veya şifre!"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("sinepro_active_session");
    setCurrentUser(null);
    setShowUserDropdown(false);
    setViewMode("home");
  };

  // 🔄 VERİ ÇEKME & DİĞERLERİ
  useEffect(() => {
    setMounted(true);
    const savedFavs = localStorage.getItem("sinepro_favs");
    const savedComments = localStorage.getItem("sinepro_comments");
    const session = localStorage.getItem("sinepro_active_session");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedComments) setComments(JSON.parse(savedComments));
    if (session) setCurrentUser(JSON.parse(session));

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const addComment = () => {
    if (!currentUser) return setShowLogin(true);
    if (!newComment.trim()) return;
    const commentObj = { id: Date.now(), user: currentUser.username, text: newComment, rating: commentRating, date: "Az önce" };
    const updated = { ...comments, [selectedItem.id]: [commentObj, ...(comments[selectedItem.id] || [])] };
    setComments(updated);
    localStorage.setItem("sinepro_comments", JSON.stringify(updated));
    setNewComment("");
  };

  if (!mounted) return null;

  // 🎨 AVATAR BİLEŞENİ
  const UserAvatar = ({ name, size = "40px", fontSize = "16px" }: any) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: fontSize, textTransform: 'uppercase', boxShadow: '0 0 10px rgba(102, 252, 241, 0.3)' }}>
      {name?.charAt(0)}
    </div>
  );

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ padding: '10px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', borderBottom: '1px solid #1F2833', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div onClick={() => setViewMode("home")} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900' }}>SİNE</span>
            <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: '22px', fontWeight: '900', marginLeft: '4px' }}>PRO</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <input type="text" placeholder="Film, dizi ara..." style={{ background: '#1F2833', border: 'none', padding: '10px 20px', borderRadius: '20px', color: 'white', width: '250px' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div onClick={() => setShowUserDropdown(!showUserDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#1F2833', padding: '5px 15px', borderRadius: '25px', border: '1px solid #333' }}>
                <span style={{ color: '#66FCF1', fontWeight: 'bold' }}>{currentUser.username}</span>
                <UserAvatar name={currentUser.username} size="32px" fontSize="14px" />
              </div>

              {/* 🎯 HDF TARZI AÇILIR MENÜ */}
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '45px', right: 0, width: '200px', background: '#1F2833', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid #333', overflow: 'hidden', animation: 'fadeIn 0.2s' }}>
                  <div onClick={() => { setShowProfileSettings(true); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #2c3440', transition: '0.3s' }} className="menu-item">⚙️ Profil Ayarlarım</div>
                  <div onClick={() => { setViewMode("favorites"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #2c3440' }}>❤️ Takip Ettiklerim</div>
                  <div style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #2c3440' }}>💬 Son Yorumlarım</div>
                  <div onClick={handleLogout} style={{ padding: '12px 20px', cursor: 'pointer', color: '#ff4d4d' }}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* 🖼️ PROFİL AYARLARI MODALİ (GÖRSELDEKİ TASARIM) */}
      {showProfileSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1F2833', width: '450px', borderRadius: '20px', overflow: 'hidden', border: '1px solid #333' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#66FCF1' }}>Profil Ayarları</h3>
              <span onClick={() => setShowProfileSettings(false)} style={{ cursor: 'pointer', fontSize: '20px' }}>✕</span>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>E-Posta</label>
                <input type="text" value={currentUser?.email} disabled style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '8px', color: '#555' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Kullanıcı Adı</label>
                <input type="text" defaultValue={currentUser?.username} style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '8px', color: 'white' }} />
              </div>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Şifre Değiştir</label>
                <input type="password" placeholder="Yeni şifre (boş bırakabilirsiniz)" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '8px', color: 'white' }} />
              </div>
              <button onClick={() => setShowProfileSettings(false)} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>DEĞİŞİKLİKLERİ KAYDET →</button>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 İÇERİK ALANI (HOME / FAVORİTES) */}
      <div style={{ padding: '40px 5%' }}>
        {viewMode === "home" ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '30px' }}>
            {/* Filmler buraya gelecek (fetchData'dan gelen items) */}
          </div>
        ) : (
          <div>
            <h2 style={{ color: '#66FCF1' }}>Takip Edilen İçerikler</h2>
            {favorites.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '100px 0', color: '#555' }}>
                 <div style={{ fontSize: '100px', marginBottom: '20px' }}>⚠️</div>
                 <h3>İçerik Yok</h3>
                 <p>Henüz takip ettiğin bir film veya dizi bulunmuyor.</p>
               </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '30px' }}>
                {favorites.map(f => (
                   <div key={f.id} onClick={() => setSelectedItem(f)} style={{ cursor: 'pointer' }}>
                     <img src={getImgUrl(f.poster_path)} style={{ width: '100%', borderRadius: '15px' }} />
                     <p style={{ textAlign: 'center', marginTop: '10px' }}>{f.title || f.name}</p>
                   </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 💬 YORUM KISMI (AVATARLI) */}
      {selectedItem && (
        <div style={{ /* Modal CSS */ }}>
          {/* ... film detayları ... */}
          <div style={{ marginTop: '50px', padding: '0 5%' }}>
            <h3 style={{ color: '#66FCF1' }}>Topluluk Yorumları</h3>
            <div style={{ display: 'flex', gap: '15px', background: '#1F2833', padding: '20px', borderRadius: '15px' }}>
               <UserAvatar name={currentUser?.username || "?"} />
               <div style={{ flex: 1 }}>
                 <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Düşüncelerini paylaş..." style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '15px', borderRadius: '10px', color: 'white', resize: 'none' }} rows={3} />
                 <button onClick={addComment} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 30px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '10px', float: 'right' }}>YORUM YAP</button>
               </div>
            </div>
          </div>
        </div>
      )}

      <SpeedInsights />
    </main>
  );
}