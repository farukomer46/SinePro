"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercel/speed-insights/next";
import emailjs from '@emailjs/browser';

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImapi_cmVhZCJdLCJ2ZXJzaW9uIjoxfQ.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

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

  // 🔐 AUTH & UI
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

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

  // 🛡️ AUTH FONKSİYONLARI
  const sendVerificationEmail = async (email: string, code: string) => {
    try {
      const serviceID = "service_9d5qlk9";    
      const templateID = "template_tlqw67x";   
      const publicKey = "OGQEmxiu2oahk21gg";     
      const templateParams = { email, user_name: formData.username, auth_code: code };
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
      alert("Kayıt başarılı!");
    }
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
    setShowUserDropdown(false);
    setViewMode("home");
  };

  // 🔄 VERİ ÇEKME
  const fetchData = async () => {
    if (!mounted || viewMode === "favorites") return;
    try {
      const getUrl = (page: number) => searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=${page}`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=200&language=tr-TR&page=${page}`;
      
      const [res1, res2] = await Promise.all([
        axios.get(getUrl(1), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(2), { headers: { Authorization: API_TOKEN } })
      ]);
      setItems([...(res1.data.results || []), ...(res2.data.results || [])]);

      if (!searchQuery && newReleases.length === 0) {
        const resCarousel = await axios.get(`https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR`, { headers: { Authorization: API_TOKEN } });
        setNewReleases(resCarousel.data.results || []);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setMounted(true);
    const session = localStorage.getItem("sinepro_active_session");
    if (session) setCurrentUser(JSON.parse(session));
    const savedFavs = localStorage.getItem("sinepro_favs");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    const savedComments = localStorage.getItem("sinepro_comments");
    if (savedComments) setComments(JSON.parse(savedComments));
  }, []);

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  const getImgUrl = (path: string | null) => path ? `https://image.tmdb.org/t/p/w500${path}` : `https://via.placeholder.com/500x750?text=SİNEPRO`;

  // 🎨 UI BİLEŞENLERİ
  const UserAvatar = ({ name, size = "35px" }: any) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0B0C10', borderBottom: '1px solid #1F2833', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div onClick={() => {setViewMode("home"); setSearchQuery("");}} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#66FCF1', fontSize: '26px', fontWeight: '900' }}>SİNE</span>
            <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 6px', borderRadius: '4px', fontSize: '20px', fontWeight: '900', marginLeft: '4px' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setContentType("movie")} style={{ background: 'none', border: 'none', color: contentType === "movie" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>FİLMLER</button>
            <button onClick={() => setContentType("tv")} style={{ background: 'none', border: 'none', color: contentType === "tv" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>DİZİLER</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <input type="text" placeholder="Ara..." style={{ background: '#1F2833', border: 'none', padding: '8px 15px', borderRadius: '20px', color: 'white' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div onClick={() => setShowUserDropdown(!showUserDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#1F2833', padding: '5px 12px', borderRadius: '25px' }}>
                <span style={{ color: '#66FCF1', fontSize: '14px' }}>{currentUser.username}</span>
                <UserAvatar name={currentUser.username} size="30px" />
              </div>
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '45px', right: 0, width: '180px', background: '#1F2833', borderRadius: '10px', border: '1px solid #333', overflow: 'hidden' }}>
                  <div onClick={() => {setShowProfileSettings(true); setShowUserDropdown(false);}} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #222' }}>⚙️ Profil Ayarları</div>
                  <div onClick={() => {setViewMode("favorites"); setShowUserDropdown(false);}} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #222' }}>❤️ Listem</div>
                  <div onClick={handleLogout} style={{ padding: '12px', cursor: 'pointer', color: '#ff4d4d' }}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ</button>
          )}
        </div>
      </nav>

      {/* GİRİŞ MODALİ (SADELEŞTİRİLMİŞ) */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1F2833', padding: '30px', borderRadius: '20px', width: '320px', border: '1px solid #66FCF1' }}>
            <h2 style={{ textAlign: 'center', color: '#66FCF1' }}>{authMode === "login" ? "Giriş" : "Kayıt"}</h2>
            <input type="email" placeholder="E-posta" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '10px' }} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <input type="password" placeholder="Şifre" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '20px' }} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <button onClick={authMode === "login" ? handleLogin : handleRegisterStart} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{authMode === "login" ? "GİRİŞ" : "KOD GÖNDER"}</button>
            <p onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px', cursor: 'pointer', color: '#45A29E' }}>{authMode === "login" ? "Hesap Oluştur" : "Zaten üyeyim"}</p>
            <button onClick={() => setShowLogin(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#555', marginTop: '10px', cursor: 'pointer' }}>Kapat</button>
          </div>
        </div>
      )}

      {/* ANA İÇERIK (FİLMLER) */}
      <div style={{ padding: '20px 5%' }}>
        {viewMode === "home" ? (
          <>
            {/* KATEGORİLER */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '20px', scrollbarWidth: 'none' }}>
              <button onClick={() => setSelectedGenre(null)} style={{ padding: '6px 15px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer' }}>Tümü</button>
              {genres.map(g => (
                <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '6px 15px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
              ))}
            </div>

            {/* FİLM GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <img src={getImgUrl(item.poster_path)} style={{ width: '100%', borderRadius: '12px', border: '1px solid #1F2833' }} />
                  <p style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>{item.title || item.name}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* FAVORİLER */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
            {favorites.map(f => (
              <div key={f.id} onClick={() => setSelectedItem(f)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <img src={getImgUrl(f.poster_path)} style={{ width: '100%', borderRadius: '12px' }} />
                <p>{f.title || f.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <SpeedInsights />
    </main>
  );
}