"use client";

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

// 🔑 KENDİ TOKEN'INI BURAYA YAPIŞTIR
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
        // Sıralama parametrelerini buraya ekliyoruz
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
      setSimilar(similarRes.data.results?.slice(0, 6) || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => fetchData(), 400);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  if (!mounted) return null;

  const displayItems = viewMode === "home" ? items : favorites;

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', backdropFilter: 'blur(15px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 0 8px rgba(102, 252, 241, 0.4))' }} 
            onClick={() => window.location.reload()}
          >
             <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900', letterSpacing: '-1.5px', textShadow: '0 0 10px rgba(102, 252, 241, 0.6)' }}>SİNE</span>
             <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: '22px', fontWeight: '900', marginLeft: '4px', boxShadow: '0 0 15px rgba(102, 252, 241, 0.8)' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); setSelectedGenre(null); }} style={{ background: 'none', border: 'none', color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); setSelectedGenre(null); }} style={{ background: 'none', border: 'none', color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>DİZİLER</button>
            <button onClick={() => setViewMode("favorites")} style={{ background: 'none', border: 'none', color: viewMode === "favorites" ? '#66FCF1' : '#45A29E', fontWeight: 'bold', cursor: 'pointer' }}>LİSTEM ({favorites.length})</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* GELİŞMİŞ SIRALAMA MENÜSÜ */}
          {viewMode === "home" && (
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              style={{ background: '#1F2833', color: '#66FCF1', border: '1px solid #45A29E', padding: '8px 12px', borderRadius: '10px', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              <option value="popularity.desc">🔥 Trendler</option>
              <option value="vote_average.desc">⭐ En Yüksek Puan</option>
              <option value="primary_release_date.desc">📅 En Yeniler</option>
              <option value="revenue.desc">💰 Gişe Rekortmenleri</option>
              <option value="vote_count.desc">🗣️ Çok Oylananlar</option>
            </select>
          )}
          <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none', width: '180px' }} />
        </div>
      </nav>

      {/* KATEGORİLER VE LİSTE AYNI KALDI... */}
      {viewMode === "home" && !searchQuery && (
        <div style={{ padding: '15px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button onClick={() => setSelectedGenre(null)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümü</button>
          {genres.map(g => (
            <button key={`genre-${g.id}`} onClick={() => setSelectedGenre(g.id)} style={{ padding: '6px 18px', borderRadius: '20px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.name}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '30px 5% 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '40px', justifyContent: 'center' }}>
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={`skel-${i}`} style={{ width: '180px' }}>
              <div style={{ height: '270px', borderRadius: '15px', background: '#1F2833', opacity: 0.5 }}></div>
            </div>
          ))
        ) : (
          displayItems.map((item, idx) => {
            const isFav = favorites.find(f => f.id === item.id);
            const uniqueKey = item.id ? `${item.id}-${idx}` : `item-${idx}`;
            return (
              <div key={uniqueKey} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                <div 
                  style={{ borderRadius: '15px', overflow: 'hidden', border: '1px solid #333', height: '270px', position: 'relative', transition: 'all 0.4s ease' }} 
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-10px)';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(102, 252, 241, 0.4)';
                  }} 
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <div onClick={(e) => toggleFavorite(e, item)} style={{ position: 'absolute', top: '12px', right: '12px', background: isFav ? '#FF4B2B' : 'rgba(0,0,0,0.5)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    {isFav ? '❤️' : '🤍'}
                  </div>
                  <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: '#66FCF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>★ {item.vote_average?.toFixed(1)}</div>
                </div>
                <p style={{ fontSize: '15px', marginTop: '20px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'white' }}>{item.title || item.name}</p>
                <p style={{ fontSize: '12px', color: '#45A29E', marginTop: '5px' }}>{item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0]}</p>
              </div>
            );
          })
        )}
      </div>

      {/* DETAY MODALI (Daha Öncekiyle Aynı) */}
      {selectedItem && (
        <div id="modal-content" style={{ position: 'fixed', inset: 0, background: '#0B0C10', zIndex: 1000, overflowY: 'auto' }}>
           <div style={{ position: 'sticky', top: 0, zIndex: 1100, background: 'rgba(11, 12, 16, 0.95)', backdropFilter: 'blur(10px)', padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
             <h2 style={{ color: '#66FCF1', margin: 0 }}>{selectedItem.title || selectedItem.name}</h2>
             <button onClick={() => setSelectedItem(null)} style={{ background: '#66FCF1', color: '#0B0C10', border: 'none', padding: '8px 25px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>KAPAT</button>
          </div>
          <div style={{ width: '100%', height: '60vh', backgroundImage: `linear-gradient(to bottom, transparent, #0B0C10), url(${getImgUrl(selectedItem.backdrop_path, 'original')})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedItem.title || selectedItem.name)}+fragman`} target="_blank" rel="noreferrer" style={{ background: '#66FCF1', color: '#0B0C10', padding: '12px 35px', borderRadius: '50px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 0 20px rgba(102, 252, 241, 0.5)' }}>▶ FRAGMANI İZLE</a>
          </div>
          <div style={{ maxWidth: '1100px', margin: '-40px auto 0', padding: '0 5% 100px', position: 'relative' }}>
             <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
                <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '280px', borderRadius: '20px', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }} alt="" />
                <div style={{ flex: 1, minWidth: '300px', paddingTop: '50px' }}>
                   <h1 style={{ fontSize: '48px', color: 'white', margin: '0', fontWeight: '900' }}>{selectedItem.title || selectedItem.name}</h1>
                   <p style={{ color: '#66FCF1', fontSize: '20px', margin: '15px 0' }}>{selectedItem.release_date?.split('-')[0] || selectedItem.first_air_date?.split('-')[0]} • ★ {selectedItem.vote_average?.toFixed(1)}</p>
                   <p style={{ fontSize: '18px', color: '#ccc', lineHeight: '1.8' }}>{selectedItem.overview}</p>
                   <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '40px' }}>OYUNCULAR</h3>
                   <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', padding: '10px 0' }}>
                      {cast.map((p, pIdx) => (
                        <div key={`c-${p.id || pIdx}`} style={{ minWidth: '90px', textAlign: 'center' }}>
                          <img src={getImgUrl(p.profile_path, 'w185')} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #45A29E' }} alt="" />
                          <p style={{ fontSize: '12px', marginTop: '8px' }}>{p.name}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             {/* BENZERLER */}
             <div style={{ marginTop: '80px' }}>
                <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '30px' }}>BUNLARI DA SEVEBİLİRSİNİZ</h3>
                <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', justifyContent: 'center' }}>
                   {similar.map((s, sIdx) => (
                     <div key={`sim-${s.id || sIdx}`} onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); }} style={{ width: '150px', cursor: 'pointer', textAlign: 'center' }}>
                        <img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '225px', borderRadius: '10px', border: '1px solid #333', objectFit: 'cover' }} alt="" />
                        <p style={{ fontSize: '13px', marginTop: '10px', fontWeight: 'bold' }}>{s.title || s.name}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </main>
  );
}