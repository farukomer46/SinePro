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
  const [similar, setSimilar] = useState<any[]>([]);
  
  // 🔐 GİRİŞ & ÜYELİK SİSTEMİ
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [comments, setComments] = useState<any>({}); 
  const [newComment, setNewComment] = useState("");
  const [commentRating, setCommentRating] = useState<number>(10);

  const mainNewScrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

  const getGenreName = () => {
    const genre = genres.find(g => g.id === selectedGenre);
    return genre ? genre.name.toUpperCase() : "TÜMÜ";
  };

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  // AUTH İŞLEMLERİ
  const handleAuth = () => {
    if (authMode === "register") {
      if (!formData.username || !formData.email || !formData.password) return alert("Alanları doldurun!");
      const newUser = { username: formData.username, email: formData.email };
      setUser(newUser);
      localStorage.setItem("sinepro_session", JSON.stringify(newUser));
    } else {
      if (!formData.email || !formData.password) return alert("E-posta ve şifre girin!");
      const mockUser = { username: formData.email.split('@')[0], email: formData.email };
      setUser(mockUser);
      localStorage.setItem("sinepro_session", JSON.stringify(mockUser));
    }
    setShowLogin(false);
  };

  const calculateProRating = (itemID: number) => {
    const itemComments = comments[itemID] || [];
    const ratedComments = itemComments.filter((c: any) => c.rating);
    if (ratedComments.length === 0) return null;
    const totalScore = ratedComments.reduce((sum: number, c: any) => sum + c.rating, 0);
    return (totalScore / ratedComments.length).toFixed(1);
  };

  useEffect(() => {
    setMounted(true);
    const savedFavs = localStorage.getItem("sinepro_favs");
    const savedComments = localStorage.getItem("sinepro_comments");
    const session = localStorage.getItem("sinepro_session");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedComments) setComments(JSON.parse(savedComments));
    if (session) setUser(JSON.parse(session));
  }, []);

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

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  if (!mounted) return null;

  const SineProLogo = ({ style, fontSize, proSize, onClick }: any) => (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 0 10px rgba(102, 252, 241, 0.6))', cursor: 'pointer', ...style }}>
        <span style={{ color: '#66FCF1', fontSize: fontSize || '28px', fontWeight: '900', letterSpacing: '-1.5px', textShadow: '0 0 15px rgba(102, 252, 241, 0.8)' }}>SİNE</span>
        <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: proSize || '22px', fontWeight: '900', marginLeft: '4px', boxShadow: '0 0 20px rgba(102, 252, 241, 0.9)' }}>PRO</span>
    </div>
  );

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 25px; padding: 30px 5%; position: relative; z-index: 1; }
        .hover-effect { transition: 0.4s ease; cursor: pointer; position: relative; border-radius: 15px; overflow: hidden; border: 1px solid #333; height: 270px; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 0 25px rgba(102, 252, 241, 0.4); }
        .horizontal-scroll { display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; padding: 10px 0; }
        .horizontal-scroll::-webkit-scrollbar { display: none; }
        .nav-link { background: none; border: none; font-weight: bold; cursor: pointer; }
        .user-menu-btn { background: rgba(102,252,241,0.1); border: 1px solid #45A29E; color: #66FCF1; padding: 8px 15px; borderRadius: 20px; cursor: pointer; fontWeight: bold; display: flex; align-items: center; gap: 8px; transition: 0.3s; }
        .user-menu-btn:hover { background: rgba(102,252,241,0.2); }
        .dropdown { position: absolute; top: 55px; right: 0; background: #1F2833; border: 1px solid #45A29E; border-radius: 12px; padding: 8px; width: 180px; z-index: 500; box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: fadeIn 0.2s ease; }
        .dropdown-item { padding: 10px; color: #ccc; cursor: pointer; border-radius: 8px; transition: 0.2s; font-size: 14px; }
        .dropdown-item:hover { background: rgba(102,252,241,0.1); color: #66FCF1; }
        .rating-badge-pro { position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.8); color: #66FCF1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <SineProLogo onClick={() => window.location.reload()} />
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); }} className="nav-link" style={{ color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); }} className="nav-link" style={{ color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E' }}>DİZİLER</button>
            <button onClick={() => setViewMode("favorites")} className="nav-link" style={{ color: viewMode === "favorites" ? '#66FCF1' : '#45A29E' }}>LİSTEM</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
          
          {user ? (
            <div style={{ position: 'relative' }}>
              <button className="user-menu-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span>@{user.username}</span>
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {showUserMenu && (
                <div className="dropdown">
                  <div className="dropdown-item">👤 Profilim</div>
                  <div className="dropdown-item" onClick={() => setViewMode("favorites")}>❤️ Favorilerim</div>
                  <div className="dropdown-item">⚙️ Ayarlar</div>
                  <div style={{ height: '1px', background: '#333', margin: '5px 0' }} />
                  <div className="dropdown-item" style={{ color: '#FF4B2B' }} onClick={() => { setUser(null); localStorage.removeItem("sinepro_session"); }}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '8px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* GİRİŞ MODALI (HD CEHENNEMİ STYLE) */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '380px', border: '1px solid #66FCF1', position: 'relative', animation: 'fadeIn 0.3s ease' }}>
            <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            <SineProLogo style={{ justifyContent: 'center', marginBottom: '25px' }} fontSize="32px" proSize="26px" />
            
            <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #333' }}>
              <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: authMode === "login" ? '#66FCF1' : '#555', borderBottom: authMode === "login" ? '2px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>GİRİŞ</button>
              <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', color: authMode === "register" ? '#66FCF1' : '#555', borderBottom: authMode === "register" ? '2px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>KAYIT</button>
            </div>

            {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px', outline: 'none' }} />}
            <input type="email" placeholder="E-posta" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '15px', outline: 'none' }} />
            <input type="password" placeholder="Şifre" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '20px', outline: 'none' }} />
            
            <button onClick={handleAuth} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
              {authMode === "login" ? "GİRİŞ YAP" : "HESAP OLUŞTUR"}
            </button>
          </div>
        </div>
      )}

      {/* KATEGORİLER (AYNI KALDI) */}
      {viewMode === "home" && !searchQuery && (
        <div style={{ padding: '10px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
          <button onClick={() => setSelectedGenre(null)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümü</button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
          ))}
        </div>
      )}

      {/* ÖNE ÇIKANLAR (AYNI KALDI) */}
      {viewMode === "home" && !searchQuery && newReleases.length > 0 && (
        <div style={{ position: 'relative', marginTop: '20px', zIndex: 1 }}>
          <h3 className="section-title">ÖNE ÇIKANLAR</h3>
          <div style={{ position: 'relative', padding: '0 5%' }}>
            <div className="horizontal-scroll" ref={mainNewScrollRef}>
              {newReleases.map((item) => (
                <div key={item.id} onClick={() => { setSelectedItem(item); }} style={{ minWidth: '200px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                  <div className="hover-effect">
                    <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
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

      {/* ANA LİSTE (AYNI KALDI) */}
      <div className="movie-grid">
        {(viewMode === "home" ? items : favorites).map((item) => (
          <div key={item.id} onClick={() => { setSelectedItem(item); }} style={{ textAlign: 'center' }}>
            <div className="hover-effect">
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
            </div>
            <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
          </div>
        ))}
      </div>

      <SpeedInsights />
    </main>
  );
}