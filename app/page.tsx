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

  // 🔐 GİRİŞ & PROFİL SİSTEMİ STATELERİ
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

  // 🛡️ AUTH (EMAILJS)
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

  const getGenreName = () => {
    const genre = genres.find(g => g.id === selectedGenre);
    return genre ? genre.name.toUpperCase() : "TÜMÜ";
  };

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const calculateProRating = (itemID: number) => {
    const itemComments = comments[itemID] || [];
    const ratedComments = itemComments.filter((c: any) => c.rating);
    if (ratedComments.length === 0) return null;
    const totalScore = ratedComments.reduce((sum: number, c: any) => sum + c.rating, 0);
    return (totalScore / ratedComments.length).toFixed(1);
  };

  const addComment = () => {
    if (!currentUser) {
        setShowLogin(true);
        return;
    }
    if (!newComment.trim()) return;
    const itemID = selectedItem.id;
    const commentObj = {
      id: Date.now(),
      user: currentUser.username, // Değiştirildi
      text: newComment,
      rating: commentRating,
      date: new Date().toLocaleDateString('tr-TR')
    };
    const updatedComments = { ...comments, [itemID]: [commentObj, ...(comments[itemID] || [])] };
    setComments(updatedComments);
    localStorage.setItem("sinepro_comments", JSON.stringify(updatedComments));
    setNewComment("");
    setCommentRating(10);
  };

  const deleteComment = (itemID: number, commentID: number) => {
    const updatedComments = { 
      ...comments, 
      [itemID]: comments[itemID].filter((c: any) => c.id !== commentID) 
    };
    setComments(updatedComments);
    localStorage.setItem("sinepro_comments", JSON.stringify(updatedComments));
  };

  useEffect(() => {
    setMounted(true);
    const session = localStorage.getItem("sinepro_active_session");
    if (session) setCurrentUser(JSON.parse(session));
    const savedFavs = localStorage.getItem("sinepro_favs");
    const savedComments = localStorage.getItem("sinepro_comments");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedComments) setComments(JSON.parse(savedComments));

    // Menü dışına tıklanınca kapatma
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mounted) document.body.style.overflow = selectedItem ? 'hidden' : 'unset';
  }, [selectedItem, mounted]);

  const toggleFavorite = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    let updated;
    const isFav = favorites.find(f => f.id === item.id);
    if (isFav) {
      updated = favorites.filter(f => f.id !== item.id);
    } else {
      updated = [...favorites, item];
    }
    setFavorites(updated);
    localStorage.setItem("sinepro_favs", JSON.stringify(updated));
  };

  const fetchData = async () => {
    if (!mounted || viewMode === "favorites") return;
    try {
      const getUrl = (page: number) => searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=${page}`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=200&language=tr-TR&page=${page}`;
      
      const [res1, res2, res3, res4] = await Promise.all([
        axios.get(getUrl(1), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(2), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(3), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(4), { headers: { Authorization: API_TOKEN } })
      ]);
      setItems([...(res1.data.results || []), ...(res2.data.results || []), ...(res3.data.results || []), ...(res4.data.results || [])]);

      if (!searchQuery && newReleases.length === 0) {
        const carouselUrl = `https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR`;
        const resCarousel = await axios.get(carouselUrl, { headers: { Authorization: API_TOKEN } });
        setNewReleases(resCarousel.data.results || []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchExtraDetails = async (id: number) => {
    try {
      const similarRes = await axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/similar?language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } });
      setSimilar(similarRes.data.results?.slice(0, 15) || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      ref.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // 🎨 AVATAR BİLEŞENİ (YENİ)
  const UserAvatar = ({ name, size = "35px", fontSize = "14px" }: any) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: fontSize, textTransform: 'uppercase' }}>
      {name?.charAt(0) || "?"}
    </div>
  );

  if (!mounted) return null;

  const SineProLogo = ({ style, fontSize, proSize }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 0 10px rgba(102, 252, 241, 0.6))', ...style }}>
        <span style={{ color: '#66FCF1', fontSize: fontSize || '28px', fontWeight: '900', letterSpacing: '-1.5px', textShadow: '0 0 15px rgba(102, 252, 241, 0.8)' }}>SİNE</span>
        <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: proSize || '22px', fontWeight: '900', marginLeft: '4px', boxShadow: '0 0 20px rgba(102, 252, 241, 0.9)' }}>PRO</span>
    </div>
  );

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(102,252,241,0.12) 0%, rgba(102,252,241,0) 60%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none', animation: 'pulseGlow 7s infinite ease-in-out' }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlow { 0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.05); } }
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 25px; padding: 30px 5%; position: relative; z-index: 1; }
        .hover-effect { transition: 0.4s ease; cursor: pointer; position: relative; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 0 25px rgba(102, 252, 241, 0.4); }
        .horizontal-scroll { display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; padding: 10px 0; }
        .horizontal-scroll::-webkit-scrollbar { display: none; }
        .side-nav-btn { position: absolute; top: 120px; transform: translateY(-50%); background: rgba(0,0,0,0.8); color: #66FCF1; border: 1px solid #333; width: 40px; height: 70px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 4px; }
        .nav-link { background: none; border: none; font-weight: bold; cursor: pointer; }
        .section-title { color: #66FCF1; padding: 0 10px; margin-top: 30px; font-size: 20px; letter-spacing: 1px; border-left: 4px solid #66FCF1; margin-left: 5%; font-weight: 900; }
        .fav-heart-btn { position: absolute; top: 10px; right: 10px; background: transparent; width: 32px; height: 32px; borderRadius: 50%; display: flex; alignItems: center; justifyContent: center; z-index: 10; transition: 0.3s; font-size: 22px; text-shadow: 0 0 8px rgba(0,0,0,1); }
        .comment-box { background: #1F2833; border-radius: 10px; padding: 15px; border-left: 3px solid #66FCF1; position: relative; }
        
        /* 🎯 GÜNCELLEME: PUAN KUTUCUĞU OKUNUR BOYUTA GETİRİLDİ (11px) */
        .rating-badge-pro { 
          position: absolute; 
          bottom: 10px; 
          left: 10px; 
          background: rgba(0,0,0,0.8); 
          color: #66FCF1; 
          padding: 2px 8px; 
          border-radius: 4px; 
          font-size: 11px; 
          font-weight: bold;
          pointer-events: none;
        }
      ` }} />

      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
             <SineProLogo />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); setSelectedGenre(null); }} className="nav-link" style={{ color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); setSelectedGenre(null); }} className="nav-link" style={{ color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E' }}>DİZİLER</button>
            <button onClick={() => setViewMode("favorites")} className="nav-link" style={{ color: viewMode === "favorites" ? '#66FCF1' : '#45A29E' }}>LİSTEM ({favorites.length})</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: '#1F2833', color: '#66FCF1', border: '1px solid #45A29E', padding: '8px 12px', borderRadius: '10px', outline: 'none', cursor: 'pointer' }}>
            <option value="popularity.desc">🔥 Trendler</option>
            <option value="vote_average.desc">⭐ Puan</option>
            <option value="primary_release_date.desc">📅 Yeni</option>
          </select>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
          
          {/* DEĞİŞİKLİK 1: GİRİŞ BUTONU VE DROPDOWN */}
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div onClick={() => setShowUserDropdown(!showUserDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#1F2833', padding: '5px 12px', borderRadius: '25px', border: '1px solid #333' }}>
                <span style={{ color: '#66FCF1', fontWeight: 'bold' }}>{currentUser.username}</span>
                <UserAvatar name={currentUser.username} size="30px" />
              </div>

              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '50px', right: 0, width: '200px', background: '#1F2833', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid #333', overflow: 'hidden' }}>
                  <div onClick={() => { setShowProfileSettings(true); setShowUserDropdown(false); }} style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #222' }}>⚙️ Profil Ayarlarım</div>
                  <div onClick={() => { setViewMode("favorites"); setShowUserDropdown(false); }} style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: '1px solid #222' }}>❤️ Takip Ettiklerim</div>
                  <div onClick={handleLogout} style={{ padding: '15px 20px', cursor: 'pointer', color: '#ff4d4d' }}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* DEĞİŞİKLİK 2: GİRİŞ MODALİ */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '380px', border: '1px solid #66FCF1' }}>
            {authMode === "verify" ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#66FCF1', marginBottom: '10px' }}>Mail Doğrula</h2>
                <input type="text" placeholder="6 Haneli Kod" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '15px', borderRadius: '12px', color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '20px' }} onChange={(e) => setVerificationCode(e.target.value)} />
                <button onClick={handleVerifyAndFinish} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>DOĞRULA</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', marginBottom: '25px', borderBottom: '1px solid #333' }}>
                  <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: authMode === "login" ? '#66FCF1' : '#555', borderBottom: authMode === "login" ? '3px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>GİRİŞ</button>
                  <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: authMode === "register" ? '#66FCF1' : '#555', borderBottom: authMode === "register" ? '3px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>KAYIT</button>
                </div>
                {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px' }} onChange={(e) => setFormData({...formData, username: e.target.value})} />}
                <input type="email" placeholder="E-posta" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px' }} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder="Şifre" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '20px' }} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <button onClick={authMode === "login" ? handleLogin : handleRegisterStart} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                  {authMode === "login" ? "GİRİŞ YAP" : "KOD GÖNDER"}
                </button>
              </>
            )}
            <p onClick={() => setShowLogin(false)} style={{ textAlign: 'center', color: '#555', marginTop: '20px', cursor: 'pointer' }}>Kapat</p>
          </div>
        </div>
      )}

      {/* DEĞİŞİKLİK 3: PROFİL AYARLARI MODALİ */}
      {showProfileSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1F2833', width: '450px', borderRadius: '20px', border: '1px solid #66FCF1', padding: '30px' }}>
            <h3 style={{ color: '#66FCF1', marginBottom: '25px', textAlign: 'center' }}>Profil Ayarları</h3>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><UserAvatar name={currentUser?.username} size="80px" fontSize="30px" /></div>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>E-Posta</label>
                <input type="text" value={currentUser?.email} disabled style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '8px', color: '#555' }} />
            </div>
            <div style={{ marginBottom: '25px' }}>
                <label style={{ fontSize: '12px', color: '#ccc' }}>Kullanıcı Adı</label>
                <input type="text" defaultValue={currentUser?.username} style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '8px', color: 'white' }} />
            </div>
            <button onClick={() => setShowProfileSettings(false)} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>KAYDET</button>
            <button onClick={() => setShowProfileSettings(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#555', marginTop: '10px', cursor: 'pointer' }}>Kapat</button>
          </div>
        </div>
      )}

      {viewMode === "home" && !searchQuery && (
        <div style={{ padding: '10px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
          <button onClick={() => setSelectedGenre(null)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümü</button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
          ))}
        </div>
      )}

      {viewMode === "home" && !searchQuery && newReleases.length > 0 && (
        <div style={{ position: 'relative', marginTop: '20px', zIndex: 1 }}>
          <h3 className="section-title">ÖNE ÇIKANLAR</h3>
          <div style={{ position: 'relative', padding: '0 5%' }}>
            <button className="side-nav-btn" style={{ left: '1%' }} onClick={() => handleScroll(mainNewScrollRef, 'left')}>❮</button>
            <button className="side-nav-btn" style={{ right: '1%' }} onClick={() => handleScroll(mainNewScrollRef, 'right')}>❯</button>
            <div className="horizontal-scroll" ref={mainNewScrollRef}>
              {newReleases.map((item) => (
                <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ minWidth: '200px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                  <div className="hover-effect" style={{ borderRadius: '12px', overflow: 'hidden', height: '280px', border: '1px solid #333', position: 'relative' }}>
                    <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <div onClick={(e) => toggleFavorite(e, item)} className="fav-heart-btn">
                       {favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}
                    </div>
                    <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
                  </div>
                  <p style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <h3 className="section-title">{getGenreName()}</h3>

      <div className="movie-grid">
        {(viewMode === "home" ? items : favorites).map((item, idx) => (
          <div key={`${item.id}-${idx}`} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
            <div className="hover-effect" style={{ borderRadius: '15px', overflow: 'hidden', border: '1px solid #333', height: '270px', position: 'relative' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <div onClick={(e) => toggleFavorite(e, item)} className="fav-heart-btn">
                {favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}
              </div>
              <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
            </div>
            <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div id="modal-content" style={{ position: 'fixed', inset: 0, background: '#0B0C10', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 1100, background: 'rgba(11, 12, 16, 0.95)', padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
             <h2 style={{ color: '#66FCF1', margin: 0 }}>{selectedItem.title || selectedItem.name}</h2>
             <button onClick={() => setSelectedItem(null)} style={{ background: '#66FCF1', color: '#0B0C10', border: 'none', padding: '8px 25px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>KAPAT</button>
          </div>

          <div style={{ width: '100%', height: '55vh', backgroundImage: `linear-gradient(to bottom, transparent, #0B0C10), url(${getImgUrl(selectedItem.backdrop_path, 'original')})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedItem.title || selectedItem.name)}+fragman`} target="_blank" rel="noreferrer" style={{ background: '#66FCF1', color: '#0B0C10', padding: '12px 35px', borderRadius: '50px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 0 20px rgba(102, 252, 241, 0.5)' }}>▶ FRAGMANI İZLE</a>
          </div>

          <div style={{ maxWidth: '1100px', margin: '-40px auto 0', padding: '0 5% 100px' }}>
             <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                    <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '280px', borderRadius: '15px', border: '1px solid #333' }} alt="" />
                    <div onClick={(e) => toggleFavorite(e, selectedItem)} className="fav-heart-btn" style={{ cursor: 'pointer' }}>
                       {favorites.find(f => f.id === selectedItem.id) ? '❤️' : '🤍'}
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: '300px', paddingTop: '40px' }}>
                    <h1 style={{ fontSize: '44px', fontWeight: '900', color: '#66FCF1' }}>{selectedItem.title || selectedItem.name}</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '30px', margin: '20px 0' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <span style={{ fontSize: '20px' }}>⭐ TMDB:</span>
                         <span style={{ color: '#66FCF1', fontSize: '24px', fontWeight: 'bold' }}>{selectedItem.vote_average?.toFixed(1)}</span>
                       </div>
                       {calculateProRating(selectedItem.id) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #333', paddingLeft: '30px' }}>
                            <SineProLogo fontSize="18px" proSize="14px" />
                            <span style={{ color: '#66FCF1', fontSize: '24px', fontWeight: 'bold' }}>{calculateProRating(selectedItem.id)}</span>
                            <span style={{ color: '#555', fontSize: '12px' }}>({(comments[selectedItem.id] || []).filter((c: any) => c.rating).length} yorum)</span>
                        </div>
                       )}
                    </div>
                    <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '18px' }}>{selectedItem.overview}</p>
                </div>
             </div>

             <div style={{ marginTop: '60px', position: 'relative' }}>
                <h3 style={{ color: '#66FCF1', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>BUNLARI DA SEVEBİLİRSİNİZ</h3>
                <button className="side-nav-btn" style={{ left: '-50px' }} onClick={() => handleScroll(modalScrollRef, 'left')}>❮</button>
                <button className="side-nav-btn" style={{ right: '-50px' }} onClick={() => handleScroll(modalScrollRef, 'right')}>❯</button>
                <div className="horizontal-scroll" ref={modalScrollRef}>
                   {similar.map((s) => (
                     <div key={s.id} onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); document.getElementById('modal-content')?.scrollTo(0,0); }} style={{ minWidth: '160px', textAlign: 'center', cursor: 'pointer' }}>
                        <div className="hover-effect" style={{ borderRadius: '12px', overflow: 'hidden', height: '240px', border: '1px solid #333' }}>
                           <img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                        <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title || s.name}</p>
                     </div>
                   ))}
                </div>
             </div>

             <div style={{ marginTop: '80px' }}>
                <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '10px' }}>TOPLULUK YORUMLARI & PUANLARI</h3>
                <div style={{ margin: '30px 0', background: '#1F2833', padding: '20px', borderRadius: '15px', border: '1px solid #45A29E' }}>
                   <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                     {/* DEĞİŞİKLİK 4: YORUM KISMINA AVATAR */}
                     <UserAvatar name={currentUser?.username || "?"} />
                     <input type="text" placeholder={currentUser ? "Bu film hakkında ne düşünüyorsun?" : "Yorum yapmak için giriş yapmalısınız."} value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={!currentUser} style={{ flex: 1, background: '#0B0C10', border: '1px solid #45A29E', padding: '12px 20px', borderRadius: '10px', color: 'white', outline: 'none' }} />
                     <select value={commentRating} onChange={(e) => setCommentRating(Number(e.target.value))} disabled={!currentUser} style={{ background: '#0B0C10', color: '#66FCF1', border: '1px solid #45A29E', padding: '0 15px', borderRadius: '10px', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        {[10,9,8,7,6,5,4,3,2,1].map(r => <option key={r} value={r}>{r} Puan</option>)}
                     </select>
                   </div>
                   <button onClick={addComment} style={{ background: '#66FCF1', color: '#0B0C10', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', float: 'right' }}>GÖNDER</button>
                   <div style={{ clear: 'both' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {(comments[selectedItem.id] || []).length > 0 ? (
                     comments[selectedItem.id].map((c: any) => (
                       <div key={c.id} className="comment-box">
                          <button onClick={() => deleteComment(selectedItem.id, c.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}>❌</button>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* DEĞİŞİKLİK 5: YAPILAN YORUMLARA AVATAR */}
                                <UserAvatar name={c.user} size="24px" fontSize="12px" />
                                <span style={{ color: '#66FCF1', fontWeight: 'bold', fontSize: '16px' }}>@{c.user}</span>
                                <span style={{ background: 'rgba(102,252,241,0.1)', color: '#66FCF1', padding: '1px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Puan: {c.rating}/10</span>
                             </div>
                             <span style={{ color: '#45A29E', fontSize: '12px', marginRight: '25px' }}>{c.date}</span>
                          </div>
                          <p style={{ margin: 0, color: '#ccc', lineHeight: '1.6' }}>{c.text}</p>
                       </div>
                     ))
                   ) : <p style={{ color: '#555', textAlign: 'center', marginTop: '30px' }}>Henüz yorum yapılmamış.</p>}
                </div>
             </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" className="donate-btn" style={{ background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(102, 252, 241, 0.3)', transition: '0.3s' }}>
          <span>💎 DESTEK OL</span>
        </a>
      </div>
      <SpeedInsights />
    </main>
  );
}