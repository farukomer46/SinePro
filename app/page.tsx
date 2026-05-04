"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercel/speed-insights/next";
import emailjs from '@emailjs/browser';

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

// --- YARDIMCI BİLEŞENLER (PERFORMANS İÇİN ANA DÖNGÜ DIŞINA ALINDI) ---
const UserAvatar = ({ user, size = "35px", fontSize = "14px", activeColor, theme, badgeText }: any) => {
  if (user?.avatar && user.avatar !== "default") return <img src={user.avatar} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${activeColor}` }} alt="" />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(45deg, ${activeColor}, ${theme?.secondary || activeColor})`, color: badgeText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: fontSize }}>{user?.username?.charAt(0)?.toUpperCase() || "?"}</div>;
};

const SineProLogo = ({ style, fontSize = '28px', proSize = '22px', activeColor, badgeText }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', animation: 'logoGlow 2.5s infinite', ...style }}>
    <span style={{ color: activeColor, fontSize, fontWeight: '900' }}>SİNE</span>
    <span style={{ backgroundColor: activeColor, color: badgeText, padding: '2px 8px', borderRadius: '4px', fontSize: proSize, fontWeight: '900', marginLeft: '4px' }}>PRO</span>
  </div>
);

const SkeletonCard = ({ isDarkMode }: any) => (
  <div style={{ textAlign: 'center', minWidth: '150px' }}>
    <div className="skeleton-box" style={{ height: '250px', borderRadius: '15px' }}></div>
    <div className="skeleton-box" style={{ height: '14px', width: '70%', borderRadius: '4px', margin: '15px auto 0' }}></div>
  </div>
);
// --------------------------------------------------------------------

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  const [isDarkMode, setIsDarkMode] = useState(true); 

  const [items, setItems] = useState<any[]>([]); 
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  
  const [searchInput, setSearchInput] = useState(""); 
  const [searchQuery, setSearchQuery] = useState(""); 
  const [liveResults, setLiveResults] = useState<any[]>([]); 
  const [isSearchFocused, setIsSearchFocused] = useState(false); 
  const [isSearchExpanded, setIsSearchExpanded] = useState(false); 
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [cast, setCast] = useState<any[]>([]); 
  const [contentType, setContentType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"home" | "favorites" | "my_comments" | "stats" | "notifications" | "about" | "support">("home"); 
  const [similar, setSimilar] = useState<any[]>([]);
  const [theme, setTheme] = useState({ name: 'Turkuaz', color: '#66FCF1', secondary: '#45A29E' }); 

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState(40);
  const [currentPage, setCurrentPage] = useState(2);

  const [comments, setComments] = useState<any>({}); 
  const [newComment, setNewComment] = useState("");
  const [commentRating, setCommentRating] = useState<number>(10);
  const [commentsSort, setCommentsSort] = useState("newest");
  const [autoScrollToComments, setAutoScrollToComments] = useState(false); 

  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false); 
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false); 
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify" | "forgot_password" | "verify_forgot" | "new_password" | "security_verify">("login");
  
  const [zoomedAvatar, setZoomedAvatar] = useState<{username: string, avatar: string} | null>(null);

  const [showSineAI, setShowSineAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [isListening, setIsListening] = useState(false); 

  const [showPassword, setShowPassword] = useState(false);
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [guestNotifSeen, setGuestNotifSeen] = useState(false);

  // YENİ: DESTEK SAYFASI İÇİN STATE'LER
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [supportForm, setSupportForm] = useState({ category: "Hesap Problemi", message: "" });

  const initialAIMessage = { role: "ai", text: "Merhaba! Ben SİNE Aİ Asistanın 🤖. Benimle sinema hakkında sohbet edebilir, ruh haline göre tavsiyeler isteyebilirsin." };
  const [aiChatHistory, setAiChatHistory] = useState<any[]>([initialAIMessage]);
  
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [profilePassword, setProfilePassword] = useState("");

  const mainNewScrollRef = useRef<HTMLDivElement | null>(null);
  const recentScrollRef = useRef<HTMLDivElement | null>(null);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const castScrollRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null); 
  const bellRef = useRef<HTMLDivElement | null>(null); 
  const searchInputRef = useRef<HTMLInputElement | null>(null); 
  const fileInputRef = useRef<HTMLInputElement | null>(null); 

  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false); 
  
  const [activeBottomTab, setActiveBottomTab] = useState("home"); 

  const genres = useMemo(() => {
    if (contentType === "tv") {
      return [
        { id: 10759, name: "Aksiyon & Macera" }, { id: 35, name: "Komedi" },
        { id: 9648, name: "Gizem" }, { id: 10765, name: "Bilim Kurgu" },
        { id: 16, name: "Animasyon" }, { id: 18, name: "Dram" }
      ];
    }
    return [
      { id: 28, name: "Aksiyon" }, { id: 35, name: "Komedi" },
      { id: 27, name: "Korku" }, { id: 878, name: "Bilim Kurgu" },
      { id: 16, name: "Animasyon" }, { id: 53, name: "Gerilim" }
    ];
  }, [contentType]);

  const themes = [
    { name: 'Turkuaz', color: '#66FCF1', secondary: '#45A29E' },
    { name: 'Vampir', color: '#FF0000', secondary: '#8B0000' },
    { name: 'Altın', color: '#FFD700', secondary: '#B8860B' },
    { name: 'Okyanus', color: '#00BFFF', secondary: '#00008B' }
  ];

  const faqs = [
    { q: "SİNEPRO'da filmleri baştan sona izleyebilir miyim?", a: "Hayır. SİNEPRO, sinema tutkunları için geliştirilmiş devasa bir keşif, bilgi ve sosyalleşme platformudur. Yapımların resmi fragmanlarını izleyebilir, puan verebilir ve toplulukla tartışabilirsiniz ancak telif hakları gereği içeriklerin tamamı yayınlanmaz." },
    { q: "Şifremi unuttum, hesabımı nasıl kurtarabilirim?", a: "Giriş yapma ekranında sağ alt köşede bulunan 'Şifremi Unuttum' bağlantısına tıklayın. Kayıtlı e-posta adresinizi girdiğinizde size 6 haneli bir güvenlik kodu gönderilecektir. Bu kodla şifrenizi yenileyebilirsiniz." },
    { q: "Yorumlarımı veya cevaplarımı nasıl silebilirim?", a: "Yaptığınız yorumların ve cevapların sağ üst köşesinde (sadece size görünen) bir ❌ butonu bulunur. Buna tıklayarak verilerinizi platformdan kalıcı olarak silebilirsiniz." },
    { q: "SİNE Aİ tam olarak nedir ve nasıl çalışır?", a: "SİNE Aİ, platformumuzun yapay zeka destekli akıllı sinema asistanıdır. Ona ruh halinizi (örn: 'Çok canım sıkkın, beni güldür') anlatabilir veya sadece sohbet edebilirsiniz. Size en uygun yapımları saniyeler içinde bulup getirecektir." },
    { q: "Profil fotoğrafımı nasıl değiştirebilirim?", a: "Sağ üst köşedeki profilinize (mobilde alt menüdeki Profil sekmesine) tıklayıp 'Profil Ayarlarım' menüsüne girin. Orada hazır avatarlarımızdan birini seçebilir veya '+' ikonuna tıklayarak kendi galerinizden bir fotoğraf yükleyebilirsiniz." },
    { q: "Bildirimler neden ve ne zaman gelir?", a: "Birisi sizin yaptığınız bir yorumu beğendiğinde veya yorumunuza cevap yazdığında sistem size anlık olarak bildirim gönderir. Ayrıca önemli güncellemeler ve platform duyuruları da bildirim panelinize düşer." }
  ];

  const getAdjustedColor = (colorName: string, defaultColor: string) => {
    if (isDarkMode) return defaultColor;
    switch(colorName) {
        case 'Turkuaz': return '#008B8B'; 
        case 'Vampir': return '#D32F2F';  
        case 'Altın': return '#B8860B';   
        case 'Okyanus': return '#00509E'; 
        default: return defaultColor;
    }
  };

  const activeColor = getAdjustedColor(theme.name, theme.color);
  const badgeText = isDarkMode ? '#0B0C10' : '#FFFFFF';
  
  const bgMain = isDarkMode ? '#0B0C10' : '#F5F7FA';
  const bgCard = isDarkMode ? '#1F2833' : '#FFFFFF';
  const inputBg = isDarkMode ? '#0B0C10' : '#E8ECEF';
  const textMain = isDarkMode ? 'white' : '#111111';
  const textMuted = isDarkMode ? '#ccc' : '#666666';
  const textLight = isDarkMode ? '#888' : '#999999';
  const borderColor = isDarkMode ? '#333' : '#DDDDDD';
  const navBg = isDarkMode ? 'rgba(11, 12, 16, 0.95)' : 'rgba(245, 247, 250, 0.95)';
  const modalBg = isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)';
  const aiModalContentBg = isDarkMode ? 'rgba(31, 40, 51, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const aiHeaderBg = isDarkMode ? 'rgba(11, 12, 16, 0.9)' : '#F5F7FA';

  const getImgUrl = (path: string | null, size: string = "w500") => {
    if (!path) return `https://via.placeholder.com/500x750?text=SİNEPRO`;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); 
  };

  useEffect(() => {
    if (!mounted) return;
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", activeColor);
  }, [activeColor, mounted]);

  useEffect(() => {
    const makeScrollableWithWheel = (ref: React.RefObject<HTMLDivElement | null>) => {
      const el = ref.current;
      if (!el) return () => {}; 
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        if ((e.deltaY < 0 && scrollLeft <= 0) || (e.deltaY > 0 && scrollLeft + clientWidth >= scrollWidth - 1)) return; 
        e.preventDefault(); 
        el.scrollBy({ left: e.deltaY < 0 ? -250 : 250, behavior: 'smooth' }); 
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    };
    const c1 = makeScrollableWithWheel(mainNewScrollRef);
    const c2 = makeScrollableWithWheel(recentScrollRef);
    const c3 = makeScrollableWithWheel(modalScrollRef);
    const c4 = makeScrollableWithWheel(castScrollRef);
    return () => { c1(); c2(); c3(); c4(); };
  }, [newReleases, recentlyViewed, similar, selectedItem, cast]);

  useEffect(() => {
    if (!isHoveringCarousel && newReleases.length > 0 && viewMode === "home") {
      const intervalId = setInterval(() => {
        if (mainNewScrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = mainNewScrollRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) mainNewScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          else mainNewScrollRef.current.scrollTo({ left: scrollLeft + 300, behavior: 'smooth' });
        }
      }, 3500); 
      return () => clearInterval(intervalId);
    }
  }, [isHoveringCarousel, newReleases, viewMode]);

  useEffect(() => {
    if (selectedItem && autoScrollToComments) {
      const timer = setTimeout(() => {
        const commentsSection = document.getElementById("comments-section");
        if (commentsSection) commentsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        setAutoScrollToComments(false); 
      }, 200); 
      return () => clearTimeout(timer);
    }
  }, [selectedItem, autoScrollToComments]);

  useEffect(() => {
    if (searchInput.trim().length > 0) {
      const fetchLiveResults = async () => {
        try {
          const url = `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchInput)}&language=tr-TR&page=1`;
          const res = await axios.get(url, { headers: { Authorization: API_TOKEN } });
          setLiveResults(res.data.results || []);
        } catch (err) { console.error(err); }
      };
      fetchLiveResults();
    } else {
      setLiveResults([]);
      setSearchQuery(""); 
    }
  }, [searchInput, contentType]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [aiChatHistory, isAITyping]);

  useEffect(() => {
    setGuestNotifSeen(sessionStorage.getItem("sinepro_guest_notif") === "true");
    
    if(currentUser) {
        const savedNotifs = JSON.parse(localStorage.getItem(`sinepro_notifications_${currentUser.username}`) || "[]");
        if (savedNotifs.length === 0) {
            const welcomeMsg = { id: Date.now(), text: "SİNEPRO dünyasına hoş geldin! 🎉 Harika içerikler ve sınırsız özellikler seni bekliyor.", isRead: false, date: new Date().toLocaleDateString('tr-TR') };
            setNotifications([welcomeMsg]);
            localStorage.setItem(`sinepro_notifications_${currentUser.username}`, JSON.stringify([welcomeMsg]));
        } else {
            setNotifications(savedNotifs);
        }
    } else {
        setNotifications([]);
    }
  }, [currentUser]);

  const markNotifsAsRead = () => {
      const updated = notifications.map(n => ({...n, isRead: true}));
      setNotifications(updated);
      localStorage.setItem(`sinepro_notifications_${currentUser.username}`, JSON.stringify(updated));
  };

  const startListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Cihazınız veya tarayıcınız sesli komutu doğrudan desteklemiyor. Lütfen klavyeyi kullanın.");
      return;
    }
    triggerHaptic(); 
    const recognition = new SpeechRec();
    recognition.lang = 'tr-TR'; 
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiPrompt(prev => prev + (prev ? " " : "") + transcript);
      setIsListening(false);
      triggerHaptic(); 
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleAISubmit = async () => {
      if (!aiPrompt.trim()) return;
      const userText = aiPrompt.trim();
      setAiPrompt("");
      setAiChatHistory(prev => [...prev, { role: "user", text: userText }]);
      setIsAITyping(true);

      setTimeout(async () => {
          const lowerText = userText.toLowerCase();
          let aiResponseText = "";
          let results: any[] = [];
          let shouldFetch = false;
          let genreIds: number[] = [];
          let searchQuery = "";
          
          if (/^(merhaba|selam|sa|sea|hey|günaydın|iyi akşamlar)/.test(lowerText) && lowerText.split(" ").length < 4) {
              aiResponseText = "Selam! 👋 SİNEPRO dünyasına hoş geldin. Ben SİNE Aİ, senin kişisel sinema asistanınım. Bugün ne tür bir yapım arıyorsun?";
          }
          else if (/(kimsin|nesin|sen kimsin|adın ne|görevin ne)/.test(lowerText)) {
              aiResponseText = "Ben SİNE Aİ! 🤖 SİNEPRO için özel olarak geliştirilmiş yapay zeka asistanıyım. Milyonlarca film ve dizi arasından senin zevkine en uygun olanları bulmak veya seninle sinema hakkında sohbet etmek için buradayım.";
          }
          else if (/(nasılsın|naber|ne haber|nasıl gidiyor)/.test(lowerText)) {
              aiResponseText = "Harikayım, çok teşekkür ederim! 🤩 Veritabanındaki yeni filmleri düzenliyordum. Sen nasılsın, bugün modun nasıl?";
          }
          else if (/(iyiyim|teşekkürler|sağol|eyvallah|süper|harika)/.test(lowerText) && lowerText.split(" ").length < 5) {
              aiResponseText = "Bunu duyduğuma sevindim! 😊 O zaman bu güzel enerjine yakışacak bir film veya dizi bulmaya ne dersin? Bana sevdiğin bir tür söylemen yeterli.";
          }
          else if (/(sıkıldım|canım sıkkın|üzgünüm|kötüyüm|bunalım)/.test(lowerText)) {
              aiResponseText = "Bazen hepimiz böyle hissederiz... Seni biraz neşelendirecek harika bir komedi filmine ne dersin? Ya da başka bir dünyada kaybolmak istersen fantastik bir şeyler önerebilirim. Hangisi iyi gelir?";
          }
          else if (/(şaka yap|espiri|komik bir şey söyle)/.test(lowerText)) {
              aiResponseText = "Peki, geliyor... Neden bilgisayarlar sinemaya gitmez? Çünkü evde 'Ekran'ları var! 🥁 Hahaha, tamam kabul ediyorum çok kötüydü. Biz iyisi mi film önerilerine dönelim. 😂";
          }
          else if (/(seni kim yaptı|yaratıcın kim|kim kodladı)/.test(lowerText)) {
              aiResponseText = "Beni harika bir yazılımcı ve vizyoner bir ürün yöneticisi geliştirdi! Sürekli olarak öğrenmeye ve SİNEPRO kullanıcılarına daha iyi hizmet vermeye devam ediyorum. 🚀";
          }
          else {
              if (lowerText.includes("aksiyon") || lowerText.includes("heyecan") || lowerText.includes("silah") || lowerText.includes("dövüş") || lowerText.includes("patlama")) genreIds.push(28);
              if (lowerText.includes("komedi") || lowerText.includes("komik") || lowerText.includes("gülmek") || lowerText.includes("eğlence")) genreIds.push(35);
              if (lowerText.includes("korku") || lowerText.includes("gerilim") || lowerText.includes("korkunç") || lowerText.includes("kan") || lowerText.includes("vahşet")) genreIds.push(27);
              if (lowerText.includes("bilim kurgu") || lowerText.includes("uzay") || lowerText.includes("gelecek") || lowerText.includes("robot") || lowerText.includes("zaman")) genreIds.push(878);
              if (lowerText.includes("aşk") || lowerText.includes("romantik") || lowerText.includes("duygusal") || lowerText.includes("sevgili")) genreIds.push(10749);
              if (lowerText.includes("dram") || lowerText.includes("ağlamak") || lowerText.includes("hüzün") || lowerText.includes("üzücü") || lowerText.includes("gerçek hayat")) genreIds.push(18);
              if (lowerText.includes("animasyon") || lowerText.includes("çizgi") || lowerText.includes("anime")) genreIds.push(16);
              if (lowerText.includes("gizem") || lowerText.includes("dedektif") || lowerText.includes("katil") || lowerText.includes("sır")) genreIds.push(9648);
              if (lowerText.includes("suç") || lowerText.includes("soygun") || lowerText.includes("hırsız") || lowerText.includes("mafya")) genreIds.push(80);
              if (lowerText.includes("fantastik") || lowerText.includes("büyü") || lowerText.includes("ejderha") || lowerText.includes("canavar")) genreIds.push(14);
              if (lowerText.includes("tarih") || lowerText.includes("savaş") || lowerText.includes("eski zaman")) genreIds.push(36);

              if (genreIds.length > 0) {
                  shouldFetch = true;
                  aiResponseText = `Söylediklerini analiz ettim ve tam bu moda uyacak ${contentType === 'tv' ? 'dizileri' : 'filmleri'} buldum. 🍿✨ İstediğinin üzerine tıklayıp detaylarına bakabilirsin:`;
              } else {
                  const cleanSearch = userText.replace(/(öner|bul|getir|izlemek istiyorum|film|dizi|bana|bir)/gi, "").trim();
                  if (cleanSearch.length > 2) {
                      shouldFetch = true;
                      searchQuery = cleanSearch;
                      aiResponseText = `Hmm, "${cleanSearch}" ile ilgili veritabanında şunları buldum. Umarım aradığın şey bunlardan biridir! 👇`;
                  } else {
                      aiResponseText = "Hmm, sanırım ne demek istediğini tam anlayamadım. 🤔 Bana bir film ismi verebilir, sevdiğin bir türü (örneğin 'bilim kurgu') söyleyebilir veya sadece sohbet edebilirsin!";
                  }
              }
          }

          if (shouldFetch) {
              try {
                  let url = "";
                  if (genreIds.length > 0) {
                      url = `https://api.themoviedb.org/3/discover/${contentType}?with_genres=${genreIds.join(",")}&sort_by=popularity.desc&language=tr-TR&page=1`;
                  } else if (searchQuery) {
                      url = `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=1`;
                  }

                  const res = await axios.get(url, { headers: { Authorization: API_TOKEN } });
                  results = res.data.results?.slice(0, 4) || []; 
                  
                  if (results.length === 0) {
                      aiResponseText = `Derinlere daldım ama maalesef "${userText}" için bir şey bulamadım. Başka bir tarz denemeye ne dersin?`;
                  }
              } catch(e) {
                  aiResponseText = "Kablolarım karıştı! API ile bağlantı kurarken ufak bir hata oluştu. Lütfen tekrar dene.";
              }
          }

          setAiChatHistory(prev => [...prev, { role: "ai", text: aiResponseText, results }]);
          triggerHaptic(); 
          setIsAITyping(false);
      }, 1200 + Math.random() * 800); 
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert("Dosya boyutu çok büyük! Sistem hafızasının dolmaması için lütfen 500KB'tan daha küçük bir fotoğraf seçin.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCurrentUser({ ...currentUser, avatar: base64String, uploadedAvatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const addToRecentlyViewed = (item: any) => {
    let currentHistory = [...recentlyViewed];
    currentHistory = currentHistory.filter(i => i.id !== item.id);
    currentHistory.unshift(item);
    setRecentlyViewed(currentHistory.slice(0, 15));
    localStorage.setItem("sinepro_recently_viewed", JSON.stringify(currentHistory.slice(0, 15)));
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    localStorage.removeItem("sinepro_recently_viewed");
  };

  const toggleHistoryPref = () => {
    const newVal = !showHistory;
    setShowHistory(newVal);
    localStorage.setItem("sinepro_show_history", JSON.stringify(newVal));
  };

  const sendEmail = async (email: string, code: string, user: string) => {
    try {
      await emailjs.send("service_9d5qlk9", "template_tlqw67x", { 
          email: email, 
          name: user, 
          user_name: user, 
          to_name: user, 
          auth_code: code 
      }, "OGQEmxiu2oahk21gg");
      return true;
    } catch { return false; }
  };

  const handleRegisterStart = () => {
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
        return alert("Lütfen Kullanıcı Adı, E-posta ve Şifre alanlarının tamamını eksiksiz doldurun!");
    }
    if (!formData.email.includes("@")) return alert("Geçerli bir e-posta girin!");
    
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    if (users.find((u: any) => u.email.toLowerCase() === formData.email.trim().toLowerCase())) return alert("Bu e-posta zaten kayıtlı!");
    if (users.find((u: any) => u.username.toLowerCase() === formData.username.trim().toLowerCase())) return alert("Bu kullanıcı adı başkası tarafından kullanılıyor!");
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    sendEmail(formData.email.trim(), code, formData.username.trim()).then((success) => {
        if (success) {
            alert("Doğrulama kodu mailinize gönderildi!");
            setAuthMode("verify");
        } else { alert("Mail gönderilirken hata oluştu!"); }
    });
  };

  const handleVerifyAndFinish = () => {
    if (!verificationCode.trim()) return alert("Lütfen doğrulama kodunu girin!");
    if (verificationCode.trim() === generatedCode.trim()) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      const newUser = { 
          email: formData.email.trim(), 
          password: formData.password.trim(), 
          username: formData.username.trim(), 
          id: Date.now(), 
          joined: new Date().toLocaleDateString('tr-TR'), 
          avatar: "default" 
      };
      users.push(newUser);
      localStorage.setItem("sinepro_database_users", JSON.stringify(users));
      setAuthMode("login");
      setVerificationCode(""); 
      alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
    } else { alert("Girdiğiniz kod yanlış! Kopyala-yapıştır yaparken fazladan boşluk bırakmadığınıza emin olun."); }
  };

  const handleForgotPasswordStart = () => {
    if (!formData.email.trim()) return alert("Lütfen e-posta adresinizi girin!");
    if (!formData.email.includes("@")) return alert("Lütfen geçerli bir e-posta girin!");
    
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const userMatch = users.find((u: any) => u.email.toLowerCase() === formData.email.trim().toLowerCase());
    if (!userMatch) return alert("Bu e-posta adresi ile kayıtlı bir hesap bulunamadı!");
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    sendEmail(formData.email.trim(), code, userMatch.username).then((success) => {
        if (success) {
            alert("Şifre sıfırlama kodu mail adresinize gönderildi!");
            setAuthMode("verify_forgot");
        } else { alert("Mail gönderilirken hata oluştu!"); }
    });
  };

  const handleVerifyForgot = () => {
    if (!verificationCode.trim()) return alert("Lütfen doğrulama kodunu girin!");
    if (verificationCode.trim() === generatedCode.trim()) {
      setAuthMode("new_password");
      setVerificationCode(""); 
    } else { alert("Girdiğiniz kod yanlış! Kopyala-yapıştır yaparken fazladan boşluk bırakmadığınıza emin olun."); }
  };

  const handleSaveNewPassword = () => {
    if (!formData.password.trim()) return alert("Lütfen yeni bir şifre belirleyin!");
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const updatedUsers = users.map((u: any) => u.email === formData.email.trim() ? { ...u, password: formData.password.trim() } : u);
    localStorage.setItem("sinepro_database_users", JSON.stringify(updatedUsers));
    alert("Şifreniz başarıyla yenilendi! Şimdi giriş yapabilirsiniz.");
    setAuthMode("login");
  };

  const saveProfileSettings = () => {
    if (!currentUser.username.trim()) return alert("Kullanıcı adı boş bırakılamaz!");
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const isUsernameTaken = users.find((u: any) => u.username.toLowerCase() === currentUser.username.trim().toLowerCase() && u.email !== currentUser.email);
    if (isUsernameTaken) return alert("Bu kullanıcı adı başka birisi tarafından kullanılıyor!");
    
    const updatedUser = { ...currentUser, username: currentUser.username.trim() };
    const updatedUsers = users.map((u: any) => u.email === currentUser.email ? updatedUser : u);
    localStorage.setItem("sinepro_database_users", JSON.stringify(updatedUsers));
    localStorage.setItem("sinepro_active_session", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setShowProfileSettings(false);
  };

  const handleLogin = () => {
    if (!formData.email.trim() || !formData.password.trim()) return alert("Lütfen e-posta ve şifrenizi eksiksiz girin!");
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const match = users.find((u: any) => u.email.toLowerCase() === formData.email.trim().toLowerCase() && u.password === formData.password.trim());
    if (match) { 
      setCurrentUser(match); 
      localStorage.setItem("sinepro_active_session", JSON.stringify(match)); 
      setShowLogin(false); 
    }
    else alert("E-posta veya şifre hatalı!");
  };

  const handleLogout = () => {
    localStorage.removeItem("sinepro_active_session");
    setCurrentUser(null);
    setShowUserDropdown(false);
    setViewMode("home");
    setActiveBottomTab("home");
  };

  const startSecurityVerify = () => {
    if (!profilePassword.trim()) return alert("Lütfen belirlemek istediğiniz yeni şifreyi girin!");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    sendEmail(currentUser.email, code, currentUser.username).then((success) => {
        if (success) {
            setAuthMode("security_verify");
            setShowSecuritySettings(false);
            setShowLogin(true); 
            alert("Güvenliğiniz için mailinize onay kodu gönderildi.");
        }
    });
  };

  const handleSecurityUpdate = () => {
    if (!verificationCode.trim()) return alert("Lütfen doğrulama kodunu girin!");
    if (verificationCode.trim() === generatedCode.trim()) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      const updatedUser = { ...currentUser, password: profilePassword.trim() };
      const updatedUsers = users.map((u: any) => u.email === currentUser.email ? updatedUser : u);
      localStorage.setItem("sinepro_database_users", JSON.stringify(updatedUsers));
      localStorage.setItem("sinepro_active_session", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setShowLogin(false);
      setVerificationCode("");
      setProfilePassword("");
      alert("Şifreniz güvenli bir şekilde güncellendi!");
    } else { alert("Kod yanlış! Kopyala-yapıştır yaparken fazladan boşluk bırakmadığınıza emin olun."); }
  };

  const fetchExtraDetails = async (id: number, cType: "movie" | "tv" = contentType) => {
    try {
      const [detailsRes, similarRes, castRes, videosRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/${cType}/${id}?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${cType}/${id}/similar?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${cType}/${id}/credits?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${cType}/${id}/videos`, { headers: { Authorization: API_TOKEN } })
      ]);
      setSelectedItem((prev: any) => ({ ...(prev || {}), ...detailsRes.data }));
      setSimilar(similarRes.data.results?.slice(0, 15) || []);
      setCast(castRes.data.cast?.slice(0, 15) || []);
      const ytVideos = videosRes.data.results.filter((v: any) => v.site === "YouTube");
      const officialTrailer = ytVideos.find((v: any) => v.type === "Trailer");
      setTrailerKey(officialTrailer ? officialTrailer.key : (ytVideos.length > 0 ? ytVideos[0].key : null));
    } catch (err) { console.error(err); }
  };

  const shareMovie = async (item: any) => {
    triggerHaptic(); 
    const shareUrl = `${window.location.origin}/?id=${item.id}&type=${contentType}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SİNEPRO | ${item.title || item.name}`,
          text: `Bu harika yapımı SİNEPRO'da buldum: ${item.title || item.name}!\n\nTMDB Puanı: ${item.vote_average?.toFixed(1)}\n\n`,
          url: shareUrl, 
        });
      } catch (err) { console.log("Paylaşım iptal edildi veya hata oluştu."); }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Bağlantı başarıyla kopyalandı! İstediğiniz yere yapıştırabilirsiniz.");
    }
  };

  const getMyComments = () => {
    let myComments: any[] = [];
    if (currentUser) {
        Object.values(comments).forEach((itemComments: any) => {
            myComments = [...myComments, ...itemComments.filter((c: any) => c.user === currentUser.username)];
        });
        myComments.sort((a, b) => commentsSort === "newest" ? b.id - a.id : a.id - b.id);
    }
    return myComments;
  };

  const addComment = () => {
    if (!currentUser) return setShowLogin(true);
    if (!newComment.trim()) return;
    const itemID = selectedItem.id;
    const commentObj = {
      id: Date.now(), user: currentUser.username, avatar: currentUser.avatar, text: newComment.trim(),
      rating: commentRating, date: new Date().toLocaleDateString('tr-TR'),
      itemTitle: selectedItem.title || selectedItem.name, itemID: selectedItem.id,
      itemData: selectedItem, 
      contentType: contentType,
      likes: 0,
      likedBy: [],
      replies: []
    };
    const updatedComments = { ...comments, [itemID]: [commentObj, ...(comments[itemID] || [])] };
    setComments(updatedComments);
    localStorage.setItem("sinepro_comments", JSON.stringify(updatedComments));
    setNewComment("");
    triggerHaptic(); 
  };

  const handleReplySubmit = (itemID: number, commentID: number, originalUser: string, itemTitle: string) => {
    if (!currentUser) { setAuthMode("login"); setShowLogin(true); return; }
    if (!replyText.trim()) return;

    const newReply = {
      id: Date.now(),
      user: currentUser.username,
      avatar: currentUser.avatar,
      text: replyText.trim(),
      date: new Date().toLocaleDateString('tr-TR')
    };

    const updatedComments = { ...comments };
    const targetComments = updatedComments[itemID] || [];
    const cIndex = targetComments.findIndex((c: any) => c.id === commentID);

    if (cIndex > -1) {
      const c = targetComments[cIndex];
      c.replies = [...(c.replies || []), newReply];

      if (originalUser !== currentUser.username) {
         const authorNotifKey = `sinepro_notifications_${originalUser}`;
         const authorNotifs = JSON.parse(localStorage.getItem(authorNotifKey) || "[]");
         const newNotif = {
             id: Date.now(),
             text: `@${currentUser.username}, "${itemTitle}" yapımındaki yorumuna bir cevap yazdı! 💬`,
             isRead: false,
             date: new Date().toLocaleDateString('tr-TR')
         };
         authorNotifs.unshift(newNotif);
         localStorage.setItem(authorNotifKey, JSON.stringify(authorNotifs));
      }
    }

    setComments(updatedComments);
    localStorage.setItem("sinepro_comments", JSON.stringify(updatedComments));
    setReplyText("");
    setReplyingToId(null);
    triggerHaptic();
  };

  const deleteReply = (itemID: number, commentID: number, replyID: number) => {
    const updatedComments = { ...comments };
    const targetComments = updatedComments[itemID] || [];
    const cIndex = targetComments.findIndex((c: any) => c.id === commentID);

    if (cIndex > -1) {
        targetComments[cIndex].replies = targetComments[cIndex].replies.filter((r: any) => r.id !== replyID);
    }

    setComments(updatedComments);
    localStorage.setItem("sinepro_comments", JSON.stringify(updatedComments));
  };

  const toggleLikeComment = (e: any, itemID: number, commentID: number) => {
    e.stopPropagation();
    if (!currentUser) {
        setAuthMode("login");
        setShowLogin(true);
        return;
    }
    triggerHaptic();

    const itemComments = comments[itemID] || [];
    const updatedComments = itemComments.map((c: any) => {
        if (c.id === commentID) {
            const hasLiked = c.likedBy?.includes(currentUser.username);
            const newLikedBy = hasLiked
                ? c.likedBy.filter((u: string) => u !== currentUser.username)
                : [...(c.likedBy || []), currentUser.username];

            if (!hasLiked && c.user !== currentUser.username) {
                const authorNotifKey = `sinepro_notifications_${c.user}`;
                const authorNotifs = JSON.parse(localStorage.getItem(authorNotifKey) || "[]");
                const newNotif = {
                    id: Date.now(),
                    text: `@${currentUser.username}, "${c.itemTitle}" yapımındaki yorumunu beğendi! ❤️`,
                    isRead: false,
                    date: new Date().toLocaleDateString('tr-TR')
                };
                authorNotifs.unshift(newNotif);
                localStorage.setItem(authorNotifKey, JSON.stringify(authorNotifs));
            }

            return { ...c, likedBy: newLikedBy, likes: newLikedBy.length };
        }
        return c;
    });

    const newAllComments = { ...comments, [itemID]: updatedComments };
    setComments(newAllComments);
    localStorage.setItem("sinepro_comments", JSON.stringify(newAllComments));
  };

  const deleteComment = (itemID: number, commentID: number) => {
    const updatedComments = { ...comments, [itemID]: comments[itemID].filter((c: any) => c.id !== commentID) };
    setComments(updatedComments);
    localStorage.setItem("sinepro_comments", JSON.stringify(updatedComments));
  };

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("sinepro_dark_mode");
    if (savedMode !== null) setIsDarkMode(JSON.parse(savedMode));

    const session = localStorage.getItem("sinepro_active_session");
    if (session) setCurrentUser(JSON.parse(session));
    const savedFavs = localStorage.getItem("sinepro_favs");
    const savedComments = localStorage.getItem("sinepro_comments");
    const savedHistory = localStorage.getItem("sinepro_recently_viewed");
    const savedTheme = localStorage.getItem("sinepro_theme");
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedComments) setComments(JSON.parse(savedComments));
    if (savedHistory) setRecentlyViewed(JSON.parse(savedHistory));
    if (savedTheme) setTheme(JSON.parse(savedTheme));

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowUserDropdown(false);
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
          setIsSearchFocused(false);
          setIsSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('id');
    const sharedType = params.get('type') as "movie" | "tv";
    if (sharedId && sharedType) {
       setTimeout(() => {
           setContentType(sharedType);
           if (sharedType === "movie") setActiveBottomTab("movies");
           if (sharedType === "tv") setActiveBottomTab("tv");
           fetchExtraDetails(Number(sharedId), sharedType);
       }, 500); 
       window.history.replaceState({}, document.title, window.location.pathname);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!mounted || viewMode !== "home") return;
    setIsLoading(true); 
    try {
      const getUrl = (page: number) => searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=${page}`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=200&language=tr-TR&page=${page}`;
      
      const responses = await Promise.all([
        axios.get(getUrl(1), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(2), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(3), { headers: { Authorization: API_TOKEN } }),
        axios.get(getUrl(4), { headers: { Authorization: API_TOKEN } })
      ]);
      
      setItems([
        ...responses[0].data.results, 
        ...responses[1].data.results, 
        ...responses[2].data.results, 
        ...responses[3].data.results
      ]);
      setVisibleCount(40); 
      setCurrentPage(2);

      if (!searchQuery && newReleases.length === 0) {
        const resC = await axios.get(`https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } });
        setNewReleases(resC.data.results);
      }
    } catch (err) { console.error(err); }
    setIsLoading(false); 
  };

  const handleLoadMore = async () => {
    const nextCount = visibleCount + 15;
    if (nextCount > items.length) {
      const nextPage = currentPage + 1;
      const getUrl = (page: number) => searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&language=tr-TR&page=${page}`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&vote_count.gte=200&language=tr-TR&page=${page}`;
      try {
        const res = await axios.get(getUrl(nextPage), { headers: { Authorization: API_TOKEN } });
        setItems(prev => [...prev, ...res.data.results]);
        setCurrentPage(nextPage);
      } catch (err) { console.error(err); }
    }
    setVisibleCount(nextCount);
  };

  useEffect(() => { if (mounted) fetchData(); }, [searchQuery, contentType, selectedGenre, sortBy, viewMode, mounted]);

  const toggleFavorite = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    triggerHaptic(); 
    if (!currentUser) {
       alert("Özellik Kilitli: Favorilere eklemek veya favori listenizi görmek için önce giriş yapmalısın!");
       setAuthMode("login");
       setShowLogin(true);
       return;
    }
    let updated = favorites.find(f => f.id === item.id) ? favorites.filter(f => f.id !== item.id) : [...favorites, item];
    setFavorites(updated);
    localStorage.setItem("sinepro_favs", JSON.stringify(updated));
  };

  const handleScrollClick = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      ref.current.scrollTo({ left: direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth, behavior: 'smooth' });
    }
  };

  const calculateProRating = (itemID: number) => {
    const itemComments = comments[itemID] || [];
    const ratedComments = itemComments.filter((c: any) => c.rating);
    if (ratedComments.length === 0) return null;
    const totalScore = ratedComments.reduce((sum: number, c: any) => sum + c.rating, 0);
    return (totalScore / ratedComments.length).toFixed(1);
  };

  const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') { e.preventDefault(); action(); }
  };

  // YENİ EKLENEN: DESTEK TALEBİ GÖNDERME
  const handleSupportSubmit = () => {
    if(!supportForm.message.trim()) return alert("Lütfen bir mesaj yazın!");
    alert("Destek talebiniz başarıyla alındı! Ekibimiz e-posta üzerinden en kısa sürede dönüş yapacaktır.");
    setSupportForm({...supportForm, message: ""});
  };

  const displayNotifs = currentUser 
      ? notifications 
      : [{ id: 'guest', text: 'SİNEPRO\'ya Hoş Geldin! 🎉\nŞu an misafir modundasın. Favori listesi oluşturmak, yorum yapmak, SİNE Aİ ile sohbet etmek ve içeriklere puan vermek için giriş yapabilirsin. Gelecek güncellemeleri de buradan duyuracağız.', isRead: guestNotifSeen, date: 'Sistem Panosu' }];

  if (!mounted) return null;

  return (
    <main style={{ backgroundColor: bgMain, minHeight: '100vh', color: textMain, fontFamily: 'sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { margin: 0; padding: 0; overflow-x: hidden; width: 100%; }
        @keyframes heartbeat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.3; }
        }
        @keyframes logoGlow {
          0%, 100% { filter: drop-shadow(0 0 5px ${activeColor}40); }
          50% { filter: drop-shadow(0 0 15px ${activeColor}); }
        }
        @keyframes aiTyping {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .skeleton-box {
          background: linear-gradient(90deg, ${isDarkMode ? '#1F2833' : '#e0e0e0'} 25%, ${isDarkMode ? '#2b3746' : '#f5f5f5'} 50%, ${isDarkMode ? '#1F2833' : '#e0e0e0'} 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite; width: 100%;
        }

        .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 25px; padding: 30px 5%; position: relative; z-index: 1; }
        .hover-effect { transition: 0.4s ease; position: relative; border-radius: 12px; border: 1px solid ${borderColor}; }
        .hover-effect:hover { transform: translateY(-10px); box-shadow: 0 0 25px ${activeColor}66; }
        .horizontal-scroll { display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; scroll-behavior: smooth; padding: 10px 0; }
        .side-nav-btn { position: absolute; top: 120px; background: ${isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}; color: ${activeColor}; border: 1px solid ${borderColor}; width: 40px; height: 70px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 4px; }
        .section-title { color: ${activeColor}; padding-left: 15px; font-size: 18px; border-left: 4px solid ${activeColor}; margin-left: 5%; font-weight: 900; text-transform: uppercase; }
        .category-btn { padding: 6px 18px; border-radius: 20px; border: 1px solid ${theme.secondary}; cursor: pointer; white-space: nowrap; transition: 0.3s; font-weight: bold; background: transparent; color: ${activeColor}; }
        
        .fav-heart-btn { position: absolute; top: 6px; right: 8px; background: transparent; display: flex; align-items: center; justify-content: center; font-size: 22px; z-index: 10; border: none; cursor: pointer; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
        .fav-heart-btn:hover { transform: scale(1.2); }

        .rating-badge-pro { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.85); color: ${theme.color}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 900; z-index: 5; border: 1px solid ${theme.color}40; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }

        .history-btn { background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; border: 1px solid ${borderColor}; color: ${textMuted}; font-size: 13px; cursor: pointer; transition: 0.3s; padding: 6px 14px; border-radius: 8px; font-weight: bold; }
        .history-btn:hover { background: ${activeColor}; color: ${badgeText}; border-color: ${activeColor}; transform: translateY(-2px); box-shadow: 0 5px 15px ${activeColor}40; }
        
        .load-more-btn { background: transparent; border: 2px solid ${activeColor}; color: ${activeColor}; padding: 12px 30px; border-radius: 25px; font-weight: bold; cursor: pointer; font-size: 15px; transition: 0.3s; margin: 0 auto 50px auto; display: block; }
        .load-more-btn:hover { background: ${activeColor}; color: ${badgeText}; box-shadow: 0 0 20px ${activeColor}66; }

        .modal-box { max-width: 90vw; width: 100%; border-radius: 25px; border: 1px solid ${activeColor}; max-height: 90vh; overflow-y: auto; }
        .ai-modal { max-width: 500px; height: 650px; }
        .auth-modal { max-width: 380px; padding: 40px; }
        .profile-modal { max-width: 450px; padding: 30px; }
        .theme-modal { max-width: 400px; padding: 40px; }
        
        .search-container { position: relative; display: flex; align-items: center; justify-content: flex-end; }
        .search-input-box { width: ${isSearchExpanded ? '250px' : '40px'}; height: 40px; border-radius: 20px; background: ${isSearchExpanded ? bgCard : 'transparent'}; border: 1px solid ${isSearchExpanded ? borderColor : 'transparent'}; color: ${textMain}; padding: ${isSearchExpanded ? '0 40px 0 20px' : '0'}; outline: none; transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); opacity: ${isSearchExpanded ? 1 : 0}; cursor: ${isSearchExpanded ? 'text' : 'default'}; }
        .search-icon-btn { position: absolute; right: 0; width: 40px; height: 40px; border-radius: 50%; background: ${isSearchExpanded ? 'transparent' : activeColor}; color: ${isSearchExpanded ? textLight : badgeText}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: 0.3s; z-index: 10; box-shadow: ${isSearchExpanded ? 'none' : `0 0 10px ${activeColor}80`}; }
        
        .search-dropdown { width: 320px; max-width: 90vw; }
        .detail-poster-img { width: 280px; }
        .detail-title-text { font-size: 44px; }
        .nav-wrapper { display: flex; justify-content: space-between; align-items: center; padding: 15px 15px; }
        
        .share-btn { background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; color: ${activeColor}; padding: 8px 15px; border-radius: 8px; border: 1px solid ${borderColor}; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-left: auto; transition: 0.3s; }
        .share-btn:hover { background: ${activeColor}; color: ${badgeText}; }

        .bottom-bar { display: none; }
        .mobile-menu-btn { background: ${inputBg}; color: ${textMain}; border: 1px solid ${borderColor}; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .mobile-menu-btn:active { background: ${activeColor}; color: ${badgeText}; }
        .movie-detail-overlay { position: fixed; inset: 0; background: ${bgMain}; z-index: 10000; overflow-y: auto; padding-bottom: 100px; }

        @media (max-width: 768px) {
          .nav-wrapper { padding: 12px 20px !important; }
          .nav-wrapper > div:first-child { flex: 1; justify-content: flex-start !important; }
          .nav-wrapper > div:last-child { flex: 1; justify-content: flex-end !important; gap: 15px !important; }
          .hide-on-mobile { display: none !important; }
          .search-container { margin-top: 0 !important; width: auto !important; }
          .search-input-box { width: ${isSearchExpanded ? '200px' : '40px'} !important; min-width: ${isSearchExpanded ? '200px' : '40px'}; }
          
          .hide-carousels-mobile { display: none !important; }

          .horizontal-scroll { scroll-snap-type: x mandatory; padding-bottom: 15px; scroll-padding-left: 5%; }
          .horizontal-scroll > div { scroll-snap-align: start; scroll-snap-stop: always; }
          
          .side-nav-btn { display: none !important; } 
          .movie-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important; gap: 15px !important; padding: 20px 2% !important; }
          
          .movie-detail-overlay { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding-bottom: 80px; }
          .detail-title-text { font-size: 28px !important; text-align: center; }
          .detail-poster-img { width: 200px !important; max-width: 80vw; margin: 0 auto; display: block; }
          .detail-top-flex { flex-direction: column; align-items: center; gap: 20px !important; }
          
          .share-btn { margin-left: 0 !important; width: 100%; justify-content: center; padding: 12px; margin-top: 10px; }

          .ai-modal { height: 85vh !important; }
          .category-btn { font-size: 13px; padding: 6px 14px; }
          .section-title { font-size: 16px !important; margin-left: 2% !important; }
          .auth-modal, .theme-modal, .profile-modal { padding: 25px !important; }
          .comments-inputs { flex-direction: column; }
          
          body { padding-bottom: 70px; }
          .bottom-bar { display: flex; position: fixed; bottom: 0; left: 0; width: 100%; background: ${navBg}; backdrop-filter: blur(10px); border-top: 1px solid ${borderColor}; z-index: 9900; padding: 10px 10px calc(10px + env(safe-area-inset-bottom)) 10px; justify-content: space-between; align-items: center; }
          
          .bottom-bar-item { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; color: ${textLight}; cursor: pointer; gap: 4px; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent; position: relative; }
          .bottom-icon { font-size: 22px; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; }
          .bottom-text { font-size: 11px; font-weight: bold; transition: 0.3s; opacity: 0.7; }
          
          .bottom-bar-item.active .bottom-icon { background: ${activeColor}; color: ${badgeText}; transform: translateY(-4px) scale(1.1); box-shadow: 0 4px 15px ${activeColor}80; }
          .bottom-bar-item.active .bottom-text { opacity: 1; color: ${activeColor}; }

          .ai-center-btn { background: ${activeColor}; color: ${badgeText}; width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26px; transform: translateY(-20px); box-shadow: 0 5px 20px ${activeColor}80; border: 4px solid ${bgMain}; }
          .donate-btn { bottom: 100px !important; }
        }
      ` }} />

      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '80vw', background: `radial-gradient(circle, ${activeColor}40 0%, transparent 65%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none', animation: 'heartbeat 3s infinite' }} />

      <nav className="nav-wrapper" style={{ background: navBg, backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div onClick={() => { setActiveBottomTab("home"); setViewMode("home"); setContentType("movie"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); window.scrollTo({top:0, behavior:'smooth'});}} style={{ cursor: 'pointer' }}>
              <SineProLogo activeColor={activeColor} badgeText={badgeText} />
          </div>
          <div className="hide-on-mobile" style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setActiveBottomTab("movies"); setContentType("movie"); setViewMode("home"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); setIsSearchExpanded(false); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: activeBottomTab === "movies" ? activeColor : theme.secondary }}>FİLMLER</button>
            <button onClick={() => { setActiveBottomTab("tv"); setContentType("tv"); setViewMode("home"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); setIsSearchExpanded(false); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: activeBottomTab === "tv" ? activeColor : theme.secondary }}>DİZİLER</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyItems: 'flex-end' }}>
          
          <button className="hide-on-mobile" onClick={() => setShowSineAI(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px' }} title="SİNE Aİ Asistan">
             <span style={{ color: activeColor, fontWeight: '900', fontSize: '18px' }}>SİNE</span>
             <span style={{ backgroundColor: activeColor, color: badgeText, padding: '2px 6px', borderRadius: '4px', fontSize: '14px', fontWeight: '900', marginLeft: '4px', boxShadow: `0 0 10px ${activeColor}80` }}>Aİ</span>
          </button>

          <div style={{ position: 'relative' }} ref={bellRef}>
             <button onClick={() => {
                 setShowNotifications(!showNotifications);
                 if (!currentUser) { setGuestNotifSeen(true); sessionStorage.setItem("sinepro_guest_notif", "true"); }
                 else if (!showNotifications) markNotifsAsRead();
             }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', margin: '0 5px', position: 'relative' }} title="Bildirimler">
                🔔
                {((!currentUser && !guestNotifSeen) || (currentUser && displayNotifs.filter(n => !n.isRead).length > 0)) && (
                    <span style={{ position: 'absolute', top: '0px', right: '0px', background: '#ff4d4d', border: `2px solid ${navBg}`, width: '12px', height: '12px', borderRadius: '50%', animation: 'heartbeat 1.5s infinite' }}></span>
                )}
             </button>
             {showNotifications && (
                 <div style={{ position: 'absolute', top: '45px', right: '-60px', width: '320px', background: bgCard, borderRadius: '12px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 3000 }}>
                    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                       <span style={{ fontWeight: 'bold', color: activeColor, fontSize: '15px' }}>{currentUser ? "Bildirimleriniz" : "Sistem Panosu"}</span>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                       {displayNotifs.length > 0 ? displayNotifs.map(n => (
                          <div key={n.id} onClick={() => { if(!currentUser) { setShowNotifications(false); setAuthMode("login"); setShowLogin(true); } }} style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: n.isRead ? 'transparent' : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', display: 'flex', gap: '15px', alignItems: 'center', cursor: !currentUser ? 'pointer' : 'default' }}>
                             <span style={{ fontSize: '22px' }}>{n.text.includes('Hoş Geldin') ? '🎉' : n.text.includes('Kilitli') ? '🔒' : n.text.includes('cevap') ? '💬' : '❤️'}</span>
                             <div>
                                <p style={{ margin: 0, fontSize: '13px', color: textMain, lineHeight: '1.4' }}>{n.text}</p>
                                <span style={{ fontSize: '11px', color: textLight, marginTop: '5px', display: 'block' }}>{n.date}</span>
                             </div>
                          </div>
                       )) : <div style={{ padding: '20px', textAlign: 'center', color: textLight, fontSize: '13px' }}>Henüz bildiriminiz yok.</div>}
                    </div>
                    
                    {currentUser && (
                        <div onClick={() => { setViewMode("notifications"); setActiveBottomTab("profile"); setShowNotifications(false); }} style={{ padding: '12px', textAlign: 'center', color: activeColor, fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', borderTop: `1px solid ${borderColor}` }}>Tüm Bildirimleri Gör</div>
                    )}
                 </div>
             )}
          </div>

          <button onClick={() => { const newMode = !isDarkMode; setIsDarkMode(newMode); localStorage.setItem("sinepro_dark_mode", JSON.stringify(newMode)); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', margin: '0 5px' }} title={isDarkMode ? "Açık Moda Geç" : "Koyu Moda Geç"}>{isDarkMode ? "☀️" : "🌙"}</button>

          <div className="search-container" ref={searchRef}>
            <input type="text" className="search-input-box" ref={searchInputRef} placeholder="Film veya Dizi Ara..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onFocus={() => setIsSearchFocused(true)} onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery(searchInput); setIsSearchFocused(false); setIsSearchExpanded(false); setViewMode("home"); } }} />
            <button className="search-icon-btn" onClick={() => { if (isSearchExpanded) { setIsSearchExpanded(false); setSearchInput(""); setIsSearchFocused(false); } else { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 100); } }}>
                {isSearchExpanded ? "✕" : "🔍"}
            </button>
            {isSearchExpanded && searchInput && isSearchFocused && (
              <div className="search-dropdown" style={{ position: 'absolute', top: '45px', right: 0, background: bgCard, borderRadius: '12px', border: `1px solid ${borderColor}`, overflow: 'hidden', zIndex: 2000, boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
                {liveResults.length > 0 ? (
                  <>
                    {liveResults.slice(0, 5).map(item => (
                      <div key={item.id} onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); addToRecentlyViewed(item); setIsSearchFocused(false); setIsSearchExpanded(false); setSearchInput(""); setSearchQuery(""); }} style={{ display: 'flex', gap: '12px', padding: '10px', borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', transition: '0.3s' }} className="search-item-hover">
                        <img src={getImgUrl(item.poster_path, 'w92')} style={{ width: '40px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} alt="" />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: textMain, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title || item.name}</p>
                          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: activeColor, fontWeight: 'bold' }}>⭐ {item.vote_average?.toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                    <div onMouseDown={(e) => { e.preventDefault(); setSearchQuery(searchInput); setIsSearchFocused(false); setIsSearchExpanded(false); setViewMode("home"); }} style={{ padding: '12px', textAlign: 'center', color: activeColor, fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', borderTop: `1px solid ${borderColor}` }} className="search-item-hover">Tüm Sonuçları Gör</div>
                  </>
                ) : <div style={{ padding: '20px', textAlign: 'center', color: textMuted, fontSize: '14px' }}>"{searchInput}" ile eşleşen sonuç bulunamadı.</div>}
              </div>
            )}
          </div>

          <div className="hide-on-mobile">
            {currentUser ? (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div onClick={() => setShowUserDropdown(!showUserDropdown)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: bgCard, padding: '5px 12px', borderRadius: '25px', border: `1px solid ${borderColor}` }}>
                  <span style={{ color: activeColor, fontWeight: 'bold' }}>{currentUser.username}</span>
                  <UserAvatar user={currentUser} size="30px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                </div>
                {showUserDropdown && (
                  <div style={{ position: 'absolute', top: '45px', right: 0, width: '220px', background: bgCard, borderRadius: '12px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div onClick={() => { setShowProfileSettings(true); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>⚙️ Profil Ayarlarım</div>
                    <div onClick={() => { setShowSecuritySettings(true); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>🔒 Güvenlik Ayarları</div>
                    <div onClick={() => { setViewMode("stats"); setActiveBottomTab("profile"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>📊 İstatistiklerim</div>
                    <div onClick={() => { setShowThemeSettings(true); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>🎨 Tema Değiştir</div>
                    <div onClick={() => { setViewMode("favorites"); setActiveBottomTab("profile"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>❤️ Beğendiklerim</div>
                    <div onClick={() => { setViewMode("my_comments"); setActiveBottomTab("profile"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>💬 Son Yorumlarım</div>
                    
                    <div onClick={() => { setViewMode("about"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>ℹ️ Hakkımızda</div>
                    <div onClick={() => { setViewMode("support"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>❓ Yardım ve Destek</div>
                    
                    <div onClick={handleLogout} style={{ padding: '12px 20px', cursor: 'pointer', color: '#ff4d4d' }}>🚪 Çıkış Yap</div>
                  </div>
                )}
              </div>
            ) : <button onClick={() => {setAuthMode("login"); setShowLogin(true);}} style={{ background: activeColor, color: badgeText, padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '13px' }}>GİRİŞ YAP</button>}
          </div>

        </div>
      </nav>

      <div className="bottom-bar">
         <div className={`bottom-bar-item ${activeBottomTab === 'home' && !searchQuery ? 'active' : ''}`} onClick={() => { setActiveBottomTab("home"); setContentType("movie"); setViewMode("home"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); setIsSearchExpanded(false); window.scrollTo({top:0, behavior:'smooth'}); }}>
             <span className="bottom-icon">🏠</span><span className="bottom-text">Anasayfa</span>
         </div>
         <div className={`bottom-bar-item ${activeBottomTab === 'movies' && !searchQuery ? 'active' : ''}`} onClick={() => { setActiveBottomTab("movies"); setContentType("movie"); setViewMode("home"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); setIsSearchExpanded(false); window.scrollTo({top:0, behavior:'smooth'}); }}>
             <span className="bottom-icon">🎬</span><span className="bottom-text">Filmler</span>
         </div>
         <div className="bottom-bar-item" onClick={() => setShowSineAI(true)}>
             <div className="ai-center-btn">🤖</div><span style={{ color: activeColor, marginTop: '-15px', textShadow: `0 0 5px ${activeColor}80`, fontWeight: 'bold' }}>SİNE Aİ</span>
         </div>
         <div className={`bottom-bar-item ${activeBottomTab === 'tv' && !searchQuery ? 'active' : ''}`} onClick={() => { setActiveBottomTab("tv"); setContentType("tv"); setViewMode("home"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); setIsSearchExpanded(false); window.scrollTo({top:0, behavior:'smooth'}); }}>
             <span className="bottom-icon">📺</span><span className="bottom-text">Diziler</span>
         </div>
         <div className={`bottom-bar-item ${activeBottomTab === 'profile' || (viewMode !== 'home' && viewMode !== 'about' && viewMode !== 'support') ? 'active' : ''}`} onClick={() => { setActiveBottomTab("profile"); currentUser ? setShowMobileMenu(true) : setShowLogin(true); }}>
             <span className="bottom-icon">{currentUser ? <div style={{ transition: '0.3s' }}><UserAvatar user={currentUser} size="24px" fontSize="10px" activeColor={activeColor} theme={theme} badgeText={badgeText} /></div> : "👤"}</span>
             <span className="bottom-text">{currentUser ? "Profil" : "Giriş"}</span>
         </div>
      </div>

      {showMobileMenu && currentUser && (
        <div onClick={() => setShowMobileMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9950, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', background: bgCard, borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '25px', borderTop: `2px solid ${activeColor}`, boxShadow: `0 -10px 40px ${activeColor}40`, animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
             <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><div style={{ width: '40px', height: '5px', background: borderColor, borderRadius: '10px' }}></div></div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '20px' }}>
                <UserAvatar user={currentUser} size="60px" fontSize="24px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                <div><h3 style={{ margin: 0, color: activeColor, fontSize: '20px' }}>@{currentUser.username}</h3><p style={{ margin: 0, fontSize: '13px', color: textLight }}>{currentUser.email}</p></div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => { setShowProfileSettings(true); setShowMobileMenu(false); }} className="mobile-menu-btn">⚙️ Profil Ayarları</button>
                <button onClick={() => { setShowSecuritySettings(true); setShowMobileMenu(false); }} className="mobile-menu-btn">🔒 Güvenlik</button>
                <button onClick={() => { setViewMode("stats"); setShowMobileMenu(false); }} className="mobile-menu-btn">📊 İstatistiklerim</button>
                <button onClick={() => { setShowThemeSettings(true); setShowMobileMenu(false); }} className="mobile-menu-btn">🎨 Tema Seç</button>
                <button onClick={() => { setViewMode("favorites"); setShowMobileMenu(false); }} className="mobile-menu-btn">❤️ Favorilerim</button>
                <button onClick={() => { setViewMode("my_comments"); setShowMobileMenu(false); }} className="mobile-menu-btn">💬 Yorumlarım</button>
                
                <button onClick={() => { setViewMode("about"); setShowMobileMenu(false); }} className="mobile-menu-btn">ℹ️ Hakkımızda</button>
                <button onClick={() => { setViewMode("support"); setShowMobileMenu(false); }} className="mobile-menu-btn">❓ Yardım & Destek</button>
             </div>
             <button onClick={() => { handleLogout(); setShowMobileMenu(false); }} style={{ width: '100%', padding: '15px', background: 'rgba(255,0,0,0.1)', color: '#ff4d4d', border: '1px solid rgba(255,0,0,0.3)', borderRadius: '15px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', fontSize: '16px' }}>🚪 Çıkış Yap</button>
          </div>
        </div>
      )}

      {/* --- ANA SAYFA --- */}
      {viewMode === "home" && (
        <>
          {!searchQuery && (
            <div style={{ padding: '15px 5%', display: 'flex', gap: '10px', overflowX: 'auto', scrollbarWidth: 'none', position: 'relative', zIndex: 1 }}>
              <button onClick={() => setSelectedGenre(null)} className="category-btn" style={{ background: selectedGenre === null ? activeColor : 'transparent', color: selectedGenre === null ? badgeText : activeColor }}>TÜMÜ</button>
              {genres.map(g => (
                <button key={g.id} onClick={() => setSelectedGenre(g.id)} className="category-btn" style={{ background: selectedGenre === g.id ? activeColor : 'transparent', color: selectedGenre === g.id ? badgeText : activeColor }}>{g.name}</button>
              ))}
            </div>
          )}

          {!searchQuery && recentlyViewed.length > 0 && showHistory && (
            <div className={activeBottomTab !== 'home' ? 'hide-carousels-mobile' : ''} style={{ position: 'relative', marginTop: '10px', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '5%' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>SON BAKTIKLARIM</h3>
                  <div style={{ display: 'flex', gap: '15px' }}>
                      <button onClick={clearRecentlyViewed} className="history-btn">🗑️ Temizle</button>
                      <button onClick={toggleHistoryPref} className="history-btn">✖ Gizle</button>
                  </div>
              </div>
              <div style={{ position: 'relative', padding: '0 5%' }}>
                <button className="side-nav-btn" style={{ left: '1%' }} onClick={() => handleScrollClick(recentScrollRef, 'left')}>❮</button>
                <button className="side-nav-btn" style={{ right: '1%' }} onClick={() => handleScrollClick(recentScrollRef, 'right')}>❯</button>
                <div className="horizontal-scroll" ref={recentScrollRef}>
                  {recentlyViewed.map((item) => (
                    <div key={item.id} style={{ minWidth: '150px', textAlign: 'center', cursor: 'pointer' }}>
                      <div onClick={() => { setSelectedItem(item); addToRecentlyViewed(item); fetchExtraDetails(item.id); }} className="hover-effect" style={{ height: '220px', overflow: 'hidden', borderRadius: '10px', position: 'relative' }}>
                        <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        <div onClick={(e) => toggleFavorite(e, item)} className="fav-heart-btn">{favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}</div>
                        <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
                      </div>
                      <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!searchQuery && (
            <div className={activeBottomTab !== 'home' ? 'hide-carousels-mobile' : ''} style={{ position: 'relative', marginTop: '30px', zIndex: 1 }} onMouseEnter={() => setIsHoveringCarousel(true)} onMouseLeave={() => setIsHoveringCarousel(false)}>
              <h3 className="section-title">ÖNE ÇIKANLAR</h3>
              <div style={{ position: 'relative', padding: '0 5%' }}>
                <button className="side-nav-btn" style={{ left: '1%' }} onClick={() => handleScrollClick(mainNewScrollRef, 'left')}>❮</button>
                <button className="side-nav-btn" style={{ right: '1%' }} onClick={() => handleScrollClick(mainNewScrollRef, 'right')}>❯</button>
                <div className="horizontal-scroll" ref={mainNewScrollRef}>
                  {isLoading ? (
                    Array(10).fill(0).map((_, i) => (
                      <div key={i} style={{ minWidth: '200px' }}><SkeletonCard isDarkMode={isDarkMode} /></div>
                    ))
                  ) : (
                    newReleases.map((item) => (
                      <div key={item.id} style={{ minWidth: '200px', textAlign: 'center', cursor: 'pointer' }}>
                        <div onClick={() => { setSelectedItem(item); addToRecentlyViewed(item); fetchExtraDetails(item.id); }} className="hover-effect" style={{ height: '280px', overflow: 'hidden', borderRadius: '12px', position: 'relative' }}>
                          <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          <div onClick={(e) => toggleFavorite(e, item)} className="fav-heart-btn">{favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}</div>
                          <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
                        </div>
                        <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {searchQuery ? (
            <div style={{ marginTop: '30px', padding: '15px 5%', background: `linear-gradient(to right, ${activeColor}20, transparent)`, borderLeft: `5px solid ${activeColor}` }}>
               <h2 style={{ margin: 0, color: textMain, fontSize: '24px' }}>
                  <span style={{ color: activeColor }}>"{searchQuery}"</span> için sonuçlar
               </h2>
               <p style={{ margin: '5px 0 0 0', color: textLight, fontSize: '14px' }}>{items.length} sonuç listeleniyor.</p>
            </div>
          ) : (
            <h3 className="section-title" style={{ marginTop: '30px' }}>
              {selectedGenre ? genres.find(g => g.id === selectedGenre)?.name : "TÜMÜ"}
            </h3>
          )}
          
          <div className="movie-grid">
            {isLoading ? (
               Array(20).fill(0).map((_, i) => <SkeletonCard key={i} isDarkMode={isDarkMode} />)
            ) : (
              items.slice(0, visibleCount).map((item, idx) => (
                <div key={`${item.id}-${idx}`} style={{ textAlign: 'center', cursor: 'pointer' }}>
                  <div onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); addToRecentlyViewed(item); }} className="hover-effect" style={{ height: '270px', overflow: 'hidden', borderRadius: '15px', position: 'relative' }}>
                    <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <div onClick={(e) => toggleFavorite(e, item)} className="fav-heart-btn">{favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}</div>
                    <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
                  </div>
                  <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
                </div>
              ))
            )}
          </div>

          {!isLoading && items.length >= visibleCount && (
             <button onClick={handleLoadMore} className="load-more-btn">
                Daha Fazla Göster ({visibleCount})
             </button>
          )}
        </>
      )}

      {/* --- FAVORİLERİM EKRANI --- */}
      {viewMode === "favorites" && (
        <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '30px' }}>❤️ BEĞENDİKLERİM</h2>
            {favorites.length > 0 ? (
                <div className="movie-grid" style={{ padding: 0 }}>
                    {favorites.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} style={{ textAlign: 'center', cursor: 'pointer' }}>
                            <div onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); addToRecentlyViewed(item); }} className="hover-effect" style={{ height: '270px', overflow: 'hidden', borderRadius: '15px', position: 'relative' }}>
                                <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                <div onClick={(e) => toggleFavorite(e, item)} className="fav-heart-btn">❤️</div>
                                <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
                            </div>
                            <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginTop: '50px', color: textLight, fontSize: '16px' }}>Favori listen şu an boş. Hoşuna giden yapımları kalple! 🤍</div>
            )}
        </div>
      )}

      {/* --- SON YORUMLARIM EKRANI --- */}
      {viewMode === "my_comments" && (
        <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '30px' }}>💬 SON YORUMLARIM</h2>
            {getMyComments().length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {getMyComments().map(c => (
                        <div key={c.id} onClick={() => { setContentType(c.contentType); setSelectedItem(c.itemData); fetchExtraDetails(c.itemID, c.contentType); }} style={{ background: bgCard, padding: '20px', borderRadius: '15px', borderLeft: `4px solid ${activeColor}`, cursor: 'pointer', transition: '0.3s' }} className="hover-effect">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <h4 style={{ color: activeColor, margin: 0, fontSize: '16px' }}>{c.itemTitle}</h4>
                                <span style={{ color: textLight, fontSize: '12px' }}>{c.date}</span>
                            </div>
                            <p style={{ margin: '10px 0', color: textMain, lineHeight: '1.6' }}>{c.text}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: `1px solid ${borderColor}`, paddingTop: '15px' }}>
                                <span style={{ fontSize: '13px', color: activeColor, fontWeight: 'bold' }}>⭐ Verdiğin Puan: {c.rating}</span>
                                <span style={{ fontSize: '13px', color: '#ff4d4d', fontWeight: 'bold' }}>❤️ Beğeni: {c.likes || 0}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginTop: '50px', color: textLight, fontSize: '16px' }}>Henüz hiçbir içeriğe yorum yapmadın. Hadi bir film izle ve fikrini toplulukla paylaş! 🍿</div>
            )}
        </div>
      )}

      {/* --- İSTATİSTİKLERİM EKRANI --- */}
      {viewMode === "stats" && (
        <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '30px' }}>📊 SİNEPRO İSTATİSTİKLERİN</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}>
                      <div style={{ fontSize: '50px', marginBottom: '10px' }}>❤️</div>
                      <h3 style={{ margin: '0 0 5px 0', color: activeColor, fontSize: '36px' }}>{favorites.length}</h3>
                      <p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Favori İçerik</p>
                 </div>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}>
                      <div style={{ fontSize: '50px', marginBottom: '10px' }}>💬</div>
                      <h3 style={{ margin: '0 0 5px 0', color: activeColor, fontSize: '36px' }}>{getMyComments().length}</h3>
                      <p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Yaptığın Yorum</p>
                 </div>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}>
                      <div style={{ fontSize: '50px', marginBottom: '10px' }}>👀</div>
                      <h3 style={{ margin: '0 0 5px 0', color: activeColor, fontSize: '36px' }}>{recentlyViewed.length}</h3>
                      <p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Son İncelenen</p>
                 </div>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}>
                      <div style={{ fontSize: '50px', marginBottom: '10px' }}>👍</div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#ff4d4d', fontSize: '36px' }}>{getMyComments().reduce((sum, c) => sum + (c.likes || 0), 0)}</h3>
                      <p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Aldığın Beğeni</p>
                 </div>
            </div>
        </div>
      )}

      {/* --- TÜM BİLDİRİMLER EKRANI --- */}
      {viewMode === "notifications" && (
         <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '30px' }}>🔔 TÜM BİLDİRİMLER</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               {currentUser && notifications.length > 0 ? (
                  notifications.map(n => (
                     <div key={n.id} style={{ background: bgCard, padding: '20px', borderRadius: '15px', borderLeft: `4px solid ${activeColor}`, display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <span style={{ fontSize: '30px' }}>{n.text.includes('hoş geldin') ? '🎉' : n.text.includes('cevap') ? '💬' : '❤️'}</span>
                        <div>
                           <p style={{ margin: 0, color: textMain, fontSize: '15px', lineHeight: '1.5' }}>{n.text}</p>
                           <span style={{ color: textLight, fontSize: '12px', marginTop: '8px', display: 'block' }}>{n.date}</span>
                        </div>
                     </div>
                  ))
               ) : !currentUser ? (
                  <div style={{ textAlign: 'center', marginTop: '50px', color: textLight, fontSize: '16px' }}>Bildirimleri görmek için giriş yapmalısın.</div>
               ) : (
                  <div style={{ textAlign: 'center', marginTop: '50px', color: textLight, fontSize: '16px' }}>Hiç bildiriminiz yok.</div>
               )}
            </div>
         </div>
      )}

      {/* --- HAKKIMIZDA EKRANI --- */}
      {viewMode === "about" && (
          <div style={{ padding: '40px 5%', minHeight: '70vh', position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
              <h2 className="section-title" style={{ marginBottom: '30px' }}>ℹ️ HAKKIMIZDA</h2>
              <div style={{ background: bgCard, padding: '30px', borderRadius: '20px', borderLeft: `5px solid ${activeColor}`, lineHeight: '1.8', color: textMain, fontSize: '15px', boxShadow: `0 10px 30px rgba(0,0,0,0.1)` }}>
                  <p><strong>SİNEPRO</strong>, bir film izleme sitesinden çok daha fazlası; sinema tutkunları için ilmek ilmek işlenmiş, vizyoner ve yepyeni bir sosyal deneyim platformudur.</p>
                  <p>Aylarca süren titiz bir geliştirme süreci, binlerce satır kod ve kullanıcı deneyimini (UX) kusursuzlaştırmak için harcanan uykusuz geceler sonucunda ortaya çıkan bu proje, klasik platformların eksiklerini kapatmak için tasarlandı. SİNE Aİ akıllı asistanımız, gerçek zamanlı bildirim sistemimiz ve gelişmiş topluluk özelliklerimizle sinema dünyasını tek bir merkeze topluyoruz.</p>
                  <p>Amacımız sadece ne izleyeceğini bulman değil, izlediğin yapımları seninle aynı zevkleri paylaşan insanlarla tartışabilmen ve SİNEPRO evreninin bir parçası olmandır. Bizi tercih ettiğiniz ve bu emeğe ortak olduğunuz için teşekkür ederiz!</p>
                  
                  <div style={{ marginTop: '30px', padding: '15px', background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '10px', fontSize: '13px', color: textMuted }}>
                      <p style={{ margin: 0, color: activeColor }}><strong>Yasal Uyarı & Veri Sağlayıcı:</strong></p>
                      <p style={{ margin: '5px 0 0 0' }}>Bu ürün TMDB (The Movie Database) API'sini kullanmaktadır ancak TMDB tarafından onaylanmamış veya sertifikalandırılmamıştır. Tüm film ve dizi verileri, afişler ve fragmanlar TMDB servislerinden anlık olarak çekilmektedir.</p>
                  </div>
              </div>
          </div>
      )}

      {/* --- YENİ EFSANE VİZYON: YARDIM VE DESTEK EKRANI --- */}
      {viewMode === "support" && (
          <div style={{ padding: '40px 5%', minHeight: '70vh', position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto' }}>
              <h2 className="section-title" style={{ marginBottom: '30px' }}>❓ YARDIM VE DESTEK</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                  
                  {/* AKORDİYON SSS KISMI */}
                  <div>
                      <h3 style={{ color: activeColor, marginTop: 0, borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px', marginBottom: '20px' }}>Sıkça Sorulan Sorular</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {faqs.map((faq, index) => (
                              <div key={index} style={{ background: bgCard, borderRadius: '12px', border: `1px solid ${expandedFaq === index ? activeColor : borderColor}`, overflow: 'hidden', transition: '0.3s' }}>
                                  <div onClick={() => setExpandedFaq(expandedFaq === index ? null : index)} style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedFaq === index ? (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : 'transparent' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: textMain }}>{faq.q}</span>
                                      <span style={{ color: activeColor, fontWeight: 'bold', fontSize: '18px', transition: 'transform 0.3s', transform: expandedFaq === index ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
                                  </div>
                                  {expandedFaq === index && (
                                      <div style={{ padding: '0 15px 15px 15px', color: textLight, fontSize: '13px', lineHeight: '1.6' }}>
                                          <div style={{ paddingTop: '10px', borderTop: `1px solid ${borderColor}` }}>{faq.a}</div>
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* DESTEK TALEBİ GÖNDERME FORMU */}
                  <div style={{ background: bgCard, padding: '30px', borderRadius: '20px', borderTop: `5px solid ${activeColor}`, boxShadow: `0 10px 30px rgba(0,0,0,0.1)`, height: 'fit-content' }}>
                      <h3 style={{ color: activeColor, marginTop: 0 }}>Hala yardıma mı ihtiyacın var?</h3>
                      <p style={{ fontSize: '13px', color: textLight, marginBottom: '25px', lineHeight: '1.5' }}>Sorunun cevabını yukarıda bulamadıysan veya bize bir hata bildirmek istiyorsan, hemen bir destek talebi (Ticket) oluştur. Ekibimiz en kısa sürede dönüş yapacaktır.</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <div>
                              <label style={{ fontSize: '12px', color: textMuted, marginBottom: '5px', display: 'block' }}>Kategori Seçin</label>
                              <select value={supportForm.category} onChange={(e) => setSupportForm({...supportForm, category: e.target.value})} style={{ width: '100%', background: inputBg, color: textMain, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '10px', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                  <option value="Hesap Problemi">Hesap & Giriş Problemi</option>
                                  <option value="Hata Bildirimi">Hata Bildirimi (Bug)</option>
                                  <option value="Telif Hakkı">Telif Hakkı İhlali</option>
                                  <option value="Öneri & İstek">Öneri & Geliştirme İsteği</option>
                                  <option value="Diğer">Diğer</option>
                              </select>
                          </div>
                          
                          <div>
                              <label style={{ fontSize: '12px', color: textMuted, marginBottom: '5px', display: 'block' }}>Mesajınız</label>
                              <textarea rows={5} placeholder="Yaşadığınız sorunu detaylıca anlatın..." value={supportForm.message} onChange={(e) => setSupportForm({...supportForm, message: e.target.value})} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '15px', borderRadius: '10px', color: textMain, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                          </div>
                          
                          <button onClick={handleSupportSubmit} style={{ width: '100%', background: activeColor, color: badgeText, border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', transition: '0.3s', boxShadow: `0 5px 15px ${activeColor}40` }}>
                              TALEBİ GÖNDER
                          </button>
                      </div>
                  </div>

              </div>
          </div>
      )}

      {/* --- FİLM & DİZİ DETAY PENCERESİ --- */}
      {selectedItem && (
        <div className="movie-detail-overlay">
          <div style={{ position: 'sticky', top: 0, zIndex: 1100, background: navBg, padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderColor}` }}>
            <h2 style={{ color: activeColor, fontSize: '18px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{selectedItem.title || selectedItem.name}</h2>
            <button onClick={() => { setSelectedItem(null); setTrailerKey(null); setActiveTrailerKey(null); }} style={{ background: activeColor, color: badgeText, padding: '8px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>KAPAT</button>
          </div>
          
          <div style={{ width: '100%', height: '55vh', backgroundImage: `linear-gradient(to bottom, transparent, ${bgMain}), url(${getImgUrl(selectedItem.backdrop_path, 'original')})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button onClick={() => {
                  if (trailerKey) setActiveTrailerKey(trailerKey);
                  else alert("Maalesef bu içerik için YouTube'da resmi bir fragman bulunamadı.");
              }} style={{ background: activeColor, color: badgeText, padding: '12px 35px', borderRadius: '50px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: `0 0 20px ${activeColor}80`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                ▶ FRAGMANI İZLE
              </button>
          </div>
          
          <div style={{ maxWidth: '1100px', margin: '-40px auto 0', padding: '0 5%' }}>
            <div className="detail-top-flex" style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
              <div className="detail-poster-container">
                <img src={getImgUrl(selectedItem.poster_path)} className="detail-poster-img" style={{ borderRadius: '15px', border: `1px solid ${borderColor}`, boxShadow: `0 0 20px ${activeColor}40` }} alt="" />
              </div>
              <div style={{ flex: 1, minWidth: '300px', paddingTop: '40px' }}>
                <h1 className="detail-title-text" style={{ color: activeColor, fontWeight: '900', marginBottom: '5px' }}>{selectedItem.title || selectedItem.name}</h1>
                
                {selectedItem.tagline && (
                  <p style={{ fontStyle: 'italic', color: activeColor, fontSize: '16px', marginTop: '0', marginBottom: '20px', opacity: 0.8 }}>"{selectedItem.tagline}"</p>
                )}
                
                <div className="detail-ratings-flex" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', margin: '20px 0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <span style={{ fontSize: '20px' }}>⭐ TMDB:</span>
                     <span style={{ color: activeColor, fontSize: '24px', fontWeight: 'bold' }}>{selectedItem.vote_average?.toFixed(1)}</span>
                   </div>
                   {calculateProRating(selectedItem.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `1px solid ${borderColor}`, paddingLeft: '20px' }}>
                        <span style={{ backgroundColor: activeColor, color: badgeText, padding: '2px 8px', borderRadius: '4px', fontSize: '14px', fontWeight: '900', boxShadow: `0 0 10px ${activeColor}99` }}>PRO</span>
                        <span style={{ color: activeColor, fontSize: '24px', fontWeight: 'bold' }}>{calculateProRating(selectedItem.id)}</span>
                    </div>
                   )}
                   
                   <button onClick={() => shareMovie(selectedItem)} className="share-btn">
                       📤 Paylaş
                   </button>
                </div>

                <p style={{ color: textMuted, lineHeight: '1.8', fontSize: '16px', marginBottom: '25px' }}>
                    {selectedItem.overview || "Bu içerik için henüz bir özet bulunmuyor."}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${activeColor}`, marginBottom: '20px' }}>
                  <div>
                    <div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Süre</div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>
                        {selectedItem.runtime || selectedItem.episode_run_time?.[0] ? `${selectedItem.runtime || selectedItem.episode_run_time?.[0]} dakika` : 'Bilinmiyor'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>İzlenme</div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>
                        {Math.floor(((selectedItem.popularity || 15) * 14500) + ((selectedItem.vote_count || 10) * 1150)).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Yıl - Ülke</div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>
                        {(selectedItem.release_date || selectedItem.first_air_date)?.substring(0,4) || 'Bilinmiyor'} • {selectedItem.production_countries?.[0]?.iso_3166_1 || 'Bilinmiyor'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Türler</div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: textMain }}>
                        {selectedItem.genres 
                            ? selectedItem.genres.map((g: any) => g.name).join(', ') 
                            : selectedItem.genre_ids 
                                ? selectedItem.genre_ids.map((id: number) => genres.find(g => g.id === id)?.name).filter(Boolean).join(', ') 
                                : 'Bilinmiyor'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Dil</div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>
                        {selectedItem.original_language?.toUpperCase() || 'Bilinmiyor'}
                    </div>
                  </div>
                  
                  {contentType === "movie" && selectedItem.revenue ? (
                    <div>
                        <div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Gişe (Hasılat)</div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: activeColor }}>
                            ${(selectedItem.revenue / 1000000).toFixed(1)}M
                        </div>
                    </div>
                  ) : contentType === "tv" && selectedItem.number_of_seasons ? (
                    <div>
                        <div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Sezon / Bölüm</div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: activeColor }}>
                            {selectedItem.number_of_seasons} Sezon • {selectedItem.number_of_episodes} Bölüm
                        </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {cast.length > 0 && (
              <div style={{ marginTop: '50px' }}>
                <h3 style={{ color: activeColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px', marginBottom: '20px' }}>OYUNCU KADROSU</h3>
                <div className="horizontal-scroll" ref={castScrollRef}>
                  {cast.map(person => (
                    <div key={person.id} style={{ minWidth: '100px', textAlign: 'center' }}>
                      <img src={person.profile_path ? getImgUrl(person.profile_path, 'w185') : 'https://via.placeholder.com/100x100?text=👤'} 
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.secondary}`, margin: '0 auto' }} alt="" />
                      <p style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '10px', color: textMain }}>{person.name}</p>
                      <p style={{ fontSize: '10px', color: textLight }}>{person.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {similar.length > 0 && (
              <div style={{ marginTop: '60px', position: 'relative' }}>
                <h3 style={{ color: activeColor, marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px' }}>BUNLARI DA SEVEBİLİRSİNİZ</h3>
                <button className="side-nav-btn" style={{ left: '-20px' }} onClick={() => handleScrollClick(modalScrollRef, 'left')}>❮</button>
                <button className="side-nav-btn" style={{ right: '-20px' }} onClick={() => handleScrollClick(modalScrollRef, 'right')}>❯</button>
                <div className="horizontal-scroll" ref={modalScrollRef}>
                   {similar.map((s) => (
                     <div key={s.id} style={{ minWidth: '140px', textAlign: 'center', cursor: 'pointer' }}>
                        <div onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); addToRecentlyViewed(s); }} className="hover-effect" style={{ height: '210px', overflow: 'hidden', borderRadius: '12px', position: 'relative' }}>
                           <img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                           <div onClick={(e) => toggleFavorite(e, s)} className="fav-heart-btn">{favorites.find(f => f.id === s.id) ? '❤️' : '🤍'}</div>
                           <div className="rating-badge-pro">★ {s.vote_average?.toFixed(1)}</div>
                        </div>
                        <p style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '13px', color: textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title || s.name}</p>
                     </div>
                   ))}
                </div>
              </div>
            )}

            <div id="comments-section" style={{ marginTop: '80px' }}>
                <h3 style={{ color: activeColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px' }}>TOPLULUK YORUMLARI & PUANLARI</h3>
                <div style={{ margin: '30px 0', background: bgCard, padding: '20px', borderRadius: '15px', border: `1px solid ${theme.secondary}` }}>
                   <div className="comments-inputs" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                     <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                        <UserAvatar user={currentUser} size="45px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                        <input type="text" placeholder={currentUser ? "Bu yapım hakkında ne düşünüyorsun?" : "Yorum yapmak için giriş yapmalısınız."} value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={!currentUser} onKeyDown={(e) => handleEnterKey(e, addComment)} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '12px 20px', borderRadius: '10px', color: textMain, outline: 'none' }} />
                     </div>
                     <select value={commentRating} onChange={(e) => setCommentRating(Number(e.target.value))} disabled={!currentUser} style={{ background: inputBg, color: activeColor, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '10px', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                        {[10,9,8,7,6,5,4,3,2,1].map(r => <option key={r} value={r}>{r} Puan</option>)}
                     </select>
                   </div>
                   <button onClick={addComment} style={{ background: activeColor, color: badgeText, border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>GÖNDER</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {(comments[selectedItem.id] || []).length > 0 ? (
                     comments[selectedItem.id].map((c: any) => (
                       <div key={c.id} style={{ background: bgCard, borderRadius: '10px', padding: '15px', borderLeft: `3px solid ${activeColor}`, position: 'relative' }}>
                          {currentUser && currentUser.username === c.user && (
                              <button onClick={(e) => { e.stopPropagation(); deleteComment(selectedItem.id, c.id); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: textLight, cursor: 'pointer', fontSize: '14px' }}>❌</button>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div onClick={(e) => { e.stopPropagation(); setZoomedAvatar({ username: c.user, avatar: c.avatar }); }} style={{ cursor: 'pointer' }} title="Profili Büyüt">
                                   <UserAvatar user={{ username: c.user, avatar: c.avatar }} size="32px" fontSize="12px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                                </div>
                                <span style={{ color: activeColor, fontWeight: 'bold', fontSize: '14px' }}>@{c.user}</span>
                                <span style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: activeColor, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>Puan: {c.rating}</span>
                             </div>
                             <span style={{ color: textLight, fontSize: '11px' }}>{c.date}</span>
                          </div>
                          <p style={{ margin: 0, color: textMuted, lineHeight: '1.6', fontSize: '14px', marginBottom: '10px' }}>{c.text}</p>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderTop: `1px solid ${borderColor}`, paddingTop: '10px', marginTop: '10px' }}>
                              <button onClick={(e) => toggleLikeComment(e, selectedItem.id, c.id)} style={{ background: c.likedBy?.includes(currentUser?.username) ? 'rgba(255,0,0,0.1)' : 'transparent', border: `1px solid ${c.likedBy?.includes(currentUser?.username) ? '#ff4d4d' : borderColor}`, borderRadius: '20px', padding: '4px 10px', color: c.likedBy?.includes(currentUser?.username) ? '#ff4d4d' : textLight, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: '0.3s', fontWeight: 'bold' }}>
                                  {c.likedBy?.includes(currentUser?.username) ? '❤️' : '🤍'} {c.likes || 0}
                              </button>
                              
                              <button onClick={() => {
                                  if (!currentUser) { setAuthMode("login"); setShowLogin(true); return; }
                                  if (replyingToId === c.id) { setReplyingToId(null); }
                                  else { setReplyingToId(c.id); setReplyText(""); }
                              }} style={{ background: 'transparent', border: 'none', color: textLight, fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                                  💬 Cevapla
                              </button>
                          </div>

                          {/* İÇ İÇE YORUMLAR (CEVAPLAR) LİSTESİ */}
                          {c.replies && c.replies.length > 0 && (
                             <div style={{ marginLeft: '40px', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {c.replies.map((r: any) => (
                                   <div key={r.id} style={{ position: 'relative', background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', padding: '10px 15px', borderRadius: '10px', borderLeft: `2px solid ${theme.secondary}` }}>
                                      {currentUser && currentUser.username === r.user && (
                                          <button onClick={(e) => { e.stopPropagation(); deleteReply(selectedItem.id, c.id, r.id); }} style={{ position: 'absolute', top: '5px', right: '10px', background: 'transparent', border: 'none', color: textLight, cursor: 'pointer', fontSize: '12px' }}>❌</button>
                                      )}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', paddingRight: '20px' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <UserAvatar user={{ username: r.user, avatar: r.avatar }} size="24px" fontSize="10px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                                            <span style={{ color: activeColor, fontWeight: 'bold', fontSize: '12px' }}>@{r.user}</span>
                                         </div>
                                         <span style={{ color: textLight, fontSize: '10px' }}>{r.date}</span>
                                      </div>
                                      <p style={{ margin: 0, color: textMuted, fontSize: '13px', lineHeight: '1.4' }}>{r.text}</p>
                                   </div>
                                ))}
                             </div>
                          )}

                          {/* CEVAP YAZMA KUTUSU */}
                          {replyingToId === c.id && (
                             <div style={{ marginLeft: '40px', marginTop: '10px', display: 'flex', gap: '10px' }}>
                                 <input type="text" placeholder={`@${c.user} adlı kullanıcıya yanıt ver...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '8px 15px', borderRadius: '8px', color: textMain, fontSize: '13px', outline: 'none' }} onKeyDown={(e) => { if(e.key === 'Enter') handleReplySubmit(selectedItem.id, c.id, c.user, selectedItem.title || selectedItem.name); }} />
                                 <button onClick={() => handleReplySubmit(selectedItem.id, c.id, c.user, selectedItem.title || selectedItem.name)} style={{ background: activeColor, color: badgeText, border: 'none', padding: '0 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Gönder</button>
                             </div>
                          )}

                       </div>
                     ))
                   ) : <p style={{ color: textLight, textAlign: 'center', marginTop: '30px' }}>Henüz yorum yapılmamış.</p>}
                </div>
             </div>
             
             {/* TEMİZLENEN ALT KISIM */}
             <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: textMuted, borderTop: `1px solid ${borderColor}`, marginTop: '80px', marginBottom: '40px' }}>
                 <p>© {new Date().getFullYear()} SİNEPRO. Tüm hakları saklıdır.</p>
             </div>
          </div>
        </div>
      )}

      {showSineAI && (
        <div onClick={() => setShowSineAI(false)} style={{ position: 'fixed', inset: 0, background: modalBg, backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div className="modal-box ai-modal" onClick={(e) => e.stopPropagation()} style={{ background: aiModalContentBg, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: `0 0 40px ${activeColor}40` }}>
            <div style={{ background: aiHeaderBg, padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${activeColor}40` }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🤖</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: activeColor, fontSize: '18px', fontWeight: '900' }}>SİNE</span>
                      <span style={{ backgroundColor: activeColor, color: badgeText, padding: '2px 8px', borderRadius: '4px', fontSize: '14px', fontWeight: '900', marginLeft: '4px', boxShadow: `0 0 10px ${activeColor}66` }}>Aİ</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: textLight, marginTop: '2px' }}>Akıllı Asistan</p>
                  </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button onClick={() => setAiChatHistory([initialAIMessage])} style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', color: '#ff4d4d', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>🗑️ Sil</button>
                  <button onClick={() => setShowSineAI(false)} style={{ background: 'transparent', border: 'none', color: textLight, fontSize: '20px', cursor: 'pointer' }}>✕</button>
               </div>
            </div>
            
            <div ref={chatScrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
               {aiChatHistory.map((msg, idx) => (
                 <div key={idx} style={{ alignSelf: msg.role === "user" ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div style={{ background: msg.role === "user" ? activeColor : inputBg, color: msg.role === "user" ? badgeText : textMain, padding: '12px 18px', borderRadius: msg.role === "user" ? '20px 20px 0 20px' : '20px 20px 20px 0', border: msg.role === "ai" ? `1px solid ${borderColor}` : 'none', fontSize: '14px', lineHeight: '1.5' }}>
                       {msg.text}
                    </div>
                    {msg.results && msg.results.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                         {msg.results.map((r: any) => (
                           <div key={r.id} onClick={() => { setSelectedItem(r); fetchExtraDetails(r.id); addToRecentlyViewed(r); setShowSineAI(false); }} style={{ background: inputBg, borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: `1px solid ${activeColor}40`, transition: '0.3s' }} className="hover-effect">
                              <img src={getImgUrl(r.poster_path, 'w185')} style={{ width: '100%', height: '120px', objectFit: 'cover' }} alt="" />
                              <div style={{ padding: '8px' }}>
                                <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title || r.name}</p>
                                <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: activeColor }}>⭐ {r.vote_average?.toFixed(1)}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>
               ))}
               {isAITyping && (
                 <div style={{ alignSelf: 'flex-start', background: inputBg, border: `1px solid ${borderColor}`, padding: '12px 18px', borderRadius: '20px 20px 20px 0', display: 'flex', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', background: activeColor, borderRadius: '50%', animation: 'aiTyping 1s infinite' }}></span>
                    <span style={{ width: '8px', height: '8px', background: activeColor, borderRadius: '50%', animation: 'aiTyping 1s infinite 0.2s' }}></span>
                    <span style={{ width: '8px', height: '8px', background: activeColor, borderRadius: '50%', animation: 'aiTyping 1s infinite 0.4s' }}></span>
                 </div>
               )}
            </div>

            <div style={{ padding: '15px', background: aiHeaderBg, borderTop: `1px solid ${activeColor}40`, display: 'flex', gap: '10px', alignItems: 'center' }}>
               <button onClick={startListening} title="Sesli Komut" style={{ background: isListening ? '#ff4d4d' : inputBg, color: isListening ? 'white' : activeColor, border: `1px solid ${borderColor}`, width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s', fontSize: '18px', boxShadow: isListening ? '0 0 15px rgba(255,0,0,0.6)' : 'none' }}>
                  🎤
               </button>
               <input type="text" placeholder={isListening ? "Dinleniyor..." : "Sohbet et veya film iste..."} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => handleEnterKey(e, handleAISubmit)} disabled={isAITyping || isListening} style={{ flex: 1, background: bgCard, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '20px', color: textMain, outline: 'none' }} />
               <button onClick={handleAISubmit} disabled={isAITyping || !aiPrompt.trim()} style={{ background: activeColor, border: 'none', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (isAITyping || !aiPrompt.trim()) ? 'not-allowed' : 'pointer', opacity: (isAITyping || !aiPrompt.trim()) ? 0.5 : 1 }}>
                  <span style={{ color: badgeText, fontWeight: 'bold' }}>➤</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div className="modal-box auth-modal" style={{ background: bgCard }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><SineProLogo activeColor={activeColor} badgeText={badgeText} fontSize="30px" /></div>
            
            <div>
              {authMode === "security_verify" ? (
                <>
                  <h4 style={{ color: activeColor, textAlign: 'center', marginBottom: '20px' }}>Güvenlik Doğrulaması</h4>
                  <input type="text" placeholder="6 Haneli Kod" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} onKeyDown={(e) => handleEnterKey(e, handleSecurityUpdate)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '15px', borderRadius: '12px', color: textMain, fontSize: '20px', textAlign: 'center' }} />
                  <button onClick={handleSecurityUpdate} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '12px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', border: 'none' }}>ŞİFREYİ DEĞİŞTİR</button>
                </>
              ) : authMode === "verify" || authMode === "verify_forgot" ? (
                <>
                  <h4 style={{ color: activeColor, textAlign: 'center', marginBottom: '20px' }}>E-posta Doğrulama</h4>
                  <input type="text" placeholder="6 Haneli Kod" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} onKeyDown={(e) => handleEnterKey(e, authMode === "verify" ? handleVerifyAndFinish : handleVerifyForgot)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '15px', borderRadius: '12px', color: textMain, fontSize: '20px', textAlign: 'center' }} />
                  <button onClick={authMode === "verify" ? handleVerifyAndFinish : handleVerifyForgot} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '12px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', border: 'none' }}>DOĞRULA</button>
                </>
              ) : authMode === "new_password" ? (
                <>
                   <h4 style={{ color: activeColor, textAlign: 'center', marginBottom: '20px' }}>Yeni Şifre Belirle</h4>
                   <div style={{ position: 'relative', marginBottom: '15px' }}>
                      <input type={showPassword ? "text" : "password"} placeholder="Yeni Şifreniz" onChange={(e) => setFormData({...formData, password: e.target.value})} onKeyDown={(e) => handleEnterKey(e, handleSaveNewPassword)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '15px', borderRadius: '12px', color: textMain, paddingRight: '45px' }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: showPassword ? 1 : 0.6 }}>{showPassword ? "👁️" : "🙈"}</button>
                   </div>
                   <button onClick={handleSaveNewPassword} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '12px', fontWeight: 'bold', marginTop: '5px', cursor: 'pointer', border: 'none' }}>KAYDET</button>
                </>
              ) : authMode === "forgot_password" ? (
                <>
                   <h4 style={{ color: activeColor, textAlign: 'center', marginBottom: '20px' }}>Şifremi Unuttum</h4>
                   <input type="email" placeholder="Kayıtlı E-posta Adresiniz" onChange={(e) => setFormData({...formData, email: e.target.value})} onKeyDown={(e) => handleEnterKey(e, handleForgotPasswordStart)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '15px', borderRadius: '12px', color: textMain }} />
                   <button onClick={handleForgotPasswordStart} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '12px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', border: 'none' }}>KOD GÖNDER</button>
                   <p onClick={() => setAuthMode("login")} style={{ textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: activeColor }}>Giriş Yap'a Dön</p>
                </>
              ) : (
                <>
                  {authMode === "register" && <input type="text" placeholder="Kullanıcı Adı" onChange={(e) => setFormData({...formData, username: e.target.value})} onKeyDown={(e) => handleEnterKey(e, handleRegisterStart)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '10px', color: textMain, marginBottom: '15px' }} />}
                  <input type="email" placeholder="E-posta" onChange={(e) => setFormData({...formData, email: e.target.value})} onKeyDown={(e) => handleEnterKey(e, authMode === "login" ? handleLogin : handleRegisterStart)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '10px', color: textMain, marginBottom: '15px' }} />
                  
                  <div style={{ position: 'relative', marginBottom: '15px' }}>
                     <input type={showPassword ? "text" : "password"} placeholder="Şifre" onChange={(e) => setFormData({...formData, password: e.target.value})} onKeyDown={(e) => handleEnterKey(e, authMode === "login" ? handleLogin : handleRegisterStart)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '10px', color: textMain, paddingRight: '45px' }} />
                     <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: showPassword ? 1 : 0.6 }}>{showPassword ? "👁️" : "🙈"}</button>
                  </div>
                  
                  {authMode === "login" && <p onClick={() => setAuthMode("forgot_password")} style={{ textAlign: 'right', marginTop: '0', marginBottom: '15px', cursor: 'pointer', color: textLight, fontSize: '13px' }}>Şifremi Unuttum</p>}
                  
                  <button onClick={authMode === "login" ? handleLogin : handleRegisterStart} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>{authMode === "login" ? "GİRİŞ YAP" : "KAYIT OL"}</button>
                  <p onClick={() => setAuthMode(authMode === "login" ? "register" : "login")} style={{ textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: theme.secondary, fontSize: '14px' }}>{authMode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}</p>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px', borderTop: `1px solid ${borderColor}`, paddingTop: '15px' }}>
                 <span onClick={() => { setShowLogin(false); setViewMode("about"); }} style={{ cursor: 'pointer', fontSize: '12px', color: textLight, fontWeight: 'bold' }}>ℹ️ Hakkımızda</span>
                 <span onClick={() => { setShowLogin(false); setViewMode("support"); }} style={{ cursor: 'pointer', fontSize: '12px', color: textLight, fontWeight: 'bold' }}>❓ Yardım & Destek</span>
            </div>

            <button onClick={() => setShowLogin(false)} style={{ width: '100%', background: 'none', border: 'none', color: textLight, marginTop: '10px', cursor: 'pointer' }}>Kapat</button>
          </div>
        </div>
      )}

      {showProfileSettings && (
        <div style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div className="modal-box profile-modal" style={{ background: bgCard }}>
            <h3 style={{ color: activeColor, textAlign: 'center', marginTop: 0 }}>Profil Ayarlarım</h3>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}><UserAvatar user={currentUser} size="80px" fontSize="30px" activeColor={activeColor} theme={theme} badgeText={badgeText} /></div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {(() => {
                    const baseAvatars = ["default", "/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg", "/7.jpg", "/8.jpg"];
                    const displayAvatars = [...baseAvatars];
                    if (currentUser?.uploadedAvatar) {
                        if (!displayAvatars.includes(currentUser.uploadedAvatar)) displayAvatars.splice(1, 0, currentUser.uploadedAvatar);
                    } else if (currentUser?.avatar && !baseAvatars.includes(currentUser.avatar)) {
                         displayAvatars.splice(1, 0, currentUser.avatar);
                    }
                    return displayAvatars.map((av, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            {av === "default" ? (
                                <div onClick={() => setCurrentUser({...currentUser, avatar: av})} style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(45deg, ${activeColor}, ${theme.secondary})`, color: badgeText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', border: currentUser.avatar === av ? `2px solid ${activeColor}` : `1px solid ${borderColor}` }}>
                                    {currentUser?.username?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                            ) : (
                                <img src={av} onClick={() => setCurrentUser({...currentUser, avatar: av})} style={{ width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', objectFit: 'cover', border: currentUser.avatar === av ? `2px solid ${activeColor}` : `1px solid ${borderColor}` }} alt="avatar" />
                            )}
                            {currentUser?.uploadedAvatar === av && av !== "default" && (
                                <button onClick={(e) => { e.stopPropagation(); const isCurrent = currentUser.avatar === av; setCurrentUser({ ...currentUser, uploadedAvatar: null, avatar: isCurrent ? "default" : currentUser.avatar }); }} style={{ position: 'absolute', top: '-5px', right: '-5px', background: activeColor, color: badgeText, border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: `0 0 5px ${activeColor}80` }} title="Bu Fotoğrafı Kaldır">✕</button>
                            )}
                        </div>
                    ));
                })()}
                <div onClick={() => fileInputRef.current?.click()} style={{ width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', border: `2px dashed ${textLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: textLight, transition: '0.3s' }} title="Kendi Fotoğrafını Yükle">+</div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: textMuted }}>Kullanıcı Adı</label>
              <input type="text" value={currentUser?.username} onChange={(e) => setCurrentUser({...currentUser, username: e.target.value})} onKeyDown={(e) => handleEnterKey(e, saveProfileSettings)} style={{ width: '100%', background: inputBg, border: `1px solid ${theme.secondary}`, padding: '12px', borderRadius: '8px', color: textMain, marginTop: '5px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', background: inputBg, padding: '10px 15px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                  <span style={{ fontSize: '13px', color: textMuted }}>Son Baktıklarımı Göster</span>
                  <button onClick={toggleHistoryPref} style={{ background: showHistory ? activeColor : borderColor, color: showHistory ? badgeText : textLight, border: 'none', padding: '5px 15px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>{showHistory ? "AÇIK" : "KAPALI"}</button>
              </div>
              <button onClick={saveProfileSettings} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '10px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', border: 'none' }}>KAYDET</button>
            </div>
            <button onClick={() => setShowProfileSettings(false)} style={{ width: '100%', background: 'none', color: textLight, marginTop: '10px', cursor: 'pointer', border: 'none' }}>Vazgeç</button>
          </div>
        </div>
      )}

      {showSecuritySettings && (
        <div style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div className="modal-box profile-modal" style={{ background: bgCard }}>
            <h3 style={{ textAlign: 'center', color: activeColor, marginBottom: '20px', marginTop: 0 }}>🔒 GÜVENLİK AYARLARI</h3>
            <p style={{ fontSize: '12px', color: textLight, marginBottom: '20px' }}>Mevcut Mail: {currentUser?.email}</p>
            <div>
               <div style={{ position: 'relative', marginBottom: '20px' }}>
                 <input type={showProfilePassword ? "text" : "password"} placeholder="Yeni Şifre" onChange={(e) => setProfilePassword(e.target.value)} onKeyDown={(e) => handleEnterKey(e, startSecurityVerify)} style={{ width: '100%', background: inputBg, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '10px', color: textMain, paddingRight: '45px' }} />
                 <button type="button" onClick={() => setShowProfilePassword(!showProfilePassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: showProfilePassword ? 1 : 0.6 }}>{showProfilePassword ? "👁️" : "🙈"}</button>
               </div>
               <button onClick={startSecurityVerify} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>KOD GÖNDER VE GÜNCELLE</button>
            </div>
            <button onClick={() => setShowSecuritySettings(false)} style={{ width: '100%', background: 'none', border: 'none', color: textLight, marginTop: '10px', cursor: 'pointer' }}>Vazgeç</button>
          </div>
        </div>
      )}

      {zoomedAvatar && (
        <div onClick={() => setZoomedAvatar(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', cursor: 'zoom-out' }}>
           <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <UserAvatar user={{ username: zoomedAvatar.username, avatar: zoomedAvatar.avatar }} size="200px" fontSize="80px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
              <button onClick={() => setZoomedAvatar(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: activeColor, color: badgeText, border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', fontWeight: 'bold', boxShadow: `0 0 15px ${activeColor}80` }}>✕</button>
           </div>
           <h3 style={{ color: activeColor, marginTop: '25px', fontSize: '28px', textShadow: `0 0 10px ${activeColor}66` }}>@{zoomedAvatar.username}</h3>
        </div>
      )}

      {showThemeSettings && (
        <div style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div className="modal-box theme-modal" style={{ background: bgCard }}>
            <h3 style={{ textAlign: 'center', color: activeColor, marginBottom: '30px' }}>RENK TEMANI SEÇ</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {themes.map(t => {
                const adjustedTColor = getAdjustedColor(t.name, t.color);
                return (
                <div key={t.name} onClick={() => { setTheme(t); localStorage.setItem("sinepro_theme", JSON.stringify(t)); }} 
                  style={{ padding: '15px', borderRadius: '12px', background: theme.name === t.name ? activeColor : inputBg, color: theme.name === t.name ? badgeText : textMain, cursor: 'pointer', textAlign: 'center', fontWeight: 'bold', border: `2px solid ${adjustedTColor}` }}>
                  {t.name}
                </div>
              )})}
            </div>
            <button onClick={() => setShowThemeSettings(false)} style={{ width: '100%', marginTop: '30px', padding: '12px', background: activeColor, color: badgeText, borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>KAPAT</button>
          </div>
        </div>
      )}

      {activeTrailerKey && (
        <div onClick={() => setActiveTrailerKey(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
           <div style={{ position: 'relative', width: '100%', maxWidth: '1000px', aspectRatio: '16/9' }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setActiveTrailerKey(null)} style={{ position: 'absolute', top: '-15px', right: '-10px', background: activeColor, color: badgeText, border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold', boxShadow: `0 0 15px ${activeColor}80`, zIndex: 10 }}>✕</button>
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen style={{ borderRadius: '15px', border: `2px solid ${activeColor}`, background: 'black', boxShadow: `0 10px 40px ${activeColor}40` }}></iframe>
           </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9900 }} className="donate-btn">
        <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" style={{ background: `linear-gradient(45deg, ${activeColor}, ${theme.secondary})`, color: badgeText, padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 4px 15px ${activeColor}40` }}>
          <span>💎 DESTEK OL</span>
        </a>
      </div>

      <SpeedInsights />
    </main>
  );
}