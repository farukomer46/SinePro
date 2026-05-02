"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercel/speed-insights/next";
import emailjs from '@emailjs/browser';

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImapi_cmVhZCJdLCJ2ZXJzaW9uIjoxfQ.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

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
  const [comments, setComments] = useState<any>({}); 
  const [newComment, setNewComment] = useState("");
  const [commentRating, setCommentRating] = useState<number>(10);

  // 🔐 GİRİŞ & UI STATELERİ
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">("login");
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const mainNewScrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const genres = useMemo(() => [
    { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
    { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
    { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
  ], []);

  // 🛡️ AUTH (EMAILJS)
  const sendVerificationEmail = async (email: string, code: string) => {
    try {
      const serviceID = "service_9d5qlk9";    
      const templateID = "template_tlqw67x";   
      const publicKey = "OGQEmxiu2oahk21gg";     
      const templateParams = { email, user_name: formData.username, auth_code: code };
      await emailjs.send(serviceID, templateID, templateParams, publicKey);
      return true;
    } catch (error) { return false; }
  };

  const handleRegisterStart = async () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    if (users.find((u: any) => u.email === formData.email)) return alert("Bu e-posta zaten kayıtlı!");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    if (await sendVerificationEmail(formData.email, code)) { setAuthMode("verify"); }
  };

  const handleVerifyAndFinish = () => {
    if (verificationCode === generatedCode) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      const newUser = { ...formData, id: Date.now(), joined: new Date().toLocaleDateString('tr-TR') };
      users.push(newUser);
      localStorage.setItem("sinepro_database_users", JSON.stringify(users));
      setAuthMode("login");
      alert("Kayıt başarılı!");
    }
  };

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const userMatch = users.find((u: any) => u.email === formData.email && u.password === formData.password);
    if (userMatch) {
      setCurrentUser(userMatch);
      localStorage.setItem("sinepro_active_session", JSON.stringify(userMatch));
      setShowLogin(false);
    } else { alert("Hatalı bilgiler!"); }
  };

  // 🔄 VERİ ÇEKME
  const fetchData = async () => {
    if (!mounted || viewMode === "favorites") return;
    try {
      const getUrl = (page: number) => searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=${page}`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=100&language=tr-TR&page=${page}`;
      
      const [res1, res2, res3] = await Promise.all([
        axios.get(getUrl(1), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(2), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(3), { headers: { Authorization: API_TOKEN } })
      ]);
      setItems([...(res1.data.results || []), ...(res2.data.results || []), ...(res3.data.results || [])]);

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

  useEffect(() => {
    setMounted(true);
    const session = localStorage.getItem("sinepro_active_session");
    if (session) setCurrentUser(JSON.parse(session));
    const savedFavs = localStorage.getItem("sinepro_favs");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    const savedComments = localStorage.getItem("sinepro_comments");
    if (savedComments) setComments(JSON.parse(savedComments));
  }, []);

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  // 🎨 YARDIMCI ARAÇLAR
  const getImgUrl = (path: string | null) => path ? `https://image.tmdb.org/t/p/w500/${path}` : `https://via.placeholder.com/500x750?text=SİNEPRO`;

  const UserAvatar = ({ name, size = "35px" }: any) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(45deg, #66FCF1, #45A29E)', color: '#0B0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
      {name?.charAt(0).toUpperCase()}
    </div>
  );

  const toggleFavorite = (e: any, item: any) => {
    e.stopPropagation();
    const updated = favorites.find(f => f.id === item.id) ? favorites.filter(f => f.id !== item.id) : [...favorites, item];
    setFavorites(updated);
    localStorage.setItem("sinepro_favs", JSON.stringify(updated));
  };

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: '#0B0C10', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* 🟢 NAVBAR */}
      <nav style={{ padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0B0C10', borderBottom: '1px solid #1F2833', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div onClick={() => setViewMode("home")} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#66FCF1', fontSize: '28px', fontWeight: '900' }}>SİNE</span>
            <span style={{ backgroundColor: '#66FCF1', color: '#0B0C10', padding: '2px 8px', borderRadius: '4px', fontSize: '22px', fontWeight: '900', marginLeft: '4px' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setContentType("movie")} style={{ background: 'none', border: 'none', color: contentType === "movie" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>FİLMLER</button>
            <button onClick={() => setContentType("tv")} style={{ background: 'none', border: 'none', color: contentType === "tv" ? '#66FCF1' : '#45A29E', cursor: 'pointer', fontWeight: 'bold' }}>DİZİLER</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <input type="text" placeholder="Ara..." style={{ background: '#1F2833', border: 'none', padding: '10px 20px', borderRadius: '25px', color: 'white' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div onClick={() => setShowUserDropdown(!showUserDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#1F2833', padding: '5px 15px', borderRadius: '25px' }}>
                <span style={{ color: '#66FCF1', fontWeight: 'bold' }}>{currentUser.username}</span>
                <UserAvatar name={currentUser.username} size="32px" />
              </div>
              {showUserDropdown && (
                <div style={{ position: 'absolute', top: '45px', right: 0, width: '180px', background: '#1F2833', borderRadius: '10px', border: '1px solid #333', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }}>
                  <div onClick={() => {setShowProfileSettings(true); setShowUserDropdown(false);}} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #222' }}>⚙️ Profil Ayarları</div>
                  <div onClick={() => {setViewMode("favorites"); setShowUserDropdown(false);}} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #222' }}>❤️ Takip Ettiklerim</div>
                  <div onClick={() => {localStorage.removeItem("sinepro_active_session"); window.location.reload();}} style={{ padding: '12px', cursor: 'pointer', color: '#ff4d4d' }}>🚪 Çıkış Yap</div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 25px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>GİRİŞ YAP</button>
          )}
        </div>
      </nav>

      {/* 🔵 ANA İÇERİK */}
      <div style={{ padding: '20px 5%' }}>
        {viewMode === "home" ? (
          <>
            {/* Öne Çıkanlar */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ color: '#66FCF1', borderLeft: '4px solid #66FCF1', paddingLeft: '15px', marginBottom: '20px' }}>ÖNE ÇIKANLAR</h3>
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {newReleases.map(item => (
                        <div key={item.id} onClick={() => {setSelectedItem(item); fetchExtraDetails(item.id);}} style={{ minWidth: '180px', cursor: 'pointer' }}>
                            <img src={getImgUrl(item.poster_path)} style={{ width: '100%', borderRadius: '15px' }} />
                            <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px' }}>{item.title || item.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Keşfet Grid */}
            <h3 style={{ color: '#66FCF1', borderLeft: '4px solid #66FCF1', paddingLeft: '15px', marginBottom: '20px' }}>KEŞFET</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '25px' }}>
              {items.map((item) => (
                <div key={item.id} onClick={() => {setSelectedItem(item); fetchExtraDetails(item.id);}} style={{ cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={getImgUrl(item.poster_path)} style={{ width: '100%', borderRadius: '15px', border: '1px solid #1F2833' }} />
                    <div onClick={(e) => toggleFavorite(e, item)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '5px' }}>
                      {favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}
                    </div>
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>{item.title || item.name}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Favoriler */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '25px' }}>
            {favorites.map(f => (
              <div key={f.id} onClick={() => setSelectedItem(f)} style={{ cursor: 'pointer', textAlign: 'center' }}>
                <img src={getImgUrl(f.poster_path)} style={{ width: '100%', borderRadius: '15px' }} />
                <p>{f.title || f.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 GİRİŞ MODALİ */}
      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1F2833', padding: '35px', borderRadius: '25px', width: '350px', border: '1px solid #66FCF1' }}>
            {authMode === "verify" ? (
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: '#66FCF1' }}>Mailini Doğrula</h3>
                <input type="text" placeholder="6 Haneli Kod" style={{ width: '100%', background: '#0B0C10', border: '1px solid #45A29E', padding: '15px', borderRadius: '12px', color: 'white', marginTop: '20px' }} onChange={(e) => setVerificationCode(e.target.value)} />
                <button onClick={handleVerifyAndFinish} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '15px', borderRadius: '12px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' }}>DOĞRULA</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', marginBottom: '25px', borderBottom: '1px solid #333' }}>
                    <button onClick={() => setAuthMode("login")} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: authMode === "login" ? '#66FCF1' : '#555', borderBottom: authMode === "login" ? '2px solid #66FCF1' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>GİRİŞ</button>
                    <button onClick={() => setAuthMode("register")} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', color: authMode === "register" ? '#66FCF1' : '#555', borderBottom: authMode === "register" ? '2px solid #66FCF1' : 'none', cursor: 'pointer', fontWeight: 'bold' }}>KAYIT</button>
                </div>
                {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '10px' }} onChange={(e) => setFormData({...formData, username: e.target.value})} />}
                <input type="email" placeholder="E-posta" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '10px' }} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder="Şifre" style={{ width: '100%', background: '#0B0C10', border: '1px solid #333', padding: '12px', borderRadius: '10px', color: 'white', marginBottom: '20px' }} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <button onClick={authMode === "login" ? handleLogin : handleRegisterStart} style={{ width: '100%', background: '#66FCF1', color: '#0B0C10', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{authMode === "login" ? "GİRİŞ YAP" : "KOD GÖNDER"}</button>
              </>
            )}
            <button onClick={() => setShowLogin(false)} style={{ width: '100%', background: 'none', border: 'none', color: '#555', marginTop: '20px', cursor: 'pointer' }}>Kapat</button>
          </div>
        </div>
      )}

      {/* 🟡 DETAY MODALİ */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: '#0B0C10', zIndex: 3000, overflowY: 'auto', padding: '30px' }}>
            <button onClick={() => setSelectedItem(null)} style={{ position: 'fixed', top: '20px', right: '30px', background: '#66FCF1', color: '#0B0C10', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}>KAPAT</button>
            <div style={{ display: 'flex', gap: '50px', flexWrap: 'wrap', maxWidth: '1100px', margin: '50px auto' }}>
                <img src={getImgUrl(selectedItem.poster_path)} style={{ width: '300px', borderRadius: '20px' }} />
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ color: '#66FCF1', fontSize: '40px' }}>{selectedItem.title || selectedItem.name}</h1>
                    <p style={{ lineHeight: '1.8', color: '#ccc', fontSize: '18px', margin: '20px 0' }}>{selectedItem.overview}</p>
                    <div style={{ fontSize: '22px', fontWeight: 'bold' }}>⭐ Puan: {selectedItem.vote_average?.toFixed(1)}</div>
                </div>
            </div>

            {/* Yorumlar */}
            <div style={{ maxWidth: '1100px', margin: '50px auto' }}>
                <h3 style={{ color: '#66FCF1', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Yorumlar</h3>
                <div style={{ display: 'flex', gap: '15px', background: '#1F2833', padding: '25px', borderRadius: '15px', marginTop: '20px' }}>
                    <UserAvatar name={currentUser?.username || "?"} size="45px" />
                    <div style={{ flex: 1 }}>
                        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Yorumun nedir?" style={{ width: '100%', background: '#0B0C10', border: 'none', padding: '15px', borderRadius: '10px', color: 'white' }} rows={3} />
                        <button onClick={() => {
                            if (!currentUser) return setShowLogin(true);
                            if (!newComment.trim()) return;
                            const commentObj = { id: Date.now(), user: currentUser.username, text: newComment, date: "Az önce" };
                            setComments({...comments, [selectedItem.id]: [commentObj, ...(comments[selectedItem.id] || [])]});
                            setNewComment("");
                        }} style={{ background: '#66FCF1', color: '#0B0C10', padding: '10px 30px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '10px', float: 'right' }}>GÖNDER</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <SpeedInsights />
    </main>
  );
}