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
      setSimilar(similarRes.data.results?.slice(0, 12) || []);
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
        
        /* KAYDIRILABİLİR ALAN İÇİN ÖZEL CSS */
        .horizontal-scroll {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding: 20px 5px;
          scroll-behavior: smooth;
          scrollbar-width: none; /* Firefox */
        }
        .horizontal-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari */
        }
        .similar-item {
          min-width: 150px;
          flex-shrink: 0;
          text-align: center;
        }
      ` }} />

      {/* NAVBAR */}
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
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: '#1F2833', color: '#66FCF1', border: '1px solid #45A29E', padding: '8px 12px', borderRadius: '10px', outline: 'none', cursor: 'pointer', fontSize: '13px' }}>
            <option value="popularity.desc">🔥 Trendler</option>
            <option value="vote_average.desc">⭐ Puan</option>
            <option value="revenue.desc">💰 Gişe</option>
          </select>
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
        </div>
      </nav>

      {/* ANA LİSTE */}
      <div className="movie-grid">
        {(viewMode === "home" ? items : favorites).map((item, idx) => (
          <div key={`${item.id}-${idx}`} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
            <div className="hover-effect" style={{ borderRadius: '15px', overflow: 'hidden', border: '1px solid #333', height: '270px', position: 'relative' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: '#66FCF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>★ {item.vote_average?.toFixed(1)}</div>
            </div>
            <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px' }}>{item.title || item.name}</p>
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
          
          <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 5% 100px' }}>
             <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
                <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '280px', borderRadius: '15px', border: '1px solid #333' }} alt="" />
                <div style={{ flex: 1, minWidth: '300px' }}>
                   <h1 style={{ fontSize: '44px', fontWeight: '900', color: '#66FCF1' }}>{selectedItem.title || selectedItem.name}</h1>
                   <p style={{ fontSize: '18px', opacity: 0.8, lineHeight: '1.6' }}>{selectedItem.overview}</p>
                </div>
             </div>

             {/* SAĞA KAYDIRILABİLİR BENZER FİLMLER */}
             <div style={{ marginTop: '60px' }}>
                <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>BUNLARI DA SEVEBİLİRSİNİZ</h3>
                <div className="horizontal-scroll">
                   {similar.map((s, idx) => (
                     <div 
                        key={idx} 
                        onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); document.getElementById('modal-content')?.scrollTo(0,0); }} 
                        className="similar-item hover-effect"
                     >
                        <div style={{ borderRadius: '10px', overflow: 'hidden', height: '220px', border: '1px solid #222' }}>
                           <img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                        <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 'bold', opacity: 0.9 }}>{s.title || s.name}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* BAĞIŞ BUTONU */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}><span>💎 DESTEK OL</span></a>
      </div>

    </main>
  );
}