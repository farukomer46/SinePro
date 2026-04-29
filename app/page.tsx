"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [contentType, setContentType] = useState<"movie" | "tv">("movie");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"home" | "favorites">("home");
  const [cast, setCast] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const fetchData = async () => {
    if (!mounted || viewMode === "favorites") return;
    try {
      let url = searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=1`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}&vote_count.gte=200&language=tr-TR&page=1`;
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
      setSimilar(similarRes.data.results?.slice(0, 15) || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, sortBy, viewMode, mounted]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; padding: 20px; }
        .hover-effect { transition: 0.4s ease; cursor: pointer; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 0 25px rgba(102, 252, 241, 0.4); }
        .horizontal-scroll { display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; padding: 10px 0; }
        .horizontal-scroll::-webkit-scrollbar { display: none; }
        .nav-btn { background: rgba(102, 252, 241, 0.2); color: #66FCF1; border: 1px solid #66FCF1; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; alignItems: center; justifyContent: center; transition: 0.3s; }
        .nav-btn:hover { background: #66FCF1; color: #0B0C10; }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => window.location.reload()}>
             <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900' }}>SİNEPRO</span>
          </div>
        </div>
        <input type="text" placeholder="Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none' }} />
      </nav>

      {/* ANA LİSTE */}
      <div className="movie-grid">
        {items.map((item) => (
          <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
            <div className="hover-effect" style={{ borderRadius: '15px', overflow: 'hidden', border: '1px solid #333', height: '270px', position: 'relative' }}>
              <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.8)', color: '#66FCF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>★ {item.vote_average?.toFixed(1)}</div>
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

          {/* FRAGMAN KISMI (GERİ GELDİ) */}
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

             {/* OKLU YATAY KAYDIRMA KISMI */}
             <div style={{ marginTop: '80px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                   <h3 style={{ color: '#66FCF1', margin: 0 }}>BUNLARI DA SEVEBİLİRSİNİZ</h3>
                   <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="nav-btn" onClick={() => scroll('left')}>❮</button>
                      <button className="nav-btn" onClick={() => scroll('right')}>❯</button>
                   </div>
                </div>
                
                <div className="horizontal-scroll" ref={scrollRef}>
                   {similar.map((s) => (
                     <div key={s.id} onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); document.getElementById('modal-content')?.scrollTo(0,0); }} style={{ minWidth: '160px', textAlign: 'center' }}>
                        <div className="hover-effect" style={{ borderRadius: '12px', overflow: 'hidden', height: '240px', border: '1px solid #333' }}>
                           <img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                        {/* ANA SAYFA İLE AYNI YAZI STİLİ */}
                        <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title || s.name}</p>
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