"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';

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
  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  
  const similarScrollRef = useRef<HTMLDivElement>(null);
  const mainNewScrollRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 12, name: "Macera" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

  const currentCategoryName = useMemo(() => {
    if (selectedGenre === null) return "TÜMÜ";
    const genre = genres.find(g => g.id === selectedGenre);
    return genre ? genre.name.toUpperCase() : "KEŞFET";
  }, [selectedGenre, genres]);

  useEffect(() => {
    if (!mounted || searchQuery || viewMode === "favorites") return;
    const interval = setInterval(() => {
      if (mainNewScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = mainNewScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          mainNewScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          mainNewScrollRef.current.scrollTo({ left: scrollLeft + 200, behavior: 'smooth' });
        }
      }
    }, 3000); 
    return () => clearInterval(interval);
  }, [mounted, newReleases, searchQuery, viewMode]);

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sinepro_favs");
    if (saved) setFavorites(JSON.parse(saved));
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

      if (!searchQuery) {
        const type = contentType === "movie" ? "now_playing" : "on_the_air";
        const newRes = await axios.get(`https://api.themoviedb.org/3/${contentType}/${type}?language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } });
        setNewReleases(newRes.data.results || []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchExtraDetails = async (id: number) => {
    try {
      const [castRes, similarRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/credits?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/similar?language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } })
      ]);
      setCast(castRes.data.cast?.slice(0, 10) || []);
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

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      
      {/* ARKA PLAN IŞILTI */}
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
        
        /* 💖 KALP */
        .fav-badge { 
          position: absolute; 
          top: 8px; 
          right: 8px; 
          width: 24px; 
          height: 24px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 10; 
          transition: 0.3s; 
          cursor: pointer; 
          font-size: 18px;
          filter: drop-shadow(0 0 5px rgba(0,0,0,0.8));
        }

        /* 🎯 ⭐ YENİ: KÜÇÜK, BEYAZ VE NET PUAN STİLİ */
        .rating-badge { 
          position: absolute; 
          bottom: 10px; 
          left: 10px; 
          background: rgba(255,255,255,0.9); /* Beyaz arka plan */
          color: #0B0C10; /* Siyah yazı */
          padding: 2px 6px; 
          borderRadius: 4px; 
          fontSize: 5px; /* Biraz büyütüldü */
          fontWeight: 900; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 0 8px rgba(102,252,241,0.5))' }} onClick={() => window.location.reload()}>
             <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900', letterSpacing: '-1.5px', textShadow: '0 0 10px rgba(102, 252, 241, 0.6)' }}>SİNE</span>
             <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: '22px', fontWeight: '900', marginLeft: '4px', boxShadow: '0 0 15px rgba(102, 252, 241, 0.8)' }}>PRO</span>
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
            <option value="vote_average.desc">⭐ En Yüksek Puan</option>
            <option value="primary_release_date.desc">📅 En Yeniler</option>
            <option value="revenue.desc">💰 Gişe Rekortmenleri</option>
            <option value="vote_count.desc">🗣️ Çok Oylananlar</option>
          </select>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
        </div>
      </nav>

      {/* KATEGORİLER */}
      {viewMode === "home" && !searchQuery && (
        <div style={{ padding: '10px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
          <button onClick={() => setSelectedGenre(null)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümü</button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
          ))}
        </div>
      )}

      {/* YENİ VİZYONDAKİLER */}
      {viewMode === "home" && !searchQuery && newReleases.length > 0 && (
        <div style={{ position: 'relative', marginTop: '20px', zIndex: 1 }}>
          <h3 className="section-title">YENİ VİZYONA GİRENLER</h3>
          <div style={{ position: 'relative', padding: '0 5%' }}>
            <button className="side-nav-btn" style={{ left: '1%' }} onClick={() => handleScroll(mainNewScrollRef, 'left')}>❮</button>
            <button className="side-nav-btn" style={{ right: '1%' }} onClick={() => handleScroll(mainNewScrollRef, 'right')}>❯</button>
            <div className="horizontal-scroll" ref={mainNewScrollRef}>
              {newReleases.map((item) => (
                <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ minWidth: '160px', textAlign: 'center', cursor: 'pointer' }}>
                  <div className="hover-effect" style={{ borderRadius: '12px', overflow: 'hidden', height: '240px' }}>
                    <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <div onClick={(e) => toggleFavorite(e, item)} className="fav-badge">
                       {favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}
                    </div>
                    <div className="rating-badge">★ {item.vote_average?.toFixed(1)}</div>
                  </div>
                  <p style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <h3 className="section-title">{currentCategoryName}</h3>

      {/* ANA LİSTE */}
      <div className="movie-grid">
        {(viewMode === "home" ? items : favorites).map((item, idx) => (
          <div key={`${item.id}-${idx}`} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
            <div className="hover-effect" style={{ borderRadius: '15px', overflow: 'hidden', border: '1px solid #333', height: '270px' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <div onClick={(e) => toggleFavorite(e, item)} className="fav-badge">
                {favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}
              </div>
              <div className="rating-badge">★ {item.vote_average?.toFixed(1)}</div>
            </div>
            <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
          </div>
        ))}
      </div>

      {/* MODAL VE DİĞERLERİ */}
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
                <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '280px', borderRadius: '15px', border: '1px solid #333' }} alt="" />
                <div style={{ flex: 1, minWidth: '300px', paddingTop: '40px' }}>
                   <h1 style={{ fontSize: '44px', fontWeight: '900', color: '#66FCF1' }}>{selectedItem.title || selectedItem.name}</h1>
                   <p style={{ color: '#66FCF1', fontSize: '20px' }}>★ {selectedItem.vote_average?.toFixed(1)}</p>
                   <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '18px' }}>{selectedItem.overview}</p>
                </div>
             </div>
             <div style={{ marginTop: '80px', position: 'relative' }}>
                <h3 style={{ color: '#66FCF1', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>BUNLARI DA SEVEBİLİRSİNİZ</h3>
                <button className="side-nav-btn" style={{ left: '-50px' }} onClick={() => handleScroll(similarScrollRef, 'left')}>❮</button>
                <button className="side-nav-btn" style={{ right: '-50px' }} onClick={() => handleScroll(similarScrollRef, 'right')}>❯</button>
                <div className="horizontal-scroll" ref={similarScrollRef}>
                   {similar.map((s) => (
                     <div key={s.id} onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); document.getElementById('modal-content')?.scrollTo(0,0); }} style={{ minWidth: '160px', textAlign: 'center', cursor: 'pointer' }}>
                        <div className="hover-effect" style={{ borderRadius: '12px', overflow: 'hidden', height: '240px' }}>
                           <img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                        <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title || s.name}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* BAĞIŞ BUTONU */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" className="donate-btn" style={{ background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(102, 252, 241, 0.3)', transition: '0.3s' }}>
          <span>💎 DESTEK OL</span>
        </a>
      </div>
    </main>
  );
}