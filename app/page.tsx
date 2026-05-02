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
  const [viewMode, setViewMode] = useState<"home" | "favorites">("home");
  
  // 🔐 GELİŞMİŞ GİRİŞ SİSTEMİ STATE'LERİ
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
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

  // AUTH FONKSİYONLARI
  const handleAuth = () => {
    if (authMode === "register") {
      if (!formData.username || !formData.email || !formData.password) return alert("Lütfen tüm alanları doldurun!");
      const newUser = { username: formData.username, email: formData.email };
      setUser(newUser);
      localStorage.setItem("sinepro_session", JSON.stringify(newUser));
    } else {
      if (!formData.email || !formData.password) return alert("E-posta ve şifre gereklidir!");
      const mockUser = { username: formData.email.split('@')[0], email: formData.email };
      setUser(mockUser);
      localStorage.setItem("sinepro_session", JSON.stringify(mockUser));
    }
    setShowLogin(false);
    setFormData({ email: "", password: "", username: "" });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("sinepro_session");
    setShowUserMenu(false);
  };

  useEffect(() => {
    setMounted(true);
    const savedFavs = localStorage.getItem("sinepro_favs");
    const session = localStorage.getItem("sinepro_session");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (session) setUser(JSON.parse(session));
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
        const carouselUrl = `https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR`;
        const resCarousel = await axios.get(carouselUrl, { headers: { Authorization: API_TOKEN } });
        setNewReleases(resCarousel.data.results || []);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  if (!mounted) return null;

  const SineProLogo = ({ style, fontSize, proSize, onClick }: any) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 0 10px rgba(102, 252, 241, 0.6))', cursor: 'pointer', ...style }}>
        <span style={{ color: '#66FCF1', fontSize: fontSize || '28px', fontWeight: '900', letterSpacing: '-1.5px' }}>SİNE</span>
        <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: proSize || '22px', fontWeight: '900', marginLeft: '4px' }}>PRO</span>
    </div>
  );

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 25px; padding: 30px 5%; z-index: 1; position: relative; }
        .hover-effect { transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; border-radius: 15px; overflow: hidden; border: 1px solid #333; height: 270px; position: relative; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 10px 30px rgba(102, 252, 241, 0.3); border-color: #66FCF1; }
        .input-pro { width: 100%; background: #0B0C10; border: 1px solid #45A29E; padding: 12px; borderRadius: 10px; color: white; marginBottom: 15px; outline: none; transition: 0.3s; }
        .input-pro:focus { border-color: #66FCF1; box-shadow: 0 0 10px rgba(102, 252, 241, 0.3); }
        .user-dropdown { position: absolute; top: 60px; right: 0; background: #1F2833; border: 1px solid #45A29E; border-radius: 12px; padding: 10px; width: 180px; z-index: 200; box-shadow: 0 10px 25px rgba(0,0,0,0.5); animation: fadeIn 0.3s ease; }
        .dropdown-item { padding: 10px; color: #ccc; cursor: pointer; border-radius: 8px; transition: 0.2s; display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .dropdown-item:hover { background: rgba(102,252,241,0.1); color: #66FCF1; }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', backdropFilter: 'blur(15px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <SineProLogo onClick={() => window.location.reload()} />
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); }} style={{ color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); }} style={{ color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>DİZİLER</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none', width: '200px' }} />
          
          {user ? (
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowUserMenu(!showUserMenu)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(102,252,241,0.1)', padding: '5px 15px', borderRadius: '20px', border: '1px solid #45A29E' }}>
                <span style={{ color: '#66FCF1', fontWeight: 'bold' }}>@{user.username}</span>
                <span style={{ fontSize: '10px' }}>▼</span>
              </div>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="dropdown-item">👤 Profilim</div>
                  <div className="dropdown-item" onClick={() => setViewMode("favorites")}>❤️ Listem</div>
                  <div className="dropdown-item">⚙️ Ayarlar</div>
                  <div style={{ height: '1px', background: '#333', margin: '5px 0' }} />
                  <div className="dropdown-item" style={{ color: '#FF4B2B' }} onClick={handleLogout}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '8px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>ÜYE GİRİŞİ</button>
          )}
        </div>
      </nav>

      {/* GİRİŞ / KAYIT PANELİ (HD FİLM CEHENNEMİ STYLE) */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '400px', border: '1px solid #66FCF1', position: 'relative' }}>
            <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            
            <SineProLogo style={{ justifyContent: 'center', marginBottom: '30px' }} fontSize="32px" proSize="26px" />
            
            <div style={{ display: 'flex', marginBottom: '25px', borderBottom: '1px solid #333' }}>
              <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: authMode === "login" ? '#66FCF1' : '#555', borderBottom: authMode === "login" ? '2px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>GİRİŞ YAP</button>
              <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: authMode === "register" ? '#66FCF1' : '#555', borderBottom: authMode === "register" ? '2px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>KAYIT OL</button>
            </div>

            {authMode === "register" && (
              <input type="text" placeholder="Kullanıcı Adı" className="input-pro" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
            )}
            <input type="email" placeholder="E-posta Adresi" className="input-pro" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <input type="password" placeholder="Şifre" className="input-pro" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />

            <button onClick={handleAuth} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '10px' }}>
              {authMode === "login" ? "OTURUM AÇ" : "KAYDI TAMAMLA"}
            </button>
            
            <p style={{ color: '#555', fontSize: '12px', marginTop: '20px', textAlign: 'center' }}>
              Giriş yaparak SinePro <span style={{ color: '#66FCF1' }}>Kullanım Şartlarını</span> kabul etmiş olursunuz.
            </p>
          </div>
        </div>
      )}

      {/* İÇERİK */}
      <div style={{ padding: '20px 5%' }}>
        <h3 style={{ color: '#66FCF1', fontWeight: '900', borderLeft: '4px solid #66FCF1', paddingLeft: '15px', fontSize: '24px' }}>
          {viewMode === "home" ? "SİNEPRO KEŞFET" : "FAVORİ LİSTEM"}
        </h3>
        <div className="movie-grid">
          {(viewMode === "home" ? items : favorites).map((item) => (
            <div key={item.id} className="hover-effect">
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: '#66FCF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>★ {item.vote_average?.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>

      <SpeedInsights />
    </main>
  );
}