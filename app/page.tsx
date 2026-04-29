"use client";

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [contentType, setContentType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"home" | "favorites">("home");
  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

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
    if (mounted) {
      document.body.style.overflow = selectedItem ? 'hidden' : 'unset';
    }
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
    setLoading(true);
    try {
      let baseUrl = "";
      if (searchQuery) {
        baseUrl = `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=`;
      } else {
        baseUrl = `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=200&language=tr-TR&page=`;
      }
      const [res1, res2] = await Promise.all([
        axios.get(`${baseUrl}1`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`${baseUrl}2`, { headers: { Authorization: API_TOKEN } })
      ]);
      setItems([...(res1.data.results || []), ...(res2.data.results || [])]);
    } catch (err) { console.error("Veri hatası:", err); }
    setLoading(false);
  };

  const fetchExtraDetails = async (id: number) => {
    try {
      const [castRes, similarRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/credits?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/similar?language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } })
      ]);
      setCast(castRes.data.cast?.slice(0, 10) || []);
      setSimilar(similarRes.data.results?.slice(0, 8) || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => fetchData(), 400);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .nextjs-static-indicator-container, #nextjs-portal { display: none !important; }
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; padding: 20px; }
        .hover-effect { transition: 0.4s ease; cursor: pointer; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 0 25px rgba(102, 252, 241, 0.4); }
        .donate-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(102, 252, 241, 0.5); }
      ` }} />

      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', backdropFilter: 'blur(15px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => window.location.reload()}>
             <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900' }}>SİNE</span>
             <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: '22px', fontWeight: '900', marginLeft: '4px' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); setSelectedGenre(null); }} style={{ background: 'none', border: 'none', color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); setSelectedGenre(null); }} style={{ background: 'none', border: 'none', color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>DİZİLER</button>
            <button onClick={() => setViewMode("favorites")} style={{ background: 'none', border: 'none', color: viewMode === "favorites" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>LİSTEM ({favorites.length})</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: '#1F2833', color: '#66FCF1', border: '1px solid #45A29E', padding: '8px 12px', borderRadius: '10px', outline: 'none', cursor: 'pointer' }}>
            <option value="popularity.desc">🔥 Trendler</option>
            <option value="vote_average.desc">⭐ Puan</option>
            <option value="primary_release_date.desc">📅 Yeni</option>
            <option value="revenue.desc">💰 Gişe</option>
          </select>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
        </div>
      </nav>

      <div className="movie-grid">
        {(viewMode === "home" ? items : favorites).map((item, idx) => (
          <div key={`${item.id}-${idx}`} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
            <div className="hover-effect" style={{ borderRadius: '15px', overflow: 'hidden', border: '1px solid #333', height: '270px', position: 'relative' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <div onClick={(e) => toggleFavorite(e, item)} style={{ position: 'absolute', top: '10px', right: '10px', background: favorites.find(f => f.id === item.id) ? '#FF4B2B' : 'rgba(0,0,0,0.5)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                {favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}
              </div>
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: '#66FCF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>★ {item.vote_average?.toFixed(1)}</div>
            </div>
            <p style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '14px', color: 'white', opacity: 0.9 }}>{item.title || item.name}</p>
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
                <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '280px', borderRadius: '15px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt="" />
                <div style={{ flex: 1, minWidth: '300px', paddingTop: '40px' }}>
                   <h1 style={{ fontSize: '44px', fontWeight: '900', color: '#66FCF1' }}>{selectedItem.title || selectedItem.name}</h1>
                   <p style={{ color: '#66FCF1', fontSize: '20px', margin: '15px 0' }}>★ {selectedItem.vote_average?.toFixed(1)} • {selectedItem.release_date?.split('-')[0] || selectedItem.first_air_date?.split('-')[0]}</p>
                   <p style={{ color: '#ccc', lineHeight: '1.8', fontSize: '18px' }}>{selectedItem.overview}</p>
                   
                   <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '30px' }}>OYUNCULAR</h3>
                   <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '10px 0' }}>
                      {cast.map((p, i) => (
                        <div key={i} style={{ minWidth: '85px', textAlign: 'center' }}>
                          <img src={getImgUrl(p.profile_path, 'w185')} style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #45A29E' }} alt="" />
                          <p style={{ fontSize: '11px', marginTop: '8px' }}>{p.name}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* DÜZELTİLEN BÖLÜM: BENZER FİLMLER */}
             <div style={{ marginTop: '80px' }}>
                <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '30px', letterSpacing: '1px' }}>BUNLARI DA SEVEBİLİRSİNİZ</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '25px', justifyContent: 'center' }}>
                   {similar.map((s, idx) => (
                     <div 
                        key={idx} 
                        onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); document.getElementById('modal-content')?.scrollTo(0,0); }} 
                        className="hover-effect"
                        style={{ textAlign: 'center' }}
                     >
                        {/* AFİŞ KISMI */}
                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #222', height: '210px' }}>
                           <img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                        {/* YAZI KISMI (AYRI VE MESAFELİ) */}
                        <p style={{ 
                           marginTop: '12px', 
                           fontSize: '13px', 
                           fontWeight: '600', 
                           color: 'white', 
                           opacity: 0.8, 
                           lineHeight: '1.4',
                           display: '-webkit-box',
                           WebkitLineClamp: 2,
                           WebkitBoxOrient: 'vertical',
                           overflow: 'hidden'
                        }}>
                           {s.title || s.name}
                        </p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', transition: '0.3s' }}><span>💎 DESTEK OL</span></a>
      </div>
    </main>
  );
}