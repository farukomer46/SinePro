"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  const [viewMode, setViewMode] = useState<"home" | "favorites" | "profile" | "settings">("home");
  const [similar, setSimilar] = useState<any[]>([]);
  
  // 🔐 GÜVENLİ ÜYELİK SİSTEMİ
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [comments, setComments] = useState<any>({});
  const [newComment, setNewComment] = useState("");

  const mainNewScrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // 🛡️ AUTH KONTROLLERİ
  const handleAuth = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_users") || "[]");

    if (authMode === "register") {
      if (!formData.email.includes("@")) return alert("Geçerli bir mail girin!");
      if (formData.password.length < 6) return alert("Şifre en az 6 karakter olmalı!");
      
      const exists = users.find((u: any) => u.email === formData.email);
      if (exists) return alert("Bu mail zaten kayıtlı!");

      const newUser = { ...formData, id: Date.now(), joined: new Date().toLocaleDateString() };
      users.push(newUser);
      localStorage.setItem("sinepro_users", JSON.stringify(users));
      alert("Doğrulama kodu mailinize gönderildi! (Simülasyon). Şimdi giriş yapabilirsiniz.");
      setAuthMode("login");
    } else {
      const userMatch = users.find((u: any) => u.email === formData.email && u.password === formData.password);
      if (userMatch) {
        setCurrentUser(userMatch);
        localStorage.setItem("sinepro_session", JSON.stringify(userMatch));
        setShowLogin(false);
      } else {
        alert("E-posta veya şifre hatalı!");
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("sinepro_session");
    setViewMode("home");
    setShowUserMenu(false);
  };

  useEffect(() => {
    setMounted(true);
    const savedFavs = localStorage.getItem("sinepro_favs");
    const session = localStorage.getItem("sinepro_session");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (session) setCurrentUser(JSON.parse(session));
  }, []);

  const fetchData = async () => {
    if (!mounted || viewMode === "favorites") return;
    try {
      const getUrl = (page: number) => searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=${page}`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=200&language=tr-TR&page=${page}`;
      
      const res = await axios.get(getUrl(1), { headers: { Authorization: API_TOKEN } });
      setItems(res.data.results || []);
      if (!searchQuery && newReleases.length === 0) {
        const resCarousel = await axios.get(`https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR`, { headers: { Authorization: API_TOKEN } });
        setNewReleases(resCarousel.data.results || []);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  if (!mounted) return null;

  const SineProLogo = ({ style, fontSize, proSize }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 0 10px rgba(102, 252, 241, 0.6))', ...style }}>
        <span style={{ color: '#66FCF1', fontSize: fontSize || '28px', fontWeight: '900', letterSpacing: '-1.5px' }}>SİNE</span>
        <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: proSize || '22px', fontWeight: '900', marginLeft: '4px' }}>PRO</span>
    </div>
  );

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 25px; padding: 30px 5%; }
        .hover-effect { transition: 0.4s ease; cursor: pointer; border-radius: 15px; overflow: hidden; border: 1px solid #333; height: 270px; position: relative; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 0 25px rgba(102, 252, 241, 0.4); }
        .horizontal-scroll { display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; padding: 10px 0; }
        .section-title { color: #66FCF1; padding: 0 10px; margin-top: 30px; font-size: 20px; letter-spacing: 1px; border-left: 4px solid #66FCF1; margin-left: 5%; font-weight: 900; }
        .nav-btn { background: none; border: none; font-weight: bold; cursor: pointer; color: #45A29E; transition: 0.3s; }
        .nav-btn:hover { color: #66FCF1; }
        .dropdown { position: absolute; top: 60px; right: 0; background: #1F2833; border: 1px solid #45A29E; border-radius: 12px; width: 200px; z-index: 500; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .dropdown-item { padding: 12px 20px; color: #ccc; cursor: pointer; transition: 0.2s; font-size: 14px; }
        .dropdown-item:hover { background: rgba(102,252,241,0.1); color: #66FCF1; }
        .input-pro { width: 100%; background: #0B0C10; border: 1px solid #45A29E; padding: 12px; borderRadius: 10px; color: white; marginBottom: 15px; outline: none; }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <SineProLogo onClick={() => setViewMode("home")} />
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); }} className="nav-btn" style={{ color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); }} className="nav-btn" style={{ color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E' }}>DİZİLER</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ background: 'rgba(102,252,241,0.1)', border: '1px solid #45A29E', color: '#66FCF1', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                @{currentUser.username} ▼
              </button>
              {showUserMenu && (
                <div className="dropdown">
                  <div className="dropdown-item" onClick={() => { setViewMode("profile"); setShowUserMenu(false); }}>👤 Profilim</div>
                  <div className="dropdown-item" onClick={() => { setViewMode("favorites"); setShowUserMenu(false); }}>❤️ Listem</div>
                  <div className="dropdown-item" onClick={() => { setViewMode("settings"); setShowUserMenu(false); }}>⚙️ Ayarlar</div>
                  <div className="dropdown-item" style={{ color: '#FF4B2B' }} onClick={handleLogout}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '8px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* GİRİŞ PANELİ */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '380px', border: '1px solid #66FCF1' }}>
            <SineProLogo style={{ justifyContent: 'center', marginBottom: '25px' }} />
            <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #333' }}>
              <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: authMode === "login" ? '#66FCF1' : '#555', borderBottom: authMode === "login" ? '2px solid #66FCF1' : 'none', cursor: 'pointer' }}>GİRİŞ</button>
              <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: authMode === "register" ? '#66FCF1' : '#555', borderBottom: authMode === "register" ? '2px solid #66FCF1' : 'none', cursor: 'pointer' }}>KAYIT</button>
            </div>
            {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" className="input-pro" onChange={(e) => setFormData({...formData, username: e.target.value})} />}
            <input type="email" placeholder="E-posta" className="input-pro" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <input type="password" placeholder="Şifre" className="input-pro" onChange={(e) => setFormData({...formData, password: e.target.value})} />
            <button onClick={handleAuth} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{authMode === "login" ? "GİRİŞ YAP" : "KAYIT OL"}</button>
            <p onClick={() => setShowLogin(false)} style={{ textAlign: 'center', color: '#555', marginTop: '15px', cursor: 'pointer' }}>Vazgeç</p>
          </div>
        </div>
      )}

      {/* PROFİL SAYFASI */}
      {viewMode === "profile" && (
        <div style={{ padding: '50px 10%', textAlign: 'center' }}>
          <div style={{ width: '100px', height: '100px', background: '#66FCF1', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#0B0C10' }}>{currentUser?.username[0].toUpperCase()}</div>
          <h1 style={{ color: '#66FCF1' }}>@{currentUser?.username}</h1>
          <p style={{ color: '#ccc' }}>Üyelik Tarihi: {currentUser?.joined}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '40px' }}>
            <div style={{ background: '#1F2833', padding: '20px', borderRadius: '15px', minWidth: '150px' }}>
              <h2 style={{ color: '#66FCF1', margin: 0 }}>{favorites.length}</h2>
              <p style={{ color: '#ccc', margin: 0 }}>Favori Film</p>
            </div>
          </div>
        </div>
      )}

      {/* AYARLAR SAYFASI */}
      {viewMode === "settings" && (
        <div style={{ padding: '50px 10%', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ color: '#66FCF1' }}>Hesap Ayarları</h1>
          <div style={{ background: '#1F2833', padding: '30px', borderRadius: '20px', marginTop: '20px' }}>
            <label style={{ color: '#ccc', display: 'block', marginBottom: '10px' }}>Kullanıcı Adını Değiştir</label>
            <input type="text" defaultValue={currentUser?.username} className="input-pro" />
            <button style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' }}>Güncelle</button>
            <hr style={{ margin: '30px 0', borderColor: '#333' }} />
            <button style={{ color: '#FF4B2B', background: 'none', border: '1px solid #FF4B2B', padding: '10px 20px', borderRadius: '10px' }} onClick={() => { if(confirm("Hesabını silmek istediğine emin misin?")) handleLogout(); }}>Hesabımı Sil</button>
          </div>
        </div>
      )}

      {/* ANA SAYFA İÇERİĞİ */}
      {viewMode === "home" && (
        <>
          <div style={{ padding: '10px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button onClick={() => setSelectedGenre(null)} style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümü</button>
            {genres.map(g => (
              <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '8px 20px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
            ))}
          </div>

          <h3 className="section-title">ÖNE ÇIKANLAR</h3>
          <div style={{ padding: '0 5%' }}>
            <div className="horizontal-scroll" ref={mainNewScrollRef}>
              {newReleases.map((item) => (
                <div key={item.id} onClick={() => setSelectedItem(item)} style={{ minWidth: '200px', cursor: 'pointer' }}>
                  <div className="hover-effect">
                    <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: '#66FCF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>★ {item.vote_average?.toFixed(1)}</div>
                  </div>
                  <p style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '13px' }}>{item.title || item.name}</p>
                </div>
              ))}
            </div>
          </div>

          <h3 className="section-title">{selectedGenre ? genres.find(g => g.id === selectedGenre)?.name.toUpperCase() : "KEŞFET"}</h3>
          <div className="movie-grid">
            {items.map((item) => (
              <div key={item.id} onClick={() => setSelectedItem(item)} style={{ textAlign: 'center' }}>
                <div className="hover-effect">
                  <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: '#66FCF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>★ {item.vote_average?.toFixed(1)}</div>
                </div>
                <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{item.title || item.name}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAVORİLER SAYFASI */}
      {viewMode === "favorites" && (
        <div style={{ padding: '20px 0' }}>
          <h1 className="section-title">FAVORİ LİSTEM</h1>
          <div className="movie-grid">
            {favorites.map((item) => (
              <div key={item.id} onClick={() => setSelectedItem(item)} style={{ textAlign: 'center' }}>
                <div className="hover-effect">
                  <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{item.title || item.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAY MODALI (DETAYLI) */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: '#0B0C10', zIndex: 1000, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ width: '100%', height: '60vh', backgroundImage: `linear-gradient(to bottom, transparent, #0B0C10), url(${getImgUrl(selectedItem.backdrop_path, 'original')})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '0 10% 50px' }}>
            <h1 style={{ fontSize: '60px', color: '#66FCF1', fontWeight: '900' }}>{selectedItem.title || selectedItem.name}</h1>
          </div>
          <div style={{ padding: '0 10%', display: 'flex', gap: '50px' }}>
             <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '300px', borderRadius: '20px' }} />
             <div>
                <p style={{ fontSize: '20px', color: '#ccc', lineHeight: '1.8' }}>{selectedItem.overview}</p>
                <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                  <button onClick={() => {
                    const exists = favorites.find(f => f.id === selectedItem.id);
                    let updated;
                    if(exists) updated = favorites.filter(f => f.id !== selectedItem.id);
                    else updated = [...favorites, selectedItem];
                    setFavorites(updated);
                    localStorage.setItem("sinepro_favs", JSON.stringify(updated));
                  }} style={{ background: '#66FCF1', color: '#0B0C10', padding: '15px 40px', borderRadius: '30px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    {favorites.find(f => f.id === selectedItem.id) ? "LİSTEDEN ÇIKAR" : "LİSTEME EKLE"}
                  </button>
                  <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', color: '#66FCF1', border: '2px solid #66FCF1', padding: '15px 40px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>KAPAT</button>
                </div>
             </div>
          </div>
        </div>
      )}

      <SpeedInsights />
    </main>
  );
}