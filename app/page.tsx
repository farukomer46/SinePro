"use client";

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { ThemeProvider, useTheme } from "next-themes";

// --- TEMA DEĞİŞTİRME BUTONU ---
function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      style={{ 
        position: 'fixed', top: '15px', right: '15px', zIndex: 10001, 
        padding: '10px', borderRadius: '50%', 
        background: theme === "dark" ? '#1F2833' : '#ffffff',
        border: '2px solid #45A29E', cursor: 'pointer', fontSize: '20px',
        boxShadow: '0 0 15px rgba(102, 252, 241, 0.4)'
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <ThemeToggle />
      <SineProContent />
    </ThemeProvider>
  );
}

function SineProContent() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]); 
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

  const toggleFavorite = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    let updated = favorites.find(f => f.id === item.id) 
      ? favorites.filter(f => f.id !== item.id) 
      : [...favorites, item];
    setFavorites(updated);
    localStorage.setItem("sinepro_favs", JSON.stringify(updated));
  };

  const fetchData = async () => {
    if (!mounted || viewMode === "favorites") return;
    try {
      let url = searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=1`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=200&language=tr-TR&page=1`;
      
      const res = await axios.get(url, { headers: { Authorization: API_TOKEN } });
      setItems(res.data.results || []);
    } catch (err) { console.error(err); }
  };

  const fetchExtraDetails = async (id: number) => {
    try {
      const [castRes, similarRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/credits?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/similar?language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } })
      ]);
      setCast(castRes.data.cast?.slice(0, 10) || []);
      setSimilar(similarRes.data.results?.slice(0, 6) || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', transition: '0.3s' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .movie-card:hover { transform: translateY(-10px); box-shadow: 0 0 20px rgba(102, 252, 241, 0.5); }
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; padding: 20px; }
        .genre-btn:hover { background: #66FCF1 !important; color: #0B0C10 !important; }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)', borderBottom: '1px solid #1F2833', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ color: '#66FCF1', margin: 0, cursor: 'pointer', fontSize: '24px', fontWeight: '900' }} onClick={() => window.location.reload()}>SİNEPRO</h1>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => {setViewMode("home"); setContentType("movie")}} style={{ background: 'none', border: 'none', color: contentType === "movie" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>FİLMLER</button>
            <button onClick={() => {setViewMode("home"); setContentType("tv")}} style={{ background: 'none', border: 'none', color: contentType === "tv" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>DİZİLER</button>
            <button onClick={() => setViewMode("favorites")} style={{ background: 'none', border: 'none', color: viewMode === "favorites" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>LİSTEM ({favorites.length})</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: '#1F2833', color: '#66FCF1', border: '1px solid #45A29E', padding: '5px 10px', borderRadius: '10px' }}>
                <option value="popularity.desc">Trendler</option>
                <option value="vote_average.desc">Puan</option>
                <option value="primary_release_date.desc">Yeni</option>
            </select>
            <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '8px 15px', borderRadius: '20px', color: 'white' }} />
        </div>
      </nav>

      {/* KATEGORİLER (GERİ GELDİ) */}
      {viewMode === "home" && !searchQuery && (
        <div style={{ padding: '10px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setSelectedGenre(null)} className="genre-btn" style={{ padding: '5px 15px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#45A29E', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümü</button>
          {genres.map(g => (
            <button key={g.id} onClick={() => setSelectedGenre(g.id)} className="genre-btn" style={{ padding: '5px 15px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#45A29E', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
          ))}
        </div>
      )}

      {/* FİLM LİSTESİ */}
      <div className="movie-grid">
        {(viewMode === "home" ? items : favorites).map((item) => (
          <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div className="movie-card" style={{ borderRadius: '12px', overflow: 'hidden', height: '250px', position: 'relative', transition: '0.3s', border: '1px solid #333' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <div onClick={(e) => toggleFavorite(e, item)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}
              </div>
            </div>
            <p style={{ marginTop: '10px', fontSize: '13px', fontWeight: 'bold' }}>{item.title || item.name}</p>
          </div>
        ))}
      </div>

      {/* DETAY MODALI (DÜZELTİLDİ VE FULL EKRAN) */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--background)', zIndex: 2000, overflowY: 'auto' }}>
          <div style={{ position: 'relative', width: '100%', minHeight: '100vh', padding: '20px' }}>
            <button onClick={() => setSelectedItem(null)} style={{ position: 'fixed', top: '20px', left: '20px', background: '#66FCF1', color: '#0B0C10', border: 'none', padding: '10px 25px', borderRadius: '30px', fontWeight: '900', cursor: 'pointer', zIndex: 2100, boxShadow: '0 0 20px rgba(102,252,241,0.5)' }}>KAPAT</button>
            
            <div style={{ maxWidth: '1000px', margin: '60px auto', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '300px', borderRadius: '20px', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }} alt="" />
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ fontSize: '48px', margin: '0 0 10px 0', color: '#66FCF1' }}>{selectedItem.title || selectedItem.name}</h1>
                    <p style={{ color: '#45A29E', fontSize: '20px', marginBottom: '20px' }}>★ {selectedItem.vote_average?.toFixed(1)} | {selectedItem.release_date || selectedItem.first_air_date}</p>
                    <p style={{ fontSize: '18px', lineHeight: '1.7' }}>{selectedItem.overview}</p>
                    
                    <h3 style={{ color: '#66FCF1', marginTop: '30px', borderBottom: '1px solid #333' }}>OYUNCULAR</h3>
                    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '10px 0' }}>
                        {cast.map(c => (
                            <div key={c.id} style={{ minWidth: '80px', textAlign: 'center' }}>
                                <img src={getImgUrl(c.profile_path, 'w185')} style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #45A29E' }} alt="" />
                                <p style={{ fontSize: '11px', marginTop: '5px' }}>{c.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* DESTEK BUTONU (SABİT SAĞDA) */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 10000 }}>
        <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 4px 15px rgba(102, 252, 241, 0.4)' }}>💎 DESTEK OL</a>
      </div>
    </main>
  );
}