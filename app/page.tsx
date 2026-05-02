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

  // 🎯 OTOMATİK KAYDIRMA
  useEffect(() => {
    if (!mounted || searchQuery || viewMode === "favorites") return;
    const interval = setInterval(() => {
      if (mainNewScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = mainNewScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          mainNewScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          mainNewScrollRef.current.scrollTo({ left: scrollLeft + 220, behavior: 'smooth' });
        }
      }
    }, 3000); 
    return () => clearInterval(interval);
  }, [mounted, newReleases, searchQuery, viewMode]);

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

  const addComment = () => {
    if (!newComment.trim() || !user) return;
    const itemID = selectedItem.id;
    const commentObj = {
      id: Date.now(),
      user: user.username,
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
    const savedFavs = localStorage.getItem("sinepro_favs");
    const savedComments = localStorage.getItem("sinepro_comments");
    const session = localStorage.getItem("sinepro_session");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedComments) setComments(JSON.parse(savedComments));
    if (session) setUser(JSON.parse(session));
  }, []);

  useEffect(() => {
    if (mounted) document.body.style.overflow = (selectedItem || showLogin) ? 'hidden' : 'unset';
  }, [selectedItem, showLogin, mounted]);

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
        .side-nav-btn { position: absolute; top: 120px; transform: translateY(-50%); background: rgba(0,0,0,0.8); color: #66FCF1; border: 1px solid #333; width: 40px; height: 70px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 4px; }
        .nav-link { background: none; border: none; font-weight: bold; cursor: pointer; }
        .dropdown { position: absolute; top: 55px; right: 0; background: #1F2833; border: 1px solid #45A29E; border-radius: 12px; padding: 8px; width: 180px; z-index: 500; box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: fadeIn 0.2s ease; }
        .dropdown-item { padding: 10px; color: #ccc; cursor: pointer; border-radius: 8px; transition: 0.2s; font-size: 14px; }
        .dropdown-item:hover { background: rgba(102,252,241,0.1); color: #66FCF1; }
        .rating-badge-pro { position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.8); color: #66FCF1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        .fav-heart-btn { position: absolute; top: 10px; right: 10px; background: transparent; width: 32px; height: 32px; borderRadius: 50%; display: flex; alignItems: center; justifyContent: center; z-index: 10; transition: 0.3s; font-size: 22px; text-shadow: 0 0 8px rgba(0,0,0,1); }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <SineProLogo onClick={() => window.location.reload()} />
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); setSelectedGenre(null); }} className="nav-link" style={{ color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); setSelectedGenre(null); }} className="nav-link" style={{ color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E' }}>DİZİLER</button>
            <button onClick={() => setViewMode("favorites")} className="nav-link" style={{ color: viewMode === "favorites" ? '#66FCF1' : '#45A29E' }}>LİSTEM ({favorites.length})</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
          
          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ background: 'rgba(102,252,241,0.1)', border: '1px solid #45A29E', color: '#66FCF1', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                <span>@{user.username}</span>
                <span style={{ fontSize: '10px', marginLeft: '8px' }}>▼</span>
              </button>
              {showUserMenu && (
                <div className="dropdown">
                  <div className="dropdown-item">👤 Profilim</div>
                  <div className="dropdown-item" onClick={() => {setViewMode("favorites"); setShowUserMenu(false);}}>❤️ Favorilerim</div>
                  <div className="dropdown-item" onClick={() => { setUser(null); localStorage.removeItem("sinepro_session"); setShowUserMenu(false); }} style={{ color: '#FF4B2B' }}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '8px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* GİRİŞ MODALI */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '380px', border: '1px solid #66FCF1', position: 'relative' }}>
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
              {authMode === "login" ? "GİRİŞ YAP" : "KAYIT OL"}
            </button>
          </div>
        </div>
      )}

      {/* KATEGORİLER */}
      {viewMode === "home" && !searchQuery && (
        <div style={{ padding: '10px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
          <button onClick={() => setSelectedGenre(null)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümü</button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
          ))}
        </div>
      )}

      {/* ÖNE ÇIKANLAR */}
      {viewMode === "home" && !searchQuery && newReleases.length > 0 && (
        <div style={{ position: 'relative', marginTop: '20px', zIndex: 1 }}>
          <h3 className="section-title">ÖNE ÇIKANLAR</h3>
          <div style={{ position: 'relative', padding: '0 5%' }}>
            <button className="side-nav-btn" style={{ left: '1%' }} onClick={() => handleScroll(mainNewScrollRef, 'left')}>❮</button>
            <button className="side-nav-btn" style={{ right: '1%' }} onClick={() => handleScroll(mainNewScrollRef, 'right')}>❯</button>
            <div className="horizontal-scroll" ref={mainNewScrollRef}>
              {newReleases.map((item) => (
                <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ minWidth: '200px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                  <div className="hover-effect">
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

      {/* ANA LİSTE */}
      <div className="movie-grid">
        {(viewMode === "home" ? items : favorites).map((item, idx) => (
          <div key={`${item.id}-${idx}`} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
            <div className="hover-effect">
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

      {/* DETAY MODALI */}
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

             {/* YORUMLAR */}
             <div style={{ marginTop: '80px' }}>
                <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '10px' }}>TOPLULUK YORUMLARI</h3>
                <div style={{ margin: '30px 0', background: '#1F2833', padding: '20px', borderRadius: '15px', border: '1px solid #45A29E' }}>
                   <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                     <input type="text" placeholder={user ? "Düşüncelerini yaz..." : "Yorum yapmak için giriş yapmalısın."} value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={!user} style={{ flex: 1, background: '#0B0C10', border: '1px solid #45A29E', padding: '12px 20px', borderRadius: '10px', color: 'white', outline: 'none' }} />
                     <select value={commentRating} onChange={(e) => setCommentRating(Number(e.target.value))} disabled={!user} style={{ background: '#0B0C10', color: '#66FCF1', border: '1px solid #45A29E', padding: '0 15px', borderRadius: '10px', outline: 'none' }}>
                        {[10,9,8,7,6,5,4,3,2,1].map(r => <option key={r} value={r}>{r} Puan</option>)}
                     </select>
                   </div>
                   <button onClick={addComment} disabled={!user} style={{ background: '#66FCF1', color: '#0B0C10', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', float: 'right', opacity: user ? 1 : 0.5 }}>GÖNDER</button>
                   <div style={{ clear: 'both' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {(comments[selectedItem.id] || []).map((c: any) => (
                     <div key={c.id} className="comment-box">
                        {user?.username === c.user && <button onClick={() => deleteComment(selectedItem.id, c.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}>❌</button>}
                        <div style={{ marginBottom: '5px' }}>
                          <span style={{ color: '#66FCF1', fontWeight: 'bold' }}>@{c.user}</span>
                          <span style={{ marginLeft: '10px', color: '#45A29E', fontSize: '12px' }}>Puan: {c.rating}/10</span>
                        </div>
                        <p style={{ margin: 0, color: '#ccc' }}>{c.text}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', padding: '12px 25px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(102, 252, 241, 0.5)' }}>💎 DESTEK OL</a>
      </div>
      <SpeedInsights />
    </main>
  );
}