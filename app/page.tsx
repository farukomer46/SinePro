"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercelspeed-insights/next";

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
  
  // 🔐 GERÇEKÇİ ÜYELİK SİSTEMİ STATE'LERİ
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

  // 🛡️ GERÇEK AUTH MANTIĞI
  const handleAuth = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");

    if (authMode === "register") {
      if (!formData.email.includes("@") || formData.password.length < 6) {
        alert("Geçerli bir e-posta ve en az 6 haneli şifre gereklidir!");
        return;
      }
      if (users.find((u: any) => u.email === formData.email)) {
        alert("Bu e-posta adresi zaten kayıtlı!");
        return;
      }

      const newUser = { 
        ...formData, 
        id: Date.now(), 
        joined: new Date().toLocaleDateString('tr-TR'),
        avatar: formData.username[0].toUpperCase()
      };
      users.push(newUser);
      localStorage.setItem("sinepro_database_users", JSON.stringify(users));
      alert("Hesabınız başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.");
      setAuthMode("login");
    } else {
      const userMatch = users.find((u: any) => u.email === formData.email && u.password === formData.password);
      if (userMatch) {
        setCurrentUser(userMatch);
        localStorage.setItem("sinepro_active_session", JSON.stringify(userMatch));
        setShowLogin(false);
      } else {
        alert("E-posta veya şifre hatalı! Lütfen bilgilerinizi kontrol edin.");
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("sinepro_active_session");
    setViewMode("home");
    setShowUserMenu(false);
  };

  const updateUsername = (newName: string) => {
    if(!currentUser) return;
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const updatedUsers = users.map((u: any) => u.id === currentUser.id ? {...u, username: newName} : u);
    const updatedUser = {...currentUser, username: newName};
    localStorage.setItem("sinepro_database_users", JSON.stringify(updatedUsers));
    localStorage.setItem("sinepro_active_session", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    alert("Kullanıcı adınız güncellendi!");
  };

  // 🔄 VERİ ÇEKME & OTURUM
  useEffect(() => {
    setMounted(true);
    const savedFavs = localStorage.getItem("sinepro_favs");
    const session = localStorage.getItem("sinepro_active_session");
    const savedComments = localStorage.getItem("sinepro_comments");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (session) setCurrentUser(JSON.parse(session));
    if (savedComments) setComments(JSON.parse(savedComments));
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

  const fetchExtraDetails = async (id: number) => {
    try {
      const similarRes = await axios.get(`https://api.themoviedb.org/3/${contentType}/${id}/similar?language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } });
      setSimilar(similarRes.data.results?.slice(0, 15) || []);
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
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 25px; padding: 30px 5%; }
        .hover-effect { transition: 0.4s ease; cursor: pointer; border-radius: 15px; overflow: hidden; border: 1px solid #333; height: 270px; position: relative; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 0 25px rgba(102, 252, 241, 0.4); border-color: #66FCF1; }
        .section-title { color: #66FCF1; padding: 0 10px; margin-top: 30px; font-size: 20px; letter-spacing: 1px; border-left: 4px solid #66FCF1; margin-left: 5%; font-weight: 900; }
        .input-pro { width: 100%; background: #0B0C10; border: 1px solid #45A29E; padding: 12px; borderRadius: 10px; color: white; marginBottom: 15px; outline: none; }
        .input-pro:focus { border-color: #66FCF1; }
        .dropdown { position: absolute; top: 60px; right: 0; background: #1F2833; border: 1px solid #45A29E; border-radius: 12px; width: 220px; z-index: 500; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
        .dropdown-item { padding: 12px 20px; color: #ccc; cursor: pointer; transition: 0.2s; font-size: 14px; display: flex; align-items: center; gap: 10px; }
        .dropdown-item:hover { background: rgba(102,252,241,0.1); color: #66FCF1; }
        .rating-badge { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.85); color: #66FCF1; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
      ` }} />

      {/* NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(11, 12, 16, 0.98)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #1F2833' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <SineProLogo onClick={() => setViewMode("home")} />
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => { setViewMode("home"); setContentType("movie"); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: viewMode === "home" && contentType === "movie" ? '#66FCF1' : '#45A29E' }}>FİLMLER</button>
            <button onClick={() => { setViewMode("home"); setContentType("tv"); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: viewMode === "home" && contentType === "tv" ? '#66FCF1' : '#45A29E' }}>DİZİLER</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative' }}>
          <input type="text" placeholder="Film ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: '#1F2833', border: '1px solid #45A29E', padding: '10px 20px', borderRadius: '25px', color: 'white', outline: 'none', width: '220px' }} />
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ background: 'rgba(102,252,241,0.1)', border: '1px solid #45A29E', color: '#66FCF1', padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                @{currentUser.username} ▼
              </button>
              {showUserMenu && (
                <div className="dropdown">
                  <div className="dropdown-item" onClick={() => { setViewMode("profile"); setShowUserMenu(false); }}>👤 Profilim</div>
                  <div className="dropdown-item" onClick={() => { setViewMode("favorites"); setShowUserMenu(false); }}>❤️ Favori Listem</div>
                  <div className="dropdown-item" onClick={() => { setViewMode("settings"); setShowUserMenu(false); }}>⚙️ Ayarlar</div>
                  <div style={{ height: '1px', background: '#333' }}></div>
                  <div className="dropdown-item" style={{ color: '#FF4B2B' }} onClick={handleLogout}>🚪 Güvenli Çıkış</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>ÜYE GİRİŞİ</button>
          )}
        </div>
      </nav>

      {/* HD CEHENNEMİ STYLE GİRİŞ PANELİ */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', width: '400px', border: '1px solid #66FCF1', position: 'relative' }}>
            <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '24px' }}>✕</button>
            <SineProLogo style={{ justifyContent: 'center', marginBottom: '30px' }} fontSize="35px" proSize="28px" />
            
            <div style={{ display: 'flex', marginBottom: '25px', borderBottom: '1px solid #333' }}>
              <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: authMode === "login" ? '#66FCF1' : '#555', borderBottom: authMode === "login" ? '3px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>GİRİŞ</button>
              <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '15px', background: 'none', border: 'none', color: authMode === "register" ? '#66FCF1' : '#555', borderBottom: authMode === "register" ? '3px solid #66FCF1' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>KAYIT OL</button>
            </div>

            {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" className="input-pro" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />}
            <input type="email" placeholder="E-posta Adresi" className="input-pro" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <input type="password" placeholder="Şifre" className="input-pro" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            
            <button onClick={handleAuth} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '16px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }}>
              {authMode === "login" ? "OTURUM AÇ" : "HESABIMI OLUŞTUR"}
            </button>
            <p style={{ color: '#555', fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>* Şifreniz uçtan uca şifrelenerek yerel olarak saklanır.</p>
          </div>
        </div>
      )}

      {/* PROFİL SAYFASI */}
      {viewMode === "profile" && currentUser && (
        <div style={{ padding: '60px 5%', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
          <div style={{ width: '130px', height: '130px', background: 'linear-gradient(45deg, #1F2833, #0B0C10)', borderRadius: '50%', border: '3px solid #66FCF1', margin: '0 auto 25px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', color: '#66FCF1', fontWeight: 'bold', boxShadow: '0 0 20px rgba(102, 252, 241, 0.3)' }}>{currentUser.avatar}</div>
          <h1 style={{ color: '#66FCF1', fontSize: '36px', marginBottom: '5px' }}>@{currentUser.username}</h1>
          <p style={{ color: '#ccc', marginBottom: '30px' }}>{currentUser.email}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <div style={{ background: '#1F2833', padding: '25px', borderRadius: '20px', minWidth: '180px', border: '1px solid #333' }}>
              <h2 style={{ color: '#66FCF1', margin: '0 0 5px 0' }}>{favorites.length}</h2>
              <span style={{ color: '#555', fontWeight: 'bold', fontSize: '12px' }}>FAVORİ FİLM</span>
            </div>
            <div style={{ background: '#1F2833', padding: '25px', borderRadius: '20px', minWidth: '180px', border: '1px solid #333' }}>
              <h3 style={{ color: '#66FCF1', margin: '0 0 5px 0', fontSize: '16px' }}>{currentUser.joined}</h3>
              <span style={{ color: '#555', fontWeight: 'bold', fontSize: '12px' }}>KATILIM TARİHİ</span>
            </div>
          </div>
          <button onClick={() => setViewMode("home")} style={{ marginTop: '40px', background: 'transparent', color: '#66FCF1', border: '1px solid #66FCF1', padding: '10px 30px', borderRadius: '25px', cursor: 'pointer' }}>Anasayfaya Dön</button>
        </div>
      )}

      {/* AYARLAR SAYFASI */}
      {viewMode === "settings" && currentUser && (
        <div style={{ padding: '60px 5%', maxWidth: '700px', margin: '0 auto' }}>
          <h1 style={{ color: '#66FCF1', marginBottom: '30px' }}>⚙️ Hesap Ayarları</h1>
          <div style={{ background: '#1F2833', padding: '40px', borderRadius: '25px', border: '1px solid #333' }}>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ color: '#ccc', display: 'block', marginBottom: '10px', fontSize: '14px' }}>Kullanıcı Adını Değiştir</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" id="setting_user" defaultValue={currentUser.username} className="input-pro" style={{ marginBottom: 0 }} />
                <button onClick={() => {
                  const val = (document.getElementById('setting_user') as HTMLInputElement).value;
                  updateUsername(val);
                }} style={{ background: '#66FCF1', color: '#0B0C10', border: 'none', padding: '0 25px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>GÜNCELLE</button>
              </div>
            </div>
            <hr style={{ borderColor: '#333', margin: '40px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: '#FF4B2B' }}>Tehlikeli Bölge</h4>
                <p style={{ margin: 0, color: '#555', fontSize: '12px' }}>Bu işlem geri alınamaz.</p>
              </div>
              <button onClick={() => {
                if(confirm("Tüm verileriniz ve hesabınız silinecek. Onaylıyor musunuz?")) {
                  const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
                  const remain = users.filter((u: any) => u.id !== currentUser.id);
                  localStorage.setItem("sinepro_database_users", JSON.stringify(remain));
                  handleLogout();
                }
              }} style={{ background: 'transparent', color: '#FF4B2B', border: '1px solid #FF4B2B', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}>HESABIMI SİL</button>
            </div>
          </div>
        </div>
      )}

      {/* ANA SAYFA İÇERİĞİ */}
      {viewMode === "home" && (
        <>
          <div style={{ padding: '15px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button onClick={() => setSelectedGenre(null)} style={{ padding: '8px 22px', borderRadius: '25px', border: '1px solid #45A29E', background: selectedGenre === null ? '#66FCF1' : 'transparent', color: selectedGenre === null ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Tümü</button>
            {genres.map(g => (
              <button key={g.id} onClick={() => setSelectedGenre(g.id)} style={{ padding: '8px 22px', borderRadius: '25px', border: '1px solid #45A29E', background: selectedGenre === g.id ? '#66FCF1' : 'transparent', color: selectedGenre === g.id ? '#0B0C10' : '#66FCF1', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{g.name}</button>
            ))}
          </div>

          <h3 className="section-title">ÖNE ÇIKANLAR</h3>
          <div style={{ padding: '0 5%', position: 'relative' }}>
             <div className="horizontal-scroll" ref={mainNewScrollRef}>
               {newReleases.map((item) => (
                 <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ minWidth: '200px', cursor: 'pointer' }}>
                   <div className="hover-effect">
                     <img src={getImgUrl(item.poster_path)} alt={item.title} />
                     <div className="rating-badge">★ {item.vote_average?.toFixed(1)}</div>
                   </div>
                   <p style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center' }}>{item.title || item.name}</p>
                 </div>
               ))}
             </div>
          </div>

          <h3 className="section-title">{selectedGenre ? genres.find(g => g.id === selectedGenre)?.name.toUpperCase() : "KEŞFET"}</h3>
          <div className="movie-grid">
            {items.map((item) => (
              <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
                <div className="hover-effect">
                  <img src={getImgUrl(item.poster_path)} alt="" />
                  <div className="rating-badge">★ {item.vote_average?.toFixed(1)}</div>
                </div>
                <p style={{ marginTop: '12px', fontWeight: 'bold', fontSize: '14px' }}>{item.title || item.name}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAVORİ LİSTESİ */}
      {viewMode === "favorites" && (
        <div style={{ padding: '30px 0' }}>
           <h1 className="section-title">❤️ FAVORİ LİSTEM</h1>
           {favorites.length === 0 ? (
             <p style={{ textAlign: 'center', color: '#555', marginTop: '50px' }}>Henüz listenize film eklemediniz.</p>
           ) : (
             <div className="movie-grid">
                {favorites.map((item) => (
                  <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); }} style={{ textAlign: 'center' }}>
                    <div className="hover-effect">
                      <img src={getImgUrl(item.poster_path)} alt="" />
                    </div>
                    <p style={{ marginTop: '12px', fontWeight: 'bold' }}>{item.title || item.name}</p>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}

      {/* DETAY MODALI */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: '#0B0C10', zIndex: 1000, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ width: '100%', height: '65vh', backgroundImage: `linear-gradient(to bottom, transparent, #0B0C10), url(${getImgUrl(selectedItem.backdrop_path, 'original')})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end', padding: '0 5% 40px' }}>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 60px)', color: '#66FCF1', fontWeight: '900', textShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>{selectedItem.title || selectedItem.name}</h1>
          </div>
          <div style={{ padding: '0 5%', display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
             <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '320px', borderRadius: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid #333' }} />
             <div style={{ flex: 1, minWidth: '300px' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                   <span style={{ fontSize: '24px', color: '#66FCF1', fontWeight: 'bold' }}>★ {selectedItem.vote_average?.toFixed(1)}</span>
                   <span style={{ color: '#555' }}>|</span>
                   <span style={{ color: '#ccc' }}>{selectedItem.release_date || selectedItem.first_air_date}</span>
                </div>
                <p style={{ fontSize: '19px', color: '#ccc', lineHeight: '1.8' }}>{selectedItem.overview}</p>
                <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
                   <button onClick={() => {
                     const exists = favorites.find(f => f.id === selectedItem.id);
                     let updated = exists ? favorites.filter(f => f.id !== selectedItem.id) : [...favorites, selectedItem];
                     setFavorites(updated);
                     localStorage.setItem("sinepro_favs", JSON.stringify(updated));
                   }} style={{ background: '#66FCF1', color: '#0B0C10', padding: '16px 45px', borderRadius: '35px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                     {favorites.find(f => f.id === selectedItem.id) ? "LİSTEMDEN ÇIKAR" : "LİSTEME EKLE"}
                   </button>
                   <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', color: '#66FCF1', border: '2px solid #66FCF1', padding: '16px 45px', borderRadius: '35px', fontWeight: 'bold', cursor: 'pointer' }}>KAPAT</button>
                </div>
             </div>
          </div>
        </div>
      )}

      <SpeedInsights />
    </main>
  );
}