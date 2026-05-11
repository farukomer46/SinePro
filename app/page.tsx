"use client";

import React, { useEffect, useState, useMemo, useRef, ChangeEvent } from 'react';
import axios from 'axios';
import { SpeedInsights } from "@vercel/speed-insights/next";
import emailjs from '@emailjs/browser';
import { registerUser, loginUser, syncFavoritesToFirebase, getFavoritesFromFirebase } from '@/lib/auth-functions';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, setDoc, deleteDoc } from "firebase/firestore";
import SocialPanel from '@/components/SocialPanel';
import { sendFriendRequest } from '@/lib/social-functions';

const API_TOKEN = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjNzlkZTI0MDY3NmYxMDJjM2VmYjQzNjQ2MzFhYTQxYSIsIm5iZiI6MTc3NzMxNDk5Ny41Miwic3ViIjoiNjllZmFjYjVjNmJjMzVlODFmODExNGU3Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.cnbxIvgci9RstPITQDeK2w6HzD3Db7qyY52LzR0qdAQ";

// --- YARDIMCI BİLEŞENLER ---
const UserAvatar = ({ user, size = "35px", fontSize = "14px", activeColor, theme, badgeText }: any) => {
  if (user?.avatar && user.avatar !== "default") return <img src={user.avatar} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${activeColor}` }} alt="" />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(45deg, ${activeColor}, ${theme?.secondary || activeColor})`, color: badgeText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: fontSize }}>{user?.username?.charAt(0)?.toUpperCase() || "?"}</div>;
};

const SineProLogo = ({ style, fontSize = '28px', proSize = '22px', activeColor, badgeText, hidePro = false }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', animation: 'logoGlow 2.5s infinite', ...style }}>
    <span style={{ color: activeColor, fontSize, fontWeight: '900', zIndex: 2, position: 'relative' }}>SİNE</span>
    <div style={{
       overflow: 'hidden',
       maxWidth: hidePro ? '0px' : '100px',
       opacity: hidePro ? 0 : 1,
       transform: hidePro ? 'translateX(-20px) scale(0.8)' : 'translateX(0) scale(1)',
       transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <span style={{ backgroundColor: activeColor, color: badgeText, padding: '2px 8px', borderRadius: '4px', fontSize: proSize, fontWeight: '900', marginLeft: '4px', display: 'block' }}>PRO</span>
    </div>
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
  const [viewMode, setViewMode] = useState<"home" | "favorites" | "my_comments" | "stats" | "notifications" | "about" | "support" | "history" | "global_chat" | "profile">("home");
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
  const [isSpoiler, setIsSpoiler] = useState(false); 

  const [replyingToId, setReplyingToId] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false); 
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false); 
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify" | "forgot_password" | "verify_forgot" | "new_password" | "security_verify">("login");
  
  const [zoomedAvatar, setZoomedAvatar] = useState<{username: string, avatar: string, banner?: string | null, bio?: string, stats?: {posts: number, followers: number, following: number}} | null>(null);

  const [showSineAI, setShowSineAI] = useState(false);
  const [showAILeaderboard, setShowAILeaderboard] = useState(false);
  const [showSocialPanel, setShowSocialPanel] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [isListening, setIsListening] = useState(false); 

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [guestNotifSeen, setGuestNotifSeen] = useState(false);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [supportForm, setSupportForm] = useState({ category: "Hesap Problemi", message: "" });

  const initialAIMessage = { role: "ai", text: "Merhaba! Ben SİNE Aİ Asistanın 🤖. Benimle sinema hakkında sohbet edebilir, ruh haline göre tavsiyeler isteyebilirsin." };
  const [aiChatHistory, setAiChatHistory] = useState<any[]>([initialAIMessage]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
const [showCommentBox, setShowCommentBox] = useState(false);
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
  const bannerInputRef = useRef<HTMLInputElement | null>(null); 
  const isPoppingRef = useRef(false);

  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false); 
  const [activeBottomTab, setActiveBottomTab] = useState("home"); 

  // --- KÜRESEL SOHBET MOTORLARI ---
  const [globalMessages, setGlobalMessages] = useState<any[]>([]);
  const [newGlobalMessage, setNewGlobalMessage] = useState("");
  const [globalMessageImage, setGlobalMessageImage] = useState<string | null>(null);
  const [zoomedChatImage, setZoomedChatImage] = useState<string | null>(null);
  const globalChatScrollRef = useRef<HTMLDivElement | null>(null);

  // --- YENİ: INSTAGRAM TARZI PROFİL VE GÖNDERİ MOTORLARI ---
  const [profileTab, setProfileTab] = useState<"posts" | "settings">("posts");
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const currentUsername = (currentUser as any)?.username || null;

  useEffect(() => {
    if (viewMode === "profile" && currentUsername) {
      const q = query(collection(db, "user_posts"), where("username", "==", currentUsername), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [viewMode, currentUsername]);

  const handlePostImageSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: any) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        const MAX = 1000;
        if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
        else if (height > MAX) { width *= MAX / height; height = MAX; }
        
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setNewPostImage(canvas.toDataURL('image/jpeg', 0.7));
        }
      };
      if (event.target?.result) img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const sharePost = async () => {
      if (!newPostImage || !currentUsername) return;
      try {
          await addDoc(collection(db, "user_posts"), {
              username: currentUsername,
              avatar: (currentUser as any)?.avatar || "default",
              image: newPostImage,
              caption: newPostCaption,
              likes: [],
              date: new Date().toLocaleDateString('tr-TR'),
              createdAt: serverTimestamp()
          });
          setNewPostImage(null);
          setNewPostCaption("");
          triggerHaptic();
      } catch (e: any) {
          console.error(e);
          alert("Gönderi paylaşılamadı! Hata: " + e.message);
      }
  };

  const handlePostLike = async (postId: string, currentLikes: string[] = []) => {
      if (!currentUser) return alert("Beğenmek için giriş yapın!");
      const postRef = doc(db, "user_posts", postId);
      if (currentLikes.includes(currentUser.username)) {
          await updateDoc(postRef, { likes: arrayRemove(currentUser.username) });
      } else {
          await updateDoc(postRef, { likes: arrayUnion(currentUser.username) });
      }
  };
  const handleDeleteComment = async (postId: string, commentToDelete: any) => {
    if (!selectedPost) return;

    // 1. Ekranı (Arayüzü) anında güncelle
    const updatedComments = selectedPost.comments.filter((c: any) => 
      // Hem kullanıcı adı hem de metin eşleşiyorsa o yorumu listeden çıkar
      !(c.username === commentToDelete.username && c.text === commentToDelete.text)
    );
    
    setSelectedPost({ ...selectedPost, comments: updatedComments });

    // 2. Veritabanında (Firestore) kalıcı olarak güncelle
    try {
      const postRef = doc(db, "posts", postId);
      await setDoc(postRef, { comments: updatedComments }, { merge: true });
    } catch (error) {
      console.error("Yorum silinirken hata oluştu:", error);
      alert("Yorum silinemedi, lütfen tekrar deneyin.");
    }
  };


  // --- BÜTÜN FONKSİYONLAR ---
  const getUserRank = (commentCount: number) => {
    if (commentCount >= 500) return { name: "SİNE-LORD", color: "#FF0055", icon: "👑", perkStyle: { borderLeft: `4px solid #FF0055`, boxShadow: `0 0 20px rgba(255,0,85,0.2)`, background: 'linear-gradient(to right, rgba(255,0,85,0.05), transparent)' }, isLord: true, isVIP: true };
    if (commentCount >= 150) return { name: "Kült Yönetmen", color: "#FFD700", icon: "🎬", perkStyle: { borderLeft: `4px solid #FFD700`, boxShadow: `0 0 10px rgba(255,215,0,0.1)` }, isLord: false, isVIP: true };
    if (commentCount >= 50) return { name: "Baş Eleştirmen", color: "#9D00FF", icon: "👁️‍🗨️", perkStyle: { borderLeft: `4px solid #9D00FF` }, isLord: false, isVIP: false };
    if (commentCount >= 10) return { name: "Vizyoner", color: "#00E5FF", icon: "🔭", perkStyle: { borderLeft: `4px solid #00E5FF` }, isLord: false, isVIP: false };
    return { name: "Set Çaylağı", color: "#888888", icon: "🍿", perkStyle: { borderLeft: `4px solid #888888` }, isLord: false, isVIP: false };
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

  const currentUserTotalComments = getMyComments().length;

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
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.setAttribute("name", "theme-color");
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute("content", activeColor);
  }, [activeColor]);

  // Canlı Dinleme (Küresel Sohbet)
  useEffect(() => {
    if (viewMode === "global_chat") {
      const q = query(collection(db, "global_chat"), orderBy("createdAt", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setGlobalMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTimeout(() => {
            if(globalChatScrollRef.current) globalChatScrollRef.current.scrollTop = globalChatScrollRef.current.scrollHeight;
        }, 100);
      });
      return () => unsubscribe();
    }
  }, [viewMode]);

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
          const url = `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchInput)}&include_adult=false&language=tr-TR&page=1`;
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
  }, [aiChatHistory, isAITyping, showAILeaderboard]);

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

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("sinepro_dark_mode");
    if (savedMode !== null) setIsDarkMode(JSON.parse(savedMode));
    const savedTheme = localStorage.getItem("sinepro_theme");
    if (savedTheme) setTheme(JSON.parse(savedTheme));

    let unsubscribeSnapshot: any = null; 
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          let cloudAvatar = "default";
          let cloudUsername = user.displayName || user.email?.split('@')[0];
          let cloudBanner = null; 
          let cloudFavs: any[] = [];
          let cloudBio = "";
          let cloudFollowers = [];
          let cloudFollowing = [];

          if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.avatar) cloudAvatar = data.avatar;
              if (data.username) cloudUsername = data.username;
              if (data.banner) cloudBanner = data.banner;
              if (data.favorites) cloudFavs = data.favorites;
              if (data.bio) cloudBio = data.bio;
              if (data.followers) cloudFollowers = data.followers;
              if (data.following) cloudFollowing = data.following;
          }

          if (cloudFavs.length > 0) {
            setFavorites(cloudFavs);
            localStorage.setItem("sinepro_favs", JSON.stringify(cloudFavs));
          }

          setCurrentUser({
            uid: user.uid,
            email: user.email,
            username: cloudUsername,
            avatar: cloudAvatar,
            banner: cloudBanner,
            bio: cloudBio,
            followers: cloudFollowers,
            following: cloudFollowing,
            uploadedAvatar: cloudAvatar !== "default" ? cloudAvatar : null
          });
        });
      } else {
        if (unsubscribeSnapshot) unsubscribeSnapshot(); 
        setCurrentUser(null);
        setFavorites([]); 
      }
    });

    const savedFavs = localStorage.getItem("sinepro_favs");
    const savedComments = localStorage.getItem("sinepro_comments");
    const savedHistory = localStorage.getItem("sinepro_recently_viewed");
    
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedComments) setComments(JSON.parse(savedComments));
    if (savedHistory) setRecentlyViewed(JSON.parse(savedHistory));

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowUserDropdown(false);
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
          setIsSearchFocused(false);
          setIsSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (unsubscribeSnapshot) unsubscribeSnapshot(); 
      unsubscribeAuth(); 
    };
  }, []);

  useEffect(() => {
    if (!selectedItem?.id) return;
    const q = query(collection(db, "comments"), where("itemID", "==", selectedItem.id), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedComments = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setComments((prev: any) => ({ ...prev, [selectedItem.id]: loadedComments }));
    });
    return () => unsubscribe(); 
  }, [selectedItem?.id]);

  useEffect(() => { 
    const fetchData = async () => {
      if (viewMode !== "home") return;
      setIsLoading(true); 
      try {
        const getUrl = (page: number) => searchQuery 
          ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&include_adult=false&language=tr-TR&page=${page}`
          : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&include_adult=false&vote_count.gte=200&language=tr-TR&page=${page}`;
        
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
          const resC = await axios.get(`https://api.themoviedb.org/3/discover/${contentType}?sort_by=popularity.desc&include_adult=false&language=tr-TR&page=1`, { headers: { Authorization: API_TOKEN } });
          setNewReleases(resC.data.results);
        }
      } catch (err) { console.error(err); }
      setIsLoading(false); 
    };
    fetchData(); 
  }, [searchQuery, contentType, selectedGenre, sortBy, viewMode]);

  useEffect(() => {
    const handlePopState = () => {
      isPoppingRef.current = true; 
      if (activeTrailerKey) setActiveTrailerKey(null);
      else if (zoomedAvatar) setZoomedAvatar(null);
      else if (showThemeSettings) setShowThemeSettings(false);
      else if (showSecuritySettings) setShowSecuritySettings(false);
      else if (showProfileSettings) setShowProfileSettings(false);
      else if (showLogin) setShowLogin(false);
      else if (showSineAI) setShowSineAI(false);
      else if (showMobileMenu) setShowMobileMenu(false);
      else if (selectedItem) setSelectedItem(null);
      else if (showSocialPanel) setShowSocialPanel(false); 
      else if (viewMode !== "home") {
         setViewMode("home");
         setActiveBottomTab("home");
      }
      setTimeout(() => { isPoppingRef.current = false; }, 100);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTrailerKey, zoomedAvatar, showThemeSettings, showSecuritySettings, showProfileSettings, showLogin, showSineAI, showMobileMenu, selectedItem, viewMode, showSocialPanel]);

  
  
  
  // --- EYLEM (ACTION) FONKSİYONLARI ---
  const sendGlobalMessage = async () => {
    if (!currentUser) { setAuthMode("login"); return setShowLogin(true); }
    if (!newGlobalMessage.trim() && !globalMessageImage) return;

    const mesajMetni = newGlobalMessage.trim(); // Bildirimde kullanmak için mesajı yedekledik

    try {
      // 1. MESAJI KÜRESEL SOHBETE KAYDET
      await addDoc(collection(db, "global_chat"), {
        user: currentUser.username,
        avatar: currentUser.avatar || "default",
        text: mesajMetni,
        image: globalMessageImage,
        likes: [], 
        date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        fullDate: new Date().toLocaleDateString('tr-TR'),
        createdAt: serverTimestamp(),
      });

      // =========================================================
      // 2. BİLDİRİM DEDEKTÖRÜ (RADAR DEVREYE GİRİYOR)
      // =========================================================
      const mentionRegex = /@(\w+)/g;
      let match;
      const mentionedUsers = new Set();
      
      // Mesajın içinde @ ile başlayan kelimeleri arar
      while ((match = mentionRegex.exec(mesajMetni)) !== null) {
          mentionedUsers.add(match[1]); 
      }

      // Bulduğu her ismin veritabanına "Seni etiketlediler" bildirimi bırakır
      mentionedUsers.forEach(async (etiketlenenKisi) => {
          if (etiketlenenKisi !== currentUser.username) { // İnsan kendine bildirim atamasın :)
              try {
                  await addDoc(collection(db, "notifications"), {
                      recipient: etiketlenenKisi, 
                      sender: currentUser.username, 
                      type: "mention",
                      text: mesajMetni, 
                      read: false,
                      date: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                      timestamp: new Date().getTime()
                  });
              } catch (error) {
                  console.error("Bildirim atılamadı:", error);
              }
          }
      });
      // =========================================================

      // 3. EKRANI TEMİZLE
      setNewGlobalMessage("");
      setGlobalMessageImage(null);
      triggerHaptic();
    } catch (error) { 
        console.error("Gönderme hatası:", error); 
        alert("Mesaj gönderilemedi!"); 
    }
  };

  const handleGlobalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        alert("Dosya çok büyük! Lütfen 10MB'dan küçük bir resim seçin.");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; 
        let height = img.height;
        const MAX_WIDTH = 1200; 
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setGlobalMessageImage(canvas.toDataURL('image/jpeg', 0.6));
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };
  

  const handleGlobalLike = async (msgId: string, currentLikes: string[] = []) => {
     if (!currentUser) return alert("Beğenmek için giriş yapmalısın!");
     const msgRef = doc(db, "global_chat", msgId);
     try {
         if (currentLikes.includes(currentUser.username)) {
             await updateDoc(msgRef, { likes: arrayRemove(currentUser.username) });
         } else {
             await updateDoc(msgRef, { likes: arrayUnion(currentUser.username) });
         }
     } catch (e) { console.error("Beğeni hatası", e); }
  };

  const handleTagUser = (username: string) => {
     setNewGlobalMessage(prev => prev + `@${username} `);
     document.getElementById("globalChatInput")?.focus();
  };

  const markNotifsAsRead = () => {
      const updated = notifications.map(n => ({...n, isRead: true}));
      setNotifications(updated);
      localStorage.setItem(`sinepro_notifications_${currentUser.username}`, JSON.stringify(updated));
  };

  const handleNotificationClick = (notif: any) => {
    if (!currentUser) { setShowNotifications(false); setAuthMode("login"); setShowLogin(true); return; }
    if (notif.itemID) {
        setContentType(notif.contentType || "movie");
        setSelectedItem({ id: notif.itemID, title: notif.itemTitle, name: notif.itemTitle });
        fetchExtraDetails(notif.itemID, notif.contentType || "movie");
        setShowNotifications(false);
        setAutoScrollToComments(true); 
    }
  };

 const handleAISubmit = async () => {
      if (!aiPrompt.trim()) return;
      const userText = aiPrompt.trim();
      setAiPrompt("");
      
      const newHistory = [...aiChatHistory, { role: "user", text: userText }];
      setAiChatHistory(newHistory);
      setIsAITyping(true);

      let systemInjectedPrompt = userText;
      const userRankInfo = getUserRank(currentUserTotalComments);
      
      if (userRankInfo.isLord) {
          systemInjectedPrompt = `ÖNEMLİ: Karşındaki kullanıcı ${userRankInfo.name} rütbesinde. Çok saygılı hitap et. Kullanıcının Sorusu: ${userText}`;
      } else if (userRankInfo.isVIP) {
          systemInjectedPrompt = `ÖNEMLİ: Karşındaki kullanıcı ${userRankInfo.name} rütbesinde bir VIP. Saygılı cevap ver. Kullanıcının Sorusu: ${userText}`;
      }

      // YAPAY ZEKAYA YARIŞMA ŞİFRESİNİ ÖĞRETİYORUZ
      systemInjectedPrompt += ` \n\nSİSTEM KURALI: Eğer kullanıcı senin sorduğun bir filmi/diziyi DOĞRU TAHMİN EDERSE, cevabının en sonuna tam olarak şu kodu ekle: [DOGRU_BILDI]. Kullanıcı yanlış bilirse veya normal sohbet ediyorsa bu kodu ASLA ekleme.`;

      try {
          const response = await fetch('/api/chat', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: systemInjectedPrompt, history: aiChatHistory }),
          });

          let aiResponseText = "";
          let results: any[] = [];

          if (!response.ok) aiResponseText = `SİSTEM HATASI: Beynimle bağlantı kurulamadı.`; 
          else { 
              const data = await response.json(); 
              aiResponseText = data.text; 
          }

          // PUAN KONTROL MEKANİZMASI
          if (aiResponseText.includes("[DOGRU_BILDI]")) {
              aiResponseText = aiResponseText.replace("[DOGRU_BILDI]", "").trim(); // Şifreyi sil, kullanıcı görmesin
              if(currentUser) {
                  addAIScore(10); // Veritabanında 10 Puan ekle!
                  aiResponseText += "\n\n🎉 TEBRİKLER! Doğru bildin ve +10 SİNE-DEHA Puanı kazandın!";
              }
          }

          const lowerText = userText.toLowerCase();
          const isSearchIntent = /(öner|bul|getir|izle|film|dizi|tavsiye|aksiyon|komedi|korku|bilim kurgu|animasyon|dram|gerilim|suç|gizem|fantastik|tarih|savaş|aşk|romantik)/i.test(lowerText);
          
          if (isSearchIntent) {
             try {
                 const cleanSearch = userText.replace(/(öner|bul|getir|izlemek istiyorum|bana|bir|film|dizi)/gi, "").trim();
                 if (cleanSearch.length > 2) {
                     const url = `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(cleanSearch)}&include_adult=false&language=tr-TR&page=1`;
                     const res = await axios.get(url, { headers: { Authorization: API_TOKEN } });
                     results = res.data.results?.slice(0, 4) || []; 
                 }
             } catch(e) {}
          }
          setAiChatHistory(prev => [...prev, { role: "ai", text: aiResponseText, results }]);
      } catch (error) {
          setAiChatHistory(prev => [...prev, { role: "ai", text: "Kablolarım karıştı! Bir hata oluştu. 🤖" }]);
      } finally {
          if (typeof triggerHaptic === 'function') triggerHaptic(); setIsAITyping(false);
      }
  };
const startAITrivia = async () => {
      setShowAILeaderboard(false);
      const newHistory = [...aiChatHistory, { role: "user", text: "🎮 Yarışma Başlat! Bana bir film tahmini sorusu sor." }];
      setAiChatHistory(newHistory);
      setIsAITyping(true);
      setAiPrompt(""); 

      try {
          const response = await fetch('/api/chat', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  prompt: "Bana sinema hakkında eğlenceli, emojilerle dolu bir film tahmini sorusu sor. Sadece soruyu ve emojileri ver, cevabı asla söyleme. Yarışma formatında olsun.", 
                  history: aiChatHistory 
              }),
          });

          let aiResponseText = "";
          if (!response.ok) aiResponseText = `SİSTEM HATASI: Beynimle bağlantı kurulamadı.`; 
          else { const data = await response.json(); aiResponseText = data.text; }

          setAiChatHistory(prev => [...prev, { role: "ai", text: aiResponseText }]);
      } catch (error) {
          setAiChatHistory(prev => [...prev, { role: "ai", text: "Kablolarım karıştı! Bir hata oluştu. 🤖" }]);
      } finally {
          if (typeof triggerHaptic === 'function') triggerHaptic(); 
          setIsAITyping(false);
      }
  };
  const fetchLeaderboard = async () => {
      try {
          const q = query(collection(db, "users"), orderBy("aiScore", "desc"));
          const snap = await getDocs(q);
          const topUsers = snap.docs.map(doc => doc.data()).filter(u => u.aiScore && u.aiScore > 0).slice(0, 10);
          setLeaderboardData(topUsers);
      } catch (error) {
          console.error("Sıralama çekilemedi:", error);
      }
  };

  const addAIScore = async (points: number) => {
      if (!currentUser) return;
      try {
          const q = query(collection(db, "users"), where("username", "==", currentUser.username));
          const snap = await getDocs(q);
          if(!snap.empty) {
               const uDoc = snap.docs[0];
               const currentScore = uDoc.data().aiScore || 0;
               await updateDoc(uDoc.ref, { aiScore: currentScore + points });
          }
      } catch(e) { console.error("Puan eklenemedi:", e); }
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

  const sendEmail = async (email: string, code: string, user: string) => {
    try { await emailjs.send("service_9d5qlk9", "template_tlqw67x", { email, name: user, user_name: user, to_name: user, auth_code: code }, "OGQEmxiu2oahk21gg"); return true; } 
    catch { return false; }
  };

  const handleRegisterStart = async () => {
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) return alert("Lütfen tüm alanları doldurun!");
    try {
        await registerUser(formData.email.trim(), formData.password.trim(), formData.username.trim());
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        const success = await sendEmail(formData.email.trim(), code, formData.username.trim());
        if (success) { alert("Doğrulama kodu mailinize gönderildi!"); setAuthMode("verify"); }
    } catch (error: any) {
        if (error.message === "USERNAME_TAKEN") alert("Bu kullanıcı adı zaten alınmış!");
        else alert("Hata: " + error.message);
    }
  };

  const handleVerifyAndFinish = () => {
    if (verificationCode.trim() === generatedCode.trim()) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      users.push({ email: formData.email.trim(), password: formData.password.trim(), username: formData.username.trim(), id: Date.now(), joined: new Date().toLocaleDateString('tr-TR'), avatar: "default" });
      localStorage.setItem("sinepro_database_users", JSON.stringify(users));
      setAuthMode("login"); setVerificationCode(""); alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
    } else { alert("Girdiğiniz kod yanlış!"); }
  };

  const handleForgotPasswordStart = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const userMatch = users.find((u: any) => u.email.toLowerCase() === formData.email.trim().toLowerCase());
    if (!userMatch) return alert("Hesap bulunamadı!");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    sendEmail(formData.email.trim(), code, userMatch.username).then((success) => {
        if (success) { alert("Şifre sıfırlama kodu mail adresinize gönderildi!"); setAuthMode("verify_forgot"); } 
        else { alert("Mail gönderilirken hata oluştu!"); }
    });
  };

  const handleVerifyForgot = () => {
    if (verificationCode.trim() === generatedCode.trim()) { setAuthMode("new_password"); setVerificationCode(""); } 
    else { alert("Kod yanlış!"); }
  };

  const handleSaveNewPassword = () => {
    const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
    const updatedUsers = users.map((u: any) => u.email === formData.email.trim() ? { ...u, password: formData.password.trim() } : u);
    localStorage.setItem("sinepro_database_users", JSON.stringify(updatedUsers));
    alert("Şifreniz başarıyla yenilendi!"); setAuthMode("login");
  };

  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) return alert("Eksiksiz girin!");
    try {
      const user = await loginUser(formData.email.trim(), formData.password.trim());
      setShowLogin(false); 
      if (user.email === "yukselomerfaruk292@gmail.com") alert("Hoş geldin patron! 😎");
      else alert("SİNEPRO'ya hoş geldiniz!");
    } catch (error: any) { alert("Giriş başarısız: E-posta veya şifre hatalı."); }
  };

  const handleLogout = () => {
    localStorage.removeItem("sinepro_active_session");
    setCurrentUser(null); setShowUserDropdown(false); setViewMode("home"); setActiveBottomTab("home"); setShowProfileSettings(false);
  };

  const startSecurityVerify = () => {
    if (!profilePassword.trim()) return alert("Yeni şifreyi girin!");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    sendEmail(currentUser.email, code, currentUser.username).then((success) => {
        if (success) {
            setAuthMode("security_verify"); setShowSecuritySettings(false); setShowLogin(true); 
            alert("Güvenliğiniz için mailinize onay kodu gönderildi.");
        }
    });
  };

  const handleSecurityUpdate = () => {
    if (verificationCode.trim() === generatedCode.trim()) {
      const users = JSON.parse(localStorage.getItem("sinepro_database_users") || "[]");
      const updatedUser = { ...currentUser, password: profilePassword.trim() };
      const updatedUsers = users.map((u: any) => u.email === currentUser.email ? updatedUser : u);
      localStorage.setItem("sinepro_database_users", JSON.stringify(updatedUsers));
      setCurrentUser(updatedUser); setShowLogin(false); setVerificationCode(""); setProfilePassword(""); alert("Şifre güncellendi!");
    } else { alert("Kod yanlış!"); }
  };
  const fetchExtraDetails = async (id: any, cType?: string) => {
    const typeToUse = cType || contentType;
    try {
      const [detailsRes, similarRes, castRes, videosRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/${typeToUse}/${id}?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${typeToUse}/${id}/similar?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${typeToUse}/${id}/credits?language=tr-TR`, { headers: { Authorization: API_TOKEN } }),
        axios.get(`https://api.themoviedb.org/3/${typeToUse}/${id}/videos`, { headers: { Authorization: API_TOKEN } })
      ]);
      setSelectedItem((prev: any) => ({ ...(prev || {}), ...detailsRes.data }));
      setSimilar(similarRes.data.results?.slice(0, 15) || []);
      setCast(castRes.data.cast?.slice(0, 15) || []);
      const ytVideos = videosRes.data.results.filter((v: any) => v.site === "YouTube");
      const officialTrailer = ytVideos.find((v: any) => v.type === "Trailer");
      setTrailerKey(officialTrailer ? officialTrailer.key : (ytVideos.length > 0 ? ytVideos[0].key : null));
    } catch (err) {
      console.error("Detaylar çekilirken hata:", err);
    }
  };

  const shareMovie = async (item: any) => {
    triggerHaptic(); 
    const shareUrl = `${window.location.origin}/?id=${item.id}&type=${contentType}`;
    if (navigator.share) {
      try { await navigator.share({ title: `SİNEPRO | ${item.title || item.name}`, text: `SİNEPRO'da buldum!`, url: shareUrl }); } catch (err) {}
    } else { navigator.clipboard.writeText(shareUrl); alert("Bağlantı kopyalandı!"); }
  };

  const addComment = async () => {
    if (!currentUser) { setAuthMode("login"); return setShowLogin(true); }
    if (!newComment.trim()) return;

    const currentCommentCount = currentUserTotalComments + 1; 
    const rankInfo = getUserRank(currentCommentCount);
    
    const commentData = {
      user: currentUser.username, avatar: currentUser.avatar || "default", text: newComment.trim(), rating: commentRating, isSpoiler: isSpoiler, 
      date: new Date().toLocaleDateString('tr-TR'), createdAt: serverTimestamp(), itemTitle: selectedItem.title || selectedItem.name,
      itemID: selectedItem.id, contentType: contentType, likes: 0, likedBy: [], replies: [], authorCommentCount: currentCommentCount,
      authorBanner: currentUser.banner || null, isVIP: rankInfo.isVIP || false
    };

    try {
      await addDoc(collection(db, "comments"), commentData);
      setNewComment(""); setCommentRating(10); setIsSpoiler(false); triggerHaptic(); 
    } catch (error) { alert("Yorum gönderilemedi!"); }
  };

 const saveProfileSettings = async () => {
      if (!currentUser?.username?.trim()) return alert("Kullanıcı adı boş olamaz!");
      
      const updatedUser = { ...currentUser, username: currentUser.username.trim(), bio: currentUser.bio };
      
      if (updatedUser.uid) {
          try {
              // Veritabanına kaydetme işlemi (Senin orijinal ve doğru kodun)
              await setDoc(doc(db, "users", updatedUser.uid), {
                  username: updatedUser.username, 
                  avatar: updatedUser.avatar || "default", 
                  email: updatedUser.email, 
                  banner: updatedUser.banner || null, 
                  bio: updatedUser.bio || ""
              }, { merge: true });
   // --- V4 KESKİN NİŞANCI AVATAR GÜNCELLEME ROBOTU ---
    try {
        console.log("🕵️‍♂️ Robot doğru hedefle yola çıktı...");
        const chatRef = collection(db, "global_chat");
        
        // İŞTE SİHİRLİ DOKUNUŞ: "username" kelimesini "user" yaptık!
        const q = query(chatRef, where("user", "==", currentUser.username));
        const querySnapshot = await getDocs(q);
        
        console.log(`🎯 Robot tam ${querySnapshot.size} adet eski mesajını buldu!`);
        
        if (querySnapshot.size > 0) {
            const yeniAvatar = currentUser.uploadedAvatar || currentUser.avatar || "default";

            const updatePromises = querySnapshot.docs.map((chatDocument) => {
                return updateDoc(doc(db, "global_chat", chatDocument.id), {
                    avatar: yeniAvatar
                });
            });
            
            await Promise.all(updatePromises);
            console.log("✅ Görev Başarılı! Tüm küresel mesajlarındaki avatarlar güncellendi.");
        } else {
            console.log("⚠️ Değiştirilecek eski mesaj bulunamadı.");
        }
    } catch (error) {
        console.error("❌ Robot kaza yaptı:", error);
    }
    // -------------------------------------------------------------
              // Kayıt başarılı olunca çalışacak kısım (Bizim eklediğimiz)
              alert("Profil ayarların başarıyla güncellendi!");
              setShowProfileSettings(false); // Pencereyi kapat
              
          } catch (error) {
              console.error("Kayıt hatası:", error);
              alert("Kaydedilirken bir hata oluştu.");
          }
      }
  };
  const openProfileCard = async (username: string, fallbackAvatar: string, fallbackBanner?: any, postCount: number = 0) => {
      setZoomedAvatar({ 
          username, avatar: fallbackAvatar, banner: fallbackBanner, bio: "Yükleniyor...", stats: { posts: postCount, followers: 0, following: 0 }
      });
      try {
          const q = query(collection(db, "users"), where("username", "==", username));
          const snap = await getDocs(q);
          if (!snap.empty) {
              const data = snap.docs[0].data();
              setZoomedAvatar({ 
                  username, avatar: data.avatar || fallbackAvatar, banner: data.banner || fallbackBanner, bio: data.bio || "",
                  stats: { posts: postCount, followers: data.followers?.length || 0, following: data.following?.length || 0 }
              });
          }
      } catch(e) {}
  };

  const deleteComment = async (itemID: number, commentID: any) => { try { await deleteDoc(doc(db, "comments", String(commentID))); triggerHaptic(); } catch (error) {} };
  
  const handleReplySubmit = async (itemID: number, commentID: any, originalUser: string, itemTitle: string) => {
    if (!currentUser) { setAuthMode("login"); return setShowLogin(true); }
    if (!replyText.trim()) return;
    const newReply = { id: Date.now().toString(), user: currentUser.username, avatar: currentUser.avatar || "default", text: replyText.trim(), date: new Date().toLocaleDateString('tr-TR') };
    try {
        await updateDoc(doc(db, "comments", String(commentID)), { replies: arrayUnion(newReply) });
        if (originalUser !== currentUser.username) {
            const authorNotifKey = `sinepro_notifications_${originalUser}`;
            const authorNotifs = JSON.parse(localStorage.getItem(authorNotifKey) || "[]");
            authorNotifs.unshift({ id: Date.now(), text: `@${currentUser.username}, "${itemTitle}" yorumuna cevap yazdı! 💬`, isRead: false, date: new Date().toLocaleDateString('tr-TR'), itemID: itemID, contentType: contentType, itemTitle: itemTitle });
            localStorage.setItem(authorNotifKey, JSON.stringify(authorNotifs));
        }
        setReplyText(""); setReplyingToId(null); triggerHaptic();
    } catch (error) {}
  };

  const deleteReply = async (itemID: number, commentID: any, replyID: any) => {
      const itemComments = comments[itemID] || [];
      const targetComment = itemComments.find((c: any) => c.id == commentID);
      if (!targetComment) return;
      const replyToRemove = targetComment.replies.find((r: any) => r.id == replyID);
      try { await updateDoc(doc(db, "comments", String(commentID)), { replies: arrayRemove(replyToRemove) }); } catch (error) {}
  };

  const handleLoadMore = async () => {
    const nextCount = visibleCount + 15;
    if (nextCount > items.length) {
      const nextPage = currentPage + 1;
      const getUrl = (page: number) => searchQuery 
        ? `https://api.themoviedb.org/3/search/${contentType}?query=${encodeURIComponent(searchQuery)}&include_adult=false&language=tr-TR&page=${page}`
        : `https://api.themoviedb.org/3/discover/${contentType}?sort_by=${sortBy}${selectedGenre ? `&with_genres=${selectedGenre}` : ""}&include_adult=false&vote_count.gte=200&language=tr-TR&page=${page}`;
      try {
        const res = await axios.get(getUrl(nextPage), { headers: { Authorization: API_TOKEN } });
        setItems(prev => [...prev, ...res.data.results]); setCurrentPage(nextPage);
      } catch (err) {}
    }
    setVisibleCount(nextCount);
  };

  const toggleFavorite = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); triggerHaptic(); 
    if (!currentUser) { setAuthMode("login"); setShowLogin(true); return; }
    let isFav = favorites.find(f => f.id === item.id);
    let updated = isFav ? favorites.filter(f => f.id !== item.id) : [...favorites, item];
    setFavorites(updated); localStorage.setItem("sinepro_favs", JSON.stringify(updated));
    if (currentUser.uid) await syncFavoritesToFirebase(currentUser.uid, updated);
  };

  const handleScrollClick = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) { const { scrollLeft, clientWidth } = ref.current; ref.current.scrollTo({ left: direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth, behavior: 'smooth' }); }
  };

  const calculateProRating = (itemID: number) => {
    const itemComments = comments[itemID] || [];
    const ratedComments = itemComments.filter((c: any) => c.rating);
    if (ratedComments.length === 0) return null;
    const totalScore = ratedComments.reduce((sum: number, c: any) => sum + c.rating, 0);
    return (totalScore / ratedComments.length).toFixed(1);
  };

  const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => { if (e.key === 'Enter') { e.preventDefault(); action(); } };

  const handleSupportSubmit = async () => {
    if(!supportForm.message.trim()) return alert("Mesaj yazın!");
    try { await emailjs.send("service_9d5qlk9", "template_x6iu07i", { user_name: currentUser?.username || "Ziyaretçi", user_email: currentUser?.email || "Belirtilmedi", support_category: supportForm.category, support_message: supportForm.message }, "OGQEmxiu2oahk21gg"); alert("Talebiniz alındı!"); setSupportForm({ category: "Hesap Problemi", message: "" }); } catch (err) { alert("Hata oluştu."); }
  };

  const handleFollowUser = async (targetUsername: string) => {
      if (!currentUser) { setAuthMode("login"); setShowLogin(true); return; }
      if (currentUser.username === targetUsername) return alert("Kendinizi takip edemezsiniz :)");
      try {
          await sendFriendRequest(currentUser.username, targetUsername);
          const targetNotifKey = `sinepro_notifications_${targetUsername}`;
          const targetNotifs = JSON.parse(localStorage.getItem(targetNotifKey) || "[]");
          targetNotifs.unshift({ id: Date.now(), text: `@${currentUser.username} seni takip etmeye başladı / istek gönderdi! 👤`, isRead: false, date: new Date().toLocaleDateString('tr-TR') });
          localStorage.setItem(targetNotifKey, JSON.stringify(targetNotifs));
          alert(`${targetUsername} adlı kullanıcıya istek gönderildi!`);
      } catch (error) { alert("İstek gönderilirken bir hata oluştu."); }
  };

  const toggleLikeComment = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, itemID: any, commentID: any) => {
      e.stopPropagation();
      if (!currentUser) return alert("Giriş yapmalısın!");
      // Beğeni logic'i buraya eklenecek (Firebase)
  };

  const displayNotifs = currentUser ? notifications : [{ id: 'guest', text: 'SİNEPRO\'ya Hoş Geldin! 🎉\nŞu an misafir modundasın.', isRead: guestNotifSeen, date: 'Sistem Panosu' }];

  if (!mounted) return null;

 const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
          e.target.value = ''; // Hata verirse de hafızayı temizle
          return alert("Dosya çok büyük! Maksimum 10MB boyutunda bir resim seçin.");
      }
      
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (currentUser) {
            setCurrentUser({ ...currentUser, avatar: dataUrl, uploadedAvatar: dataUrl });
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // İŞTE SİHİRLİ DOKUNUŞ! Seçim hafızasını sıfırlar, böylece tekrar resim seçebilirsin.
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
          e.target.value = '';
          return alert("Dosya çok büyük! Maksimum 10MB boyutunda bir resim seçin.");
      }
      
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          if (currentUser) {
            setCurrentUser({ ...currentUser, banner: dataUrl });
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // İŞTE SİHİRLİ DOKUNUŞ!
  };
// --- BÖLÜM 1 BURADA BİTİYOR ---
return (
    <main style={{ backgroundColor: bgMain, minHeight: '100vh', color: textMain, fontFamily: 'sans-serif', position: 'relative', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
      .modal-box::-webkit-scrollbar { display: none; }
        .modal-box { -ms-overflow-style: none; scrollbar-width: none; }
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
        @keyframes notifPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.8); transform: scale(1); }
          70% { box-shadow: 0 0 0 8px rgba(255, 0, 0, 0); transform: scale(1.1); }
          100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); transform: scale(1); }
        }
        @keyframes vipLordGlow {
           0% { filter: drop-shadow(0 0 5px #FF0055); border-color: rgba(255,0,85,0.5); }
           50% { filter: drop-shadow(0 0 15px #FF0055); border-color: rgba(255,0,85,1); }
           100% { filter: drop-shadow(0 0 5px #FF0055); border-color: rgba(255,0,85,0.5); }
        }
        .vip-lord-avatar img, .vip-lord-avatar div {
           animation: vipLordGlow 2s infinite alternate !important;
           border: 3px solid #FF0055 !important;
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
          .nav-wrapper { 
             padding: 12px 10px !important; 
             flex-direction: row !important; 
             flex-wrap: nowrap !important; 
          }
          .mobile-logo-adjust { 
             transform: translate(-5px, 2px); 
             transition: 0.4s ease; 
          }
          .nav-wrapper > div:first-child { flex: 1; justify-content: flex-start !important; }
          .nav-wrapper > div:last-child { flex: 1; justify-content: flex-end !important; gap: 10px !important; }
          .hide-on-mobile { display: none !important; }
          .search-container { margin-top: 0 !important; width: auto !important; }
          
          .search-input-box { 
             width: ${isSearchExpanded ? '150px' : '40px'} !important; 
             min-width: ${isSearchExpanded ? '150px' : '40px'} !important;
             transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
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
        }
      ` }} />

      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80vw', height: '80vw', background: `radial-gradient(circle, ${activeColor}40 0%, transparent 65%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none', animation: 'heartbeat 3s infinite' }} />

      <nav className="nav-wrapper" style={{ background: navBg, backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div className="mobile-logo-adjust" onClick={() => { setActiveBottomTab("home"); setViewMode("home"); setContentType("movie"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); window.scrollTo({top:0, behavior:'smooth'});}} style={{ cursor: 'pointer' }}>
              <SineProLogo activeColor={activeColor} badgeText={badgeText} hidePro={isSearchExpanded} />
          </div>
          <div className="hide-on-mobile" style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
            <button onClick={() => { setActiveBottomTab("movies"); setContentType("movie"); setViewMode("home"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); setIsSearchExpanded(false); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: activeBottomTab === "movies" ? activeColor : theme.secondary }}>FİLMLER</button>
            <button onClick={() => { setActiveBottomTab("tv"); setContentType("tv"); setViewMode("home"); setSelectedGenre(null); setSearchQuery(""); setSearchInput(""); setIsSearchExpanded(false); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer', color: activeBottomTab === "tv" ? activeColor : theme.secondary }}>DİZİLER</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, justifyItems: 'flex-end', justifyContent: 'flex-end' }}>
          
          <button className="hide-on-mobile" onClick={() => { if(!currentUser) { setAuthMode("login"); setShowLogin(true); return; } setShowSineAI(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px' }} title="SİNE Aİ Asistan">
             <span style={{ color: activeColor, fontWeight: '900', fontSize: '18px' }}>SİNE</span>
             <span style={{ backgroundColor: activeColor, color: badgeText, padding: '2px 6px', borderRadius: '4px', fontSize: '14px', fontWeight: '900', marginLeft: '4px', boxShadow: `0 0 10px ${activeColor}80` }}>Aİ</span>
          </button>
          
          <button className="hide-on-mobile" onClick={() => {
              if (!currentUser) { setAuthMode("login"); setShowLogin(true); return; }
              setShowSocialPanel(true);
          }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', margin: '0 5px' }} title="Sosyal Panel">
             💬
          </button>

          <div style={{ position: 'relative' }} ref={bellRef}>
             <button onClick={() => {
                 setShowNotifications(!showNotifications);
                 if (!currentUser) { setGuestNotifSeen(true); sessionStorage.setItem("sinepro_guest_notif", "true"); }
                 else if (!showNotifications) markNotifsAsRead();
             }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', margin: '0 5px', position: 'relative' }} title="Bildirimler">
                🔔
                {((!currentUser && !guestNotifSeen) || (currentUser && displayNotifs.filter(n => !n.isRead).length > 0)) && (
                    <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ff0000', border: `2px solid ${navBg}`, width: '14px', height: '14px', borderRadius: '50%', animation: 'notifPulse 2s infinite' }}></span>
                )}
             </button>
             {showNotifications && (
                 <div style={{ position: 'absolute', top: '45px', right: '-60px', width: '320px', background: bgCard, borderRadius: '12px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 3000 }}>
                    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                       <span style={{ fontWeight: 'bold', color: activeColor, fontSize: '15px' }}>{currentUser ? "Bildirimleriniz" : "Sistem Panosu"}</span>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                       {displayNotifs.length > 0 ? displayNotifs.map(n => (
                          <div key={n.id} onClick={() => handleNotificationClick(n)} style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: n.isRead ? 'transparent' : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer' }}>
                             <span style={{ fontSize: '22px' }}>{n.text.includes('Hoş Geldin') ? '🎉' : n.text.includes('Kilitli') ? '🔒' : n.text.includes('cevap') ? '💬' : '❤️'}</span>
                             <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '13px', color: textMain, lineHeight: '1.4' }}>{n.text}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                                    <span style={{ fontSize: '11px', color: textLight }}>{n.date}</span>
                                    {n.itemID && <span style={{ fontSize: '10px', color: activeColor, fontWeight: 'bold' }}>Tıkla ve yoruma git</span>}
                                </div>
                             </div>
                          </div>
                       )) : <div style={{ padding: '20px', textAlign: 'center', color: textLight, fontSize: '13px' }}>Henüz bildiriminiz yok.</div>}
                    </div>
                    {currentUser && <div onClick={() => { setViewMode("notifications"); setActiveBottomTab("profile"); setShowNotifications(false); }} style={{ padding: '12px', textAlign: 'center', color: activeColor, fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', borderTop: `1px solid ${borderColor}` }}>Tüm Bildirimleri Gör</div>}
                 </div>
             )}
          </div>
          <button onClick={() => { const newMode = !isDarkMode; setIsDarkMode(newMode); localStorage.setItem("sinepro_dark_mode", JSON.stringify(newMode)); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '22px', display: 'flex', alignItems: 'center', margin: '0 5px' }} title={isDarkMode ? "Açık Moda Geç" : "Koyu Moda Geç"}>{isDarkMode ? "☀️" : "🌙"}</button>

          <div className="search-container" ref={searchRef}>
            <input type="text" className="search-input-box" ref={searchInputRef} placeholder="Film/Dizi Ara..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onFocus={() => setIsSearchFocused(true)} onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery(searchInput); setIsSearchFocused(false); setIsSearchExpanded(false); setViewMode("home"); } }} />
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
                    <div onClick={() => { setViewMode("profile"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>👤 Kişisel Profilim</div>
                    <div onClick={() => { setViewMode("stats"); setActiveBottomTab("profile"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>📊 İstatistiklerim</div>
                    <div onClick={() => { setShowThemeSettings(true); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>🎨 Tema Değiştir</div>
                    <div onClick={() => { setViewMode("favorites"); setActiveBottomTab("profile"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>❤️ Beğendiklerim</div>
                    <div onClick={() => { setViewMode("my_comments"); setActiveBottomTab("profile"); setShowUserDropdown(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>💬 Son Yorumlarım</div>
                    <div onClick={() => { setViewMode("history"); setActiveBottomTab("profile"); setShowUserDropdown(false); setShowMobileMenu(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>🕒 Son Baktıklarım</div>
                    <div onClick={() => { setViewMode("global_chat"); setShowUserDropdown(false); setShowMobileMenu(false); }} style={{ padding: '12px 20px', cursor: 'pointer', color: textMain, borderBottom: `1px solid ${borderColor}` }}>🌍 Küresel Sohbet</div>
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
         <div className="bottom-bar-item" onClick={() => { if(!currentUser) { setAuthMode("login"); setShowLogin(true); return; } setShowSineAI(true); }}>
             <div className="ai-center-btn">🤖</div><span style={{ color: activeColor, marginTop: '-15px', textShadow: `0 0 5px ${activeColor}80`, fontWeight: 'bold' }}>SİNE Aİ</span>
         </div>
         <div className={`bottom-bar-item ${showSocialPanel ? 'active' : ''}`} onClick={() => { if(!currentUser) { setAuthMode("login"); setShowLogin(true); return; } setShowSocialPanel(true); }}>
             <span className="bottom-icon">💬</span><span className="bottom-text">Sosyal</span>
         </div>
         <div className={`bottom-bar-item ${activeBottomTab === 'profile' || (viewMode !== 'home' && viewMode !== 'about' && viewMode !== 'support') ? 'active' : ''}`} onClick={() => { setActiveBottomTab("profile"); currentUser ? setShowMobileMenu(true) : setShowLogin(true); }}>
             <span className="bottom-icon">{currentUser ? <div style={{ transition: '0.3s' }}><UserAvatar user={currentUser} size="24px" fontSize="10px" activeColor={activeColor} theme={theme} badgeText={badgeText} /></div> : "👤"}</span>
             <span className="bottom-text">{currentUser ? "Profil" : "Giriş"}</span>
         </div>
      </div>

      {showMobileMenu && currentUser && (
        <div onClick={() => setShowMobileMenu(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9950, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', background: bgCard, borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '25px', borderTop: `2px solid ${activeColor}`, boxShadow: `0 -10px 40px ${activeColor}40`, animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
             
             {currentUser.banner && (
                 <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '140px', backgroundImage: `url(${currentUser.banner})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.4, borderTopLeftRadius: '30px', borderTopRightRadius: '30px', maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', zIndex: 0 }} />
             )}

             <div style={{ position: 'relative', zIndex: 1 }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><div style={{ width: '40px', height: '5px', background: borderColor, borderRadius: '10px' }}></div></div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '20px' }}>
                    <div className={getUserRank(currentUserTotalComments).isLord ? "vip-lord-avatar" : ""} style={{ borderRadius: '50%', padding: getUserRank(currentUserTotalComments).isLord ? '3px' : '0' }}>
                        <UserAvatar user={currentUser} size="60px" fontSize="24px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: activeColor, fontSize: '20px', textShadow: getUserRank(currentUserTotalComments).isLord ? '0 0 10px #FF0055' : 'none' }}>@{currentUser.username}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: textLight }}>{currentUser.email}</p>
                    </div>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button onClick={() => { setViewMode("profile"); setShowMobileMenu(false); }} className="mobile-menu-btn">👤 Kişisel Profilim</button>
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

          {!searchQuery && (
            <div className={activeBottomTab !== 'home' ? 'hide-carousels-mobile' : ''} style={{ position: 'relative', marginTop: '30px', zIndex: 1 }} onMouseEnter={() => setIsHoveringCarousel(true)} onMouseLeave={() => setIsHoveringCarousel(false)}>
              <h3 className="section-title">ÖNE ÇIKANLAR</h3>
              <div style={{ position: 'relative', padding: '0 5%' }}>
                <button className="side-nav-btn" style={{ left: '1%' }} onClick={() => handleScrollClick(mainNewScrollRef, 'left')}>❮</button>
                <button className="side-nav-btn" style={{ right: '1%' }} onClick={() => handleScrollClick(mainNewScrollRef, 'right')}>❯</button>
                <div className="horizontal-scroll" ref={mainNewScrollRef}>
                  {isLoading ? (
                    Array(10).fill(0).map((_, i) => <div key={i} style={{ minWidth: '200px' }}><SkeletonCard isDarkMode={isDarkMode} /></div>)
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

      {/* --- KÜRESEL SOHBET --- */}
      {viewMode === "global_chat" && (
        <div style={{ padding: '20px 2%', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', paddingBottom: '15px', borderBottom: `1px solid ${borderColor}` }}>
                <span style={{ fontSize: '36px' }}>🌍</span>
                <div>
                    <h2 className="section-title" style={{ margin: 0, padding: 0, border: 'none', fontSize: '26px' }}>Küresel Sohbet</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: textLight }}>SİNEPRO topluluğu ile canlı muhabbet et!</p>
                </div>
            </div>
            <div ref={globalChatScrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '10px', paddingBottom: '20px' }}>
                {globalMessages.length > 0 ? globalMessages.map((msg) => {
                    const isMe = currentUser?.username === msg.user;
                    return (
                        <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', gap: '10px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                            <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => openProfileCard(msg.user, msg.avatar, null, 0)}>
                                <UserAvatar user={{ username: msg.user, avatar: msg.avatar }} size="45px" fontSize="16px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                            </div>
                            <div style={{ background: isMe ? activeColor : bgCard, color: isMe ? badgeText : textMain, padding: '12px 18px', borderRadius: isMe ? '20px 8px 20px 20px' : '8px 20px 20px 20px', border: isMe ? 'none' : `1px solid ${borderColor}`, position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', minWidth: '150px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '15px' }}>
                                    <span style={{ fontWeight: '900', fontSize: '14px', color: isMe ? badgeText : activeColor, cursor: 'pointer' }} onClick={() => openProfileCard(msg.user, msg.avatar, null, 0)}>@{msg.user}</span>
                                    <span style={{ fontSize: '11px', opacity: 0.8 }}>{msg.date}</span>
                                </div>
                                {msg.image && (
                                    <img 
                                        src={msg.image} 
                                        onClick={() => setZoomedChatImage(msg.image)} 
                                        style={{ cursor: 'zoom-in', maxWidth: '250px', width: '100%', borderRadius: '10px', marginBottom: msg.text ? '10px' : '0', maxHeight: '200px', objectFit: 'cover', background: 'rgba(0,0,0,0.1)', border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : borderColor}` }} 
                                        alt="Gönderilen Fotoğraf" 
                                    />
                                )}
                                {msg.text && <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5', wordBreak: 'break-word' }}>{msg.text}</p>}
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : borderColor}`, fontSize: '12px', fontWeight: 'bold' }}>
                                    <span onClick={() => handleGlobalLike(msg.id, msg.likes)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>{msg.likes?.includes(currentUser?.username) ? '❤️' : '🤍'} {msg.likes?.length || 0}</span>
                                    <span onClick={() => handleTagUser(msg.user)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>🏷️ Etiketle</span>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div style={{ margin: 'auto', textAlign: 'center', color: textLight }}><span style={{ fontSize: '50px', opacity: 0.5 }}>💬</span><p style={{ fontSize: '18px', marginTop: '10px' }}>Buralar sessiz... İlk mesajı sen gönder!</p></div>
                )}
            </div>
            <div style={{ marginTop: 'auto', background: bgCard, padding: '20px', borderRadius: '25px', border: `1px solid ${activeColor}50`, boxShadow: `0 -10px 30px rgba(0,0,0,0.3)` }}>
                {globalMessageImage && (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '15px' }}>
                        <img src={globalMessageImage} style={{ height: '120px', borderRadius: '12px', border: `3px solid ${activeColor}` }} alt="Preview" />
                        <button onClick={() => setGlobalMessageImage(null)} style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                   <button 
                           onClick={() => {
                               const input = document.getElementById('modalCommentInput');
                               if(input) {
                                   input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                   setTimeout(() => input.focus(), 300);
                               }
                           }} 
                           style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }} 
                           className="hover-effect"
                       >
                           💬
                       </button>
                    <input type="file" accept="image/*" onChange={handleGlobalImageUpload} style={{ display: 'none' }} id="globalImageInputV2" />
                    <input type="text" placeholder={currentUser ? "SİNEPRO halkına bir şeyler söyle... (Win + . ile emoji)" : "Sohbete katılmak için giriş yap..."} value={newGlobalMessage} onChange={(e) => setNewGlobalMessage(e.target.value)} onKeyDown={(e) => handleEnterKey(e, sendGlobalMessage)} disabled={!currentUser} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '20px 30px', borderRadius: '35px', color: textMain, outline: 'none', fontSize: '18px' }} />
                    <button onClick={sendGlobalMessage} disabled={!currentUser || (!newGlobalMessage.trim() && !globalMessageImage)} style={{ background: activeColor, color: badgeText, border: 'none', width: '60px', height: '60px', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', transition: '0.3s', opacity: (!newGlobalMessage.trim() && !globalMessageImage) ? 0.5 : 1, boxShadow: `0 5px 15px ${activeColor}40` }} className="hover-effect">➤</button>
                </div>
            </div>
        </div>
      )}

      {/* --- KİŞİSEL PROFİL VE GÖNDERİLER --- */}
      {viewMode === "profile" && currentUser && (
        <div style={{ padding: '30px 2%', maxWidth: '1000px', margin: '0 auto', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: '40px', paddingBottom: '30px', borderBottom: `1px solid ${borderColor}` }}>
                <div style={{ flexShrink: 0 }}><UserAvatar user={currentUser} size="120px" fontSize="40px" activeColor={activeColor} theme={theme} badgeText={badgeText} /></div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}><h2 style={{ margin: 0, fontSize: '28px', color: textMain }}>@{currentUser?.username}</h2></div>
                    <div style={{ display: 'flex', gap: '30px', marginBottom: '15px', fontSize: '16px', color: textMain }}>
                        <span><strong style={{ color: activeColor }}>{userPosts.length}</strong> gönderi</span>
                        <span><strong style={{ color: activeColor }}>{(currentUser as any)?.followers?.length || 0}</strong> takipçi</span>
                        <span><strong style={{ color: activeColor }}>{(currentUser as any)?.following?.length || 0}</strong> takip</span>
                    </div>
                    <p style={{ margin: 0, color: textLight, fontSize: '15px', lineHeight: '1.5' }}>{(currentUser as any)?.bio || "Sinema aşığı, SİNEPRO üyesi. 🍿🎬 Henüz bir biyografi eklemedi."}</p>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginBottom: '25px', borderBottom: `1px solid ${borderColor}` }}>
                <button onClick={() => setProfileTab("posts")} style={{ background: 'none', border: 'none', borderBottom: profileTab === "posts" ? `2px solid ${activeColor}` : '2px solid transparent', padding: '10px 20px', color: profileTab === "posts" ? activeColor : textLight, fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: '0.3s' }}>🖼️ GÖNDERİLER</button>
                <button onClick={() => setProfileTab("settings")} style={{ background: 'none', border: 'none', borderBottom: profileTab === "settings" ? `2px solid ${activeColor}` : '2px solid transparent', padding: '10px 20px', color: profileTab === "settings" ? activeColor : textLight, fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: '0.3s' }}>⚙️ AYARLAR</button>
            </div>
            {profileTab === "posts" ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                       <button onClick={() => document.getElementById('postImageInput')?.click()} style={{ background: activeColor, color: badgeText, padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 5px 15px ${activeColor}40` }}>➕ Yeni Gönderi</button>
                       <input type="file" id="postImageInput" accept="image/*" style={{ display: 'none' }} onChange={handlePostImageSelect} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {userPosts.length > 0 ? userPosts.map(post => (
                            <div key={post.id} onClick={() => setSelectedPost(post)} style={{ aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', background: '#000', cursor: 'pointer' }} className="hover-effect">
                                <img src={post.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Gönderi" />
                            </div>
                        )) : <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: textLight }}>Henüz hiç gönderi yok.</p>}
                    </div>
                </div>
            ) : (
                <div style={{ background: bgCard, padding: '30px', borderRadius: '15px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>
                    <h3 style={{ color: activeColor, marginTop: 0 }}>Profil Ayarları</h3>
                    <p style={{ color: textLight, marginBottom: '30px' }}>Hesap bilgilerini ve tercihlerini buradan güncelleyebilirsin.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
                        <button onClick={() => setShowProfileSettings(true)} style={{ padding: '15px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: inputBg, color: textMain, cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>👤 Profili Düzenle</button>
                        <button onClick={() => setShowSecuritySettings(true)} style={{ padding: '15px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: inputBg, color: textMain, cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}>🔒 Güvenlik Ayarları</button>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* --- ALT EKRANLAR (Geçmiş, Favori, Yorum vb) --- */}
      {viewMode === "history" && (
        <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>🕒 SON BAKTIKLARIM</h2>
                <button onClick={clearRecentlyViewed} className="history-btn" style={{ background: '#ff4d4d', color: 'white' }}>🗑️ Geçmişi Temizle</button>
            </div>
            {recentlyViewed.length > 0 ? (
                <div className="movie-grid" style={{ padding: 0 }}>
                    {recentlyViewed.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} style={{ textAlign: 'center', cursor: 'pointer' }}>
                            <div onClick={() => { setSelectedItem(item); fetchExtraDetails(item.id); addToRecentlyViewed(item); }} className="hover-effect" style={{ height: '270px', overflow: 'hidden', borderRadius: '15px', position: 'relative' }}>
                                <img src={getImgUrl(item.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                <div onClick={(e) => toggleFavorite(e, item)} className="fav-heart-btn">{favorites.find(f => f.id === item.id) ? '❤️' : '🤍'}</div>
                                <div className="rating-badge-pro">★ {item.vote_average?.toFixed(1)}</div>
                            </div>
                            <p style={{ marginTop: '15px', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title || item.name}</p>
                        </div>
                    ))}
                </div>
            ) : <div style={{ textAlign: 'center', marginTop: '50px', color: textLight, fontSize: '16px' }}>İzleme geçmişin şu an boş. Film keşfetmeye başla! 🍿</div>}
        </div>
      )}

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
            ) : <div style={{ textAlign: 'center', marginTop: '50px', color: textLight, fontSize: '16px' }}>Favori listen şu an boş. Hoşuna giden yapımları kalple! 🤍</div>}
        </div>
      )}

      {viewMode === "my_comments" && (
        <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '30px' }}>💬 SON YORUMLARIM</h2>
            {getMyComments().length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {getMyComments().map(c => (
                        <div key={c.id} onClick={() => { setContentType(c.contentType); setSelectedItem(c.itemData); fetchExtraDetails(c.itemID, c.contentType); }} style={{ background: bgCard, padding: '20px', borderRadius: '15px', borderLeft: `4px solid ${activeColor}`, cursor: 'pointer', transition: '0.3s' }} className="hover-effect">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><h4 style={{ color: activeColor, margin: 0, fontSize: '16px' }}>{c.itemTitle}</h4><span style={{ color: textLight, fontSize: '12px' }}>{c.date}</span></div>
                            <p style={{ margin: '10px 0', color: textMain, lineHeight: '1.6' }}>{c.text}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', borderTop: `1px solid ${borderColor}`, paddingTop: '15px' }}><span style={{ fontSize: '13px', color: activeColor, fontWeight: 'bold' }}>⭐ Verdiğin Puan: {c.rating}</span><span style={{ fontSize: '13px', color: '#ff4d4d', fontWeight: 'bold' }}>❤️ Beğeni: {c.likes || 0}</span></div>
                        </div>
                    ))}
                </div>
            ) : <div style={{ textAlign: 'center', marginTop: '50px', color: textLight, fontSize: '16px' }}>Henüz hiçbir içeriğe yorum yapmadın. Hadi bir film izle ve fikrini toplulukla paylaş! 🍿</div>}
        </div>
      )}

      {viewMode === "notifications" && (
        <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '30px' }}>🔔 BİLDİRİMLERİM</h2>
            <div style={{ background: bgCard, borderRadius: '15px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                {displayNotifs.length > 0 ? displayNotifs.map(n => (
                    <div key={n.id} onClick={() => handleNotificationClick(n)} style={{ padding: '20px', borderBottom: `1px solid ${borderColor}`, background: n.isRead ? 'transparent' : isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', display: 'flex', gap: '15px', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontSize: '28px' }}>{n.text.includes('Hoş Geldin') ? '🎉' : n.text.includes('Kilitli') ? '🔒' : n.text.includes('cevap') ? '💬' : '❤️'}</span>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '15px', color: textMain, lineHeight: '1.4' }}>{n.text}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                <span style={{ fontSize: '12px', color: textLight }}>{n.date}</span>
                                {n.itemID && <span style={{ fontSize: '12px', color: activeColor, fontWeight: 'bold' }}>Tıkla ve yoruma git</span>}
                            </div>
                        </div>
                    </div>
                )) : <div style={{ padding: '40px', textAlign: 'center', color: textLight }}>Bildiriminiz yok.</div>}
            </div>
        </div>
      )}

      {viewMode === "stats" && (
        <div style={{ padding: '30px 5%', minHeight: '70vh', position: 'relative', zIndex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '30px' }}>📊 İSTATİSTİKLERİM</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}><div style={{ fontSize: '50px', marginBottom: '10px' }}>❤️</div><h3 style={{ margin: '0 0 5px 0', color: activeColor, fontSize: '36px' }}>{favorites.length}</h3><p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Favori İçerik</p></div>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}><div style={{ fontSize: '50px', marginBottom: '10px' }}>💬</div><h3 style={{ margin: '0 0 5px 0', color: activeColor, fontSize: '36px' }}>{currentUserTotalComments}</h3><p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Yaptığın Yorum</p></div>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}><div style={{ fontSize: '50px', marginBottom: '10px' }}>👀</div><h3 style={{ margin: '0 0 5px 0', color: activeColor, fontSize: '36px' }}>{recentlyViewed.length}</h3><p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Son İncelenen</p></div>
                 <div style={{ background: bgCard, padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: `1px solid ${activeColor}40`, boxShadow: `0 10px 30px rgba(0,0,0,0.2)` }}><div style={{ fontSize: '50px', marginBottom: '10px' }}>👍</div><h3 style={{ margin: '0 0 5px 0', color: '#ff4d4d', fontSize: '36px' }}>{getMyComments().reduce((sum, c) => sum + (c.likes || 0), 0)}</h3><p style={{ margin: 0, color: textLight, fontWeight: 'bold' }}>Aldığın Beğeni</p></div>
            </div>
            <div style={{ marginTop: '60px' }}>
                <h3 style={{ color: activeColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: '15px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>🎖️ SİNE-RÜTBE & VIP AYRICALIKLAR REHBERİ</h3>
                <p style={{ color: textLight, fontSize: '14px', marginBottom: '30px', lineHeight: '1.6' }}>SİNEPRO topluluğunda aktif ol, yorum yaptıkça sinema dünyasında seviye atla! Yüksek rütbeler, yorum alanında herkesin görebileceği <strong>Özel Tasarım Neon Çerçeveler</strong>, <strong>En Üste Sabitlenme</strong> ve <strong>VIP Rozetler</strong> kazanır.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <div style={{ background: bgCard, padding: '20px', borderRadius: '15px', borderLeft: '4px solid #888', border: `1px solid ${borderColor}` }}><span style={{ fontSize: '28px' }}>🍿</span><br/><strong style={{ color: '#888', fontSize: '18px' }}>Set Çaylağı</strong><p style={{ margin: '10px 0 0 0', fontSize: '13px', color: activeColor, fontWeight: 'bold' }}>0 - 9 Yorum</p></div>
                    <div style={{ background: bgCard, padding: '20px', borderRadius: '15px', borderLeft: '4px solid #00E5FF', border: `1px solid ${borderColor}` }}><span style={{ fontSize: '28px' }}>🔭</span><br/><strong style={{ color: '#00E5FF', fontSize: '18px' }}>Vizyoner</strong><p style={{ margin: '10px 0 0 0', fontSize: '13px', color: activeColor, fontWeight: 'bold' }}>10 - 49 Yorum</p></div>
                    <div style={{ background: bgCard, padding: '20px', borderRadius: '15px', borderLeft: '4px solid #9D00FF', border: `1px solid ${borderColor}` }}><span style={{ fontSize: '28px' }}>👁️‍🗨️</span><br/><strong style={{ color: '#9D00FF', fontSize: '18px' }}>Baş Eleştirmen</strong><p style={{ margin: '10px 0 0 0', fontSize: '13px', color: activeColor, fontWeight: 'bold' }}>50 - 149 Yorum</p></div>
                    <div style={{ background: bgCard, padding: '20px', borderRadius: '15px', borderLeft: '4px solid #FFD700', border: `1px solid ${borderColor}` }}><span style={{ fontSize: '28px' }}>🎬</span><br/><strong style={{ color: '#FFD700', fontSize: '18px' }}>Kült Yönetmen</strong><p style={{ margin: '10px 0 0 0', fontSize: '13px', color: activeColor, fontWeight: 'bold' }}>150 - 499 Yorum</p></div>
                    <div style={{ background: 'linear-gradient(135deg, rgba(255,0,85,0.1), transparent)', padding: '20px', borderRadius: '15px', borderLeft: '4px solid #FF0055', border: '1px solid rgba(255,0,85,0.3)' }}><span style={{ fontSize: '28px' }}>👑</span><br/><strong style={{ color: '#FF0055', fontSize: '20px' }}>SİNE-LORD</strong><p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#FF0055', fontWeight: 'bold' }}>500+ Yorum</p></div>
                </div>
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
                      <p style={{ margin: '15px 0 0 0', paddingTop: '15px', borderTop: `1px solid ${borderColor}` }}>SİNE Aİ akıllı asistanımız, <strong>Google Gemini</strong> yapay zeka altyapısı ile çalışmaktadır. Yapay zeka sistemleri zaman zaman hatalı veya eksik bilgiler üretebilir. Lütfen hassas veya kesinlik gerektiren bilgileri teyit ediniz.</p>
                  </div>
              </div>
          </div>
      )}

      {/* --- YARDIM VE DESTEK EKRANI --- */}
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
      {/* --- DESTEK OL VE INSTAGRAM (SAYFA SONU) --- */}
      {(viewMode === "support" || viewMode === "about") && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px 0', marginTop: 'auto', position: 'relative', zIndex: 10 }}>
              {/* INSTAGRAM BUTONU */}
              <a href="https://instagram.com/farukomer.46" target="_blank" rel="noreferrer" className="hover-effect" style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none', boxShadow: '0 4px 15px rgba(220, 39, 67, 0.3)', flexShrink: 0, transition: '0.3s' }} title="Instagram">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>

              {/* DESTEK OL BUTONU */}
              <a href="https://donate.bynogame.com/sinepro" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <div className="hover-effect" style={{ background: `linear-gradient(45deg, ${activeColor}, ${theme.secondary})`, color: badgeText, padding: '12px 25px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', boxShadow: `0 4px 15px ${activeColor}40`, cursor: 'pointer', transition: '0.3s' }}>
                      <span style={{ fontSize: '20px' }}>💎</span> DESTEK OL
                  </div>
              </a>
          </div>
      )}

      {/* --- FİLM DETAY VE YORUMLAR --- */}
      {selectedItem && (
        <div className="movie-detail-overlay">
          <div style={{ position: 'sticky', top: 0, zIndex: 1100, background: navBg, padding: '15px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderColor}` }}>
            <h2 style={{ color: activeColor, fontSize: '18px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{selectedItem.title || selectedItem.name}</h2>
            <button onClick={() => { setSelectedItem(null); setTrailerKey(null); setActiveTrailerKey(null); }} style={{ background: activeColor, color: badgeText, padding: '8px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>KAPAT</button>
          </div>
          <div style={{ width: '100%', height: '55vh', backgroundImage: `linear-gradient(to bottom, transparent, ${bgMain}), url(${getImgUrl(selectedItem.backdrop_path, 'original')})`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button onClick={() => { if (trailerKey) setActiveTrailerKey(trailerKey); else alert("Maalesef bu içerik için YouTube'da resmi bir fragman bulunamadı."); }} style={{ background: activeColor, color: badgeText, padding: '12px 35px', borderRadius: '50px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: `0 0 20px ${activeColor}80`, display: 'flex', alignItems: 'center', gap: '10px' }}>▶ FRAGMANI İZLE</button>
          </div>
          <div style={{ maxWidth: '1100px', margin: '-40px auto 0', padding: '0 5%' }}>
            <div className="detail-top-flex" style={{ display: 'flex', gap: '50px', flexWrap: 'wrap' }}>
              <div className="detail-poster-container"><img src={getImgUrl(selectedItem.poster_path)} className="detail-poster-img" style={{ borderRadius: '15px', border: `1px solid ${borderColor}`, boxShadow: `0 0 20px ${activeColor}40` }} alt="" /></div>
              <div style={{ flex: 1, minWidth: '300px', paddingTop: '40px' }}>
                <h1 className="detail-title-text" style={{ color: activeColor, fontWeight: '900', marginBottom: '5px' }}>{selectedItem.title || selectedItem.name}</h1>
                {selectedItem.tagline && <p style={{ fontStyle: 'italic', color: activeColor, fontSize: '16px', marginTop: '0', marginBottom: '20px', opacity: 0.8 }}>"{selectedItem.tagline}"</p>}
                <div className="detail-ratings-flex" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', margin: '20px 0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '20px' }}>⭐ TMDB:</span><span style={{ color: activeColor, fontSize: '24px', fontWeight: 'bold' }}>{selectedItem.vote_average?.toFixed(1)}</span></div>
                   {calculateProRating(selectedItem.id) && (<div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `1px solid ${borderColor}`, paddingLeft: '20px' }}><span style={{ backgroundColor: activeColor, color: badgeText, padding: '2px 8px', borderRadius: '4px', fontSize: '14px', fontWeight: '900', boxShadow: `0 0 10px ${activeColor}99` }}>PRO</span><span style={{ color: activeColor, fontSize: '24px', fontWeight: 'bold' }}>{calculateProRating(selectedItem.id)}</span></div>)}
                   <button onClick={() => shareMovie(selectedItem)} className="share-btn">📤 Paylaş</button>
                </div>
                <p style={{ color: textMuted, lineHeight: '1.8', fontSize: '16px', marginBottom: '25px' }}>{selectedItem.overview || "Bu içerik için henüz bir özet bulunmuyor."}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${activeColor}`, marginBottom: '20px' }}>
                  <div><div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Süre</div><div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>{selectedItem.runtime || selectedItem.episode_run_time?.[0] ? `${selectedItem.runtime || selectedItem.episode_run_time?.[0]} dakika` : 'Bilinmiyor'}</div></div>
                  <div><div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>İzlenme</div><div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>{Math.floor(((selectedItem.popularity || 15) * 14500) + ((selectedItem.vote_count || 10) * 1150)).toLocaleString('tr-TR')}</div></div>
                  <div><div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Yıl - Ülke</div><div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>{(selectedItem.release_date || selectedItem.first_air_date)?.substring(0,4) || 'Bilinmiyor'} • {selectedItem.production_countries?.[0]?.iso_3166_1 || 'Bilinmiyor'}</div></div>
                  <div><div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Türler</div><div style={{ fontWeight: 'bold', fontSize: '14px', color: textMain }}>{selectedItem.genres ? selectedItem.genres.map((g: any) => g.name).join(', ') : selectedItem.genre_ids ? selectedItem.genre_ids.map((id: number) => genres.find(g => g.id === id)?.name).filter(Boolean).join(', ') : 'Bilinmiyor'}</div></div>
                  <div><div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Dil</div><div style={{ fontWeight: 'bold', fontSize: '15px', color: textMain }}>{selectedItem.original_language?.toUpperCase() || 'Bilinmiyor'}</div></div>
                  {contentType === "movie" && selectedItem.revenue ? (<div><div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Gişe (Hasılat)</div><div style={{ fontWeight: 'bold', fontSize: '15px', color: activeColor }}>${(selectedItem.revenue / 1000000).toFixed(1)}M</div></div>) : contentType === "tv" && selectedItem.number_of_seasons ? (<div><div style={{ color: textLight, fontSize: '12px', textTransform: 'uppercase' }}>Sezon / Bölüm</div><div style={{ fontWeight: 'bold', fontSize: '15px', color: activeColor }}>{selectedItem.number_of_seasons} Sezon • {selectedItem.number_of_episodes} Bölüm</div></div>) : null}
                </div>
              </div>
            </div>
            {cast.length > 0 && (
              <div style={{ marginTop: '50px' }}>
                <h3 style={{ color: activeColor, borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px', marginBottom: '20px' }}>OYUNCU KADROSU</h3>
                <div className="horizontal-scroll" ref={castScrollRef}>
                  {cast.map((person: any) => (
                    <div key={person.id} style={{ minWidth: '100px', textAlign: 'center' }}><img src={person.profile_path ? getImgUrl(person.profile_path, 'w185') : 'https://via.placeholder.com/100x100?text=👤'} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.secondary}`, margin: '0 auto' }} alt="" /><p style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '10px', color: textMain }}>{person.name}</p><p style={{ fontSize: '10px', color: textLight }}>{person.character}</p></div>
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
                   {similar.map((s: any) => (
                     <div key={s.id} style={{ minWidth: '140px', textAlign: 'center', cursor: 'pointer' }}>
                        <div onClick={() => { setSelectedItem(s); fetchExtraDetails(s.id); addToRecentlyViewed(s); }} className="hover-effect" style={{ height: '210px', overflow: 'hidden', borderRadius: '12px', position: 'relative' }}><img src={getImgUrl(s.poster_path)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /><div onClick={(e) => toggleFavorite(e, s)} className="fav-heart-btn">{favorites.find(f => f.id === s.id) ? '❤️' : '🤍'}</div><div className="rating-badge-pro">★ {s.vote_average?.toFixed(1)}</div></div>
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
                     <div style={{ display: 'flex', gap: '10px', flex: 1 }}><UserAvatar user={currentUser} size="45px" activeColor={activeColor} theme={theme} badgeText={badgeText} /><input type="text" placeholder={currentUser ? "Bu yapım hakkında ne düşünüyorsun?" : "Yorum yapmak için giriş yapın..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} onClick={() => { if(!currentUser) { setAuthMode("login"); setShowLogin(true); } }} readOnly={!currentUser} onKeyDown={(e) => handleEnterKey(e, addComment)} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '12px 20px', borderRadius: '10px', color: textMain, outline: 'none' }} /></div>
                     <select value={commentRating} onChange={(e) => setCommentRating(Number(e.target.value))} disabled={!currentUser} style={{ background: inputBg, color: activeColor, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '10px', outline: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{[10,9,8,7,6,5,4,3,2,1].map(r => <option key={r} value={r}>{r} Puan</option>)}</select>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '15px', marginLeft: '55px' }}><label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#ff4d4d', fontWeight: 'bold' }}><input type="checkbox" checked={isSpoiler} onChange={(e) => setIsSpoiler(e.target.checked)} disabled={!currentUser} /> 🛑 Bu yorum spoiler içeriyor!</label></div>
                   <button onClick={addComment} style={{ background: activeColor, color: badgeText, border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>GÖNDER</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {(() => {
                      const currentComments = comments[selectedItem.id] || [];
                      const sortedComments = [...currentComments].sort((a, b) => { if (a.isVIP && !b.isVIP) return -1; if (!a.isVIP && b.isVIP) return 1; return b.id - a.id; });
                      return sortedComments.length > 0 ? (
                        sortedComments.map((c: any) => {
                           const cRank = getUserRank(c.authorCommentCount !== undefined ? c.authorCommentCount : 0);
                           return (
                             <div key={c.id} style={{ background: bgCard, borderRadius: '10px', padding: '15px', position: 'relative', ...cRank.perkStyle }}>
                                {c.isVIP && <div style={{ position: 'absolute', top: '-10px', right: '20px', background: cRank.color, color: '#000', padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', boxShadow: `0 4px 10px ${cRank.color}80` }}>📌 VIP</div>}
                                {currentUser && currentUser.username === c.user && <button onClick={(e) => { e.stopPropagation(); deleteComment(selectedItem.id, c.id); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: textLight, cursor: 'pointer', fontSize: '14px', zIndex: 5 }}>❌</button>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingRight: '25px' }}>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div className={cRank.isLord ? "vip-lord-avatar" : ""} onClick={(e) => { e.stopPropagation(); openProfileCard(c.user, c.avatar, c.authorBanner, c.authorCommentCount || 0); }} style={{ cursor: 'pointer', borderRadius: '50%', padding: cRank.isLord ? '3px' : '0' }}>
                                         <UserAvatar user={{ username: c.user, avatar: c.avatar }} size="32px" fontSize="12px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                              <span style={{ color: activeColor, fontWeight: 'bold', fontSize: '14px' }}>@{c.user}</span>
                                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: cRank.color + '20', color: cRank.color, border: `1px solid ${cRank.color}40`, marginLeft: '8px' }}>{cRank.icon} {cRank.name}</span>
                                              {currentUser && currentUser.username !== c.user && <button onClick={(e) => { e.stopPropagation(); handleFollowUser(c.user); }} style={{ background: 'transparent', border: `1px solid ${activeColor}`, color: activeColor, fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px', padding: '3px 8px', borderRadius: '15px' }}>+ Takip Et</button>}
                                          </div>
                                          <span style={{ color: textLight, fontSize: '10px', marginTop: '2px' }}>{c.date}</span>
                                      </div>
                                   </div>
                                   <span style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: activeColor, padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', height: 'fit-content' }}>Puan: {c.rating}</span>
                                </div>
                                <div style={{ position: 'relative', marginBottom: '10px' }}>
                                    <p style={{ margin: 0, color: textMain, lineHeight: '1.6', fontSize: '14px', filter: c.isSpoiler ? 'blur(8px)' : 'none', transition: '0.4s ease', cursor: c.isSpoiler ? 'pointer' : 'text' }} onClick={(e) => { if(c.isSpoiler) { e.currentTarget.style.filter = 'none'; e.currentTarget.style.cursor = 'text'; const badge = e.currentTarget.nextElementSibling as HTMLElement; if(badge) badge.style.display = 'none'; } }}>{c.text}</p>
                                    {c.isSpoiler && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', color: '#ff4d4d', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', pointerEvents: 'none', border: '1px solid #ff4d4d', backdropFilter: 'blur(2px)' }}>⚠️ SPOILER - GÖRMEK İÇİN TIKLA</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderTop: `1px solid ${borderColor}`, paddingTop: '10px', marginTop: '10px' }}>
                                    <button onClick={(e) => toggleLikeComment(e, selectedItem.id, c.id)} style={{ background: c.likedBy?.includes(currentUser?.username) ? 'rgba(255,0,0,0.1)' : 'transparent', border: `1px solid ${c.likedBy?.includes(currentUser?.username) ? '#ff4d4d' : borderColor}`, borderRadius: '20px', padding: '4px 10px', color: c.likedBy?.includes(currentUser?.username) ? '#ff4d4d' : textLight, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: '0.3s', fontWeight: 'bold' }}>{c.likedBy?.includes(currentUser?.username) ? '❤️' : '🤍'} {c.likes || 0}</button>
                                    <button onClick={() => { if (!currentUser) { setAuthMode("login"); setShowLogin(true); return; } if (replyingToId === c.id) { setReplyingToId(null); } else { setReplyingToId(c.id); setReplyText(""); } }} style={{ background: 'transparent', border: 'none', color: textLight, fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>💬 Cevapla</button>
                                </div>
                                {c.replies && c.replies.length > 0 && (
                                   <div style={{ marginLeft: '40px', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {!expandedReplies[c.id] ? <button onClick={() => setExpandedReplies({ ...expandedReplies, [c.id]: true })} style={{ background: 'transparent', border: 'none', color: textLight, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '25px', height: '1px', background: textLight, display: 'inline-block' }}></span> {c.replies.length} yanıtı gör</button>
                                      : (
                                          <>
                                              {c.replies.map((r: any) => (
                                                 <div key={r.id} style={{ position: 'relative', background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', padding: '10px 15px', borderRadius: '10px', borderLeft: `2px solid ${theme.secondary}` }}>
                                                    {currentUser && currentUser.username === r.user && <button onClick={(e) => { e.stopPropagation(); deleteReply(selectedItem.id, c.id, r.id); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: textLight, cursor: 'pointer', fontSize: '12px', zIndex: 5 }}>❌</button>}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                      <div className={cRank.isLord ? "vip-lord-avatar" : ""} onClick={(e) => { e.stopPropagation(); openProfileCard(c.user, c.avatar, c.authorBanner); }} style={{ cursor: 'pointer', borderRadius: '50%', padding: cRank.isLord ? '3px' : '0' }} title="Profili Görüntüle"><UserAvatar user={{ username: c.user, avatar: c.avatar }} size="32px" fontSize="12px" activeColor={activeColor} theme={theme} badgeText={badgeText} /></div>
                                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                                              <span style={{ color: activeColor, fontWeight: 'bold', fontSize: '14px' }}>@{c.user}</span>
                                                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: cRank.color + '20', color: cRank.color, border: `1px solid ${cRank.color}40`, marginLeft: '8px' }}>{cRank.icon} {cRank.name}</span>
                                                              {currentUser && currentUser.username !== c.user && <button onClick={(e) => { e.stopPropagation(); handleFollowUser(c.user); }} className="hover-effect" style={{ background: 'transparent', border: `1px solid ${activeColor}`, color: activeColor, fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px', padding: '3px 8px', borderRadius: '15px' }}>+ Takip Et</button>}
                                                          </div>
                                                          <span style={{ color: textLight, fontSize: '10px', marginTop: '2px' }}>{c.date}</span>
                                                      </div>
                                                   </div>
                                                    <p style={{ margin: '8px 0 0 0', color: textMain, fontSize: '13px', lineHeight: '1.5' }}>{r.text}</p>
                                                    <button onClick={() => { if (!currentUser) return setShowLogin(true); setReplyingToId(c.id); setReplyText(`@${r.user} `); }} style={{ background: 'transparent', border: 'none', color: activeColor, fontSize: '11px', cursor: 'pointer', padding: 0, fontWeight: 'bold', opacity: 0.8, marginTop: '8px' }}>↩ Yanıtla</button>
                                                 </div>
                                              ))}
                                              <button onClick={() => setExpandedReplies({ ...expandedReplies, [c.id]: false })} style={{ background: 'transparent', border: 'none', color: textLight, fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}><span style={{ width: '25px', height: '1px', background: textLight, display: 'inline-block' }}></span> Yanıtları gizle</button>
                                          </>
                                      )}
                                   </div>
                                )}
                                {replyingToId === c.id && (
                                   <div style={{ marginLeft: '40px', marginTop: '15px', display: 'flex', gap: '10px' }}>
                                       <input type="text" placeholder={`@${c.user} adlı kullanıcıya yanıt ver...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '10px 15px', borderRadius: '8px', color: textMain, fontSize: '13px', outline: 'none' }} onKeyDown={(e) => { if(e.key === 'Enter') handleReplySubmit(selectedItem.id, c.id, c.user, selectedItem.title || selectedItem.name); }} />
                                       <button onClick={() => handleReplySubmit(selectedItem.id, c.id, c.user, selectedItem.title || selectedItem.name)} style={{ background: activeColor, color: badgeText, border: 'none', padding: '0 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Gönder</button>
                                   </div>
                                )}
                             </div>
                           )
                        })
                      ) : <p style={{ color: textLight, textAlign: 'center', marginTop: '30px' }}>Henüz yorum yapılmamış.</p>;
                   })()}
                </div>
             </div>
             <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: textMuted, borderTop: `1px solid ${borderColor}`, marginTop: '80px', marginBottom: '40px' }}><p>© {new Date().getFullYear()} SİNEPRO. Tüm hakları saklıdır.</p></div>
          </div>
        </div>
      )}

      {/* --- SİNE Aİ PENCERESİ --- */}
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
                  </div>
               </div>
               
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* SIRALAMA BUTONU: Altın parıltılı efekt */}
                  <button 
                    onClick={() => { setShowAILeaderboard(!showAILeaderboard); if(!showAILeaderboard) fetchLeaderboard(); }} 
                    style={{ background: 'transparent', border: `1px solid ${theme.secondary}`, color: activeColor, padding: '6px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }} 
                    className="hover-effect"
                  >
                      {showAILeaderboard ? "💬 Sohbet" : "🏆 Sıralama"}
                  </button>
                  
                  {/* YARIŞMA BUTONU: Zaten efektliydi, koruduk */}
                  <button 
                    onClick={startAITrivia} 
                    style={{ background: 'transparent', border: `1px solid ${theme.secondary}`, color: activeColor, padding: '6px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }} 
                    className="hover-effect"
                  >
                      🎮 Yarışma
                  </button>
                  
                  {/* SİL BUTONU: Kırmızı uyarı efekti */}
                  <button 
                    onClick={() => setAiChatHistory([initialAIMessage])} 
                    style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', color: '#ff4d4d', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }} 
                    className="hover-effect"
                  >
                      🗑️ Sil
                  </button>
                  
                  {/* KAPAT BUTONU: Minimal geçişli efekt */}
                  <button 
                    onClick={() => setShowSineAI(false)} 
                    style={{ background: 'transparent', border: 'none', color: textLight, fontSize: '20px', cursor: 'pointer', transition: '0.3s' }} 
                    className="hover-effect"
                  >
                      ✕
                  </button>
               </div>
            </div>
            
          {showAILeaderboard ? (
                <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}><h2 style={{ color: activeColor, margin: 0 }}>🏆 SİNE-DEHA SIRALAMASI</h2></div>
                    
                    {leaderboardData.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {leaderboardData.map((user, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: bgCard, padding: '15px', borderRadius: '15px', border: `1px solid ${idx === 0 ? '#FFD700' : borderColor}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={{ fontSize: '20px', fontWeight: '900', color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : textLight }}>#{idx + 1}</span>
                                        <UserAvatar user={user} size="40px" fontSize="16px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                                        <span style={{ fontWeight: 'bold', color: textMain }}>@{user.username}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ fontWeight: '900', color: activeColor, fontSize: '18px' }}>{user.aiScore}</span>
                                        <span style={{ fontSize: '12px', color: textLight }}>Puan</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', marginTop: '50px', color: textLight }}>
                            <div style={{ fontSize: '50px', marginBottom: '15px', opacity: 0.5 }}>🏁</div>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>Sıralama yükleniyor veya henüz kimse puan alamadı...<br/><strong>🎮 Yarışma</strong> başlatıp SİNE-DEHA unvanını ilk sen kap!</p>
                        </div>
                    )}
                </div>
            ) : (
                <div ref={chatScrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {aiChatHistory.map((msg, idx) => (
                     <div key={idx} style={{ alignSelf: msg.role === "user" ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <div style={{ background: msg.role === "user" ? activeColor : inputBg, color: msg.role === "user" ? badgeText : textMain, padding: '12px 18px', borderRadius: msg.role === "user" ? '20px 20px 0 20px' : '20px 20px 20px 0', fontSize: '14px', lineHeight: '1.5' }}>{msg.text}</div>
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
                   {isAITyping && <div style={{ alignSelf: 'flex-start', background: inputBg, padding: '12px 18px', borderRadius: '20px 20px 20px 0', display: 'flex', gap: '5px' }}><span style={{ width: '8px', height: '8px', background: activeColor, borderRadius: '50%', animation: 'aiTyping 1s infinite' }}></span><span style={{ width: '8px', height: '8px', background: activeColor, borderRadius: '50%', animation: 'aiTyping 1s infinite 0.2s' }}></span><span style={{ width: '8px', height: '8px', background: activeColor, borderRadius: '50%', animation: 'aiTyping 1s infinite 0.4s' }}></span></div>}
                </div>
            )}

            <div style={{ padding: '15px', background: aiHeaderBg, borderTop: `1px solid ${activeColor}40`, display: 'flex', gap: '10px', alignItems: 'center' }}>
               <input type="text" placeholder="Sohbet et veya film iste..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => handleEnterKey(e, handleAISubmit)} disabled={isAITyping} style={{ flex: 1, background: bgCard, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '20px', color: textMain, outline: 'none' }} />
               <button onClick={handleAISubmit} disabled={isAITyping || !aiPrompt.trim()} style={{ background: activeColor, border: 'none', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><span style={{ color: badgeText, fontWeight: 'bold' }}>➤</span></button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFIL AYARLARI EKRANI (MODAL) --- */}
      {showProfileSettings && (
        <div style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div className="modal-box profile-modal" style={{ background: bgCard, overflowY: 'auto', maxHeight: '85vh', width: '100%', maxWidth: '450px', borderRadius: '25px', padding: '30px', border: `1px solid ${activeColor}` }}>
            <h3 style={{ color: activeColor, textAlign: 'center', marginTop: 0, marginBottom: '20px' }}>Profil Ayarlarım</h3>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}><UserAvatar user={currentUser} size="80px" fontSize="30px" activeColor={activeColor} theme={theme} badgeText={badgeText} /></div>
          
           <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '25px' }}>
                {(() => {
                    const baseAvatars = ["default", "/1.jpg", "/2.jpg", "/3.jpg", "/4.jpg", "/5.jpg", "/6.jpg", "/7.jpg", "/8.jpg"];
                    const displayAvatars = [...baseAvatars];
                    if (currentUser?.uploadedAvatar && !displayAvatars.includes(currentUser.uploadedAvatar)) displayAvatars.splice(1, 0, currentUser.uploadedAvatar);
                    
                    return displayAvatars.map((av, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            {av === "default" ? (
                                <div onClick={() => setCurrentUser({...currentUser, avatar: av})} style={{ width: '42px', height: '42px', borderRadius: '50%', background: `linear-gradient(45deg, ${activeColor}, ${theme.secondary})`, color: badgeText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', border: currentUser.avatar === av ? `2px solid ${activeColor}` : `1px solid ${borderColor}` }}>
                                    {currentUser?.username?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                            ) : (
                                <>
                                    <img src={av} onClick={() => setCurrentUser({...currentUser, avatar: av})} style={{ width: '42px', height: '42px', borderRadius: '50%', cursor: 'pointer', objectFit: 'cover', border: currentUser.avatar === av ? `2px solid ${activeColor}` : `1px solid ${borderColor}` }} alt="avatar" />
                                    
                                    {/* SADECE YÜKLENEN AVATARIN SAĞ ÜSTÜNDE ÇIKAN KÜÇÜK ÇARPI */}
                                    {av === currentUser?.uploadedAvatar && (
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); // Resme tıklanmış gibi olmasını engeller
                                                setCurrentUser({...currentUser, uploadedAvatar: null, avatar: 'default'}); 
                                            }} 
                                            style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    ));
                })()}
                
                {/* YENİ RESİM YÜKLEME ARTI (+) BUTONU */}
                <div onClick={() => fileInputRef.current?.click()} style={{ width: '42px', height: '42px', borderRadius: '50%', cursor: 'pointer', border: `2px dashed ${textLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: inputBg, color: textLight }}>+</div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>

            <div style={{ padding: '20px', background: inputBg, borderRadius: '15px', border: `1px solid ${borderColor}`, marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: activeColor, fontSize: '14px' }}>Kapak Fotoğrafı (Banner)</h4>
                <p style={{ fontSize: '11px', color: textLight, margin: '0 0 15px 0', lineHeight: '1.4' }}>Profiline istediğin bir resmi veya film karesini ekle (Maks 10MB).</p>
                <div style={{ textAlign: 'center' }}>
                    {/* BANNER SİL BUTONU */}
                    {currentUser?.banner && (
                        <div style={{ marginBottom: '10px' }}>
                            <button onClick={() => setCurrentUser({...currentUser, banner: null})} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }} className="hover-effect">
                                ✕ Kapak Fotoğrafını Kaldır
                            </button>
                        </div>
                    )}
                    {currentUser.banner && <img src={currentUser.banner} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '10px', marginBottom: '15px', border: `1px solid ${theme.secondary}` }} alt="banner" />}
                    <button onClick={() => bannerInputRef.current?.click()} style={{ background: 'transparent', border: `1px dashed ${activeColor}`, color: activeColor, padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '13px' }}>{currentUser.banner ? 'Fotoğrafı Değiştir' : 'Görsel Yükle'}</button>
                    <input type="file" accept="image/*" ref={bannerInputRef} style={{ display: 'none' }} onChange={handleBannerUpload} />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold', marginLeft: '5px' }}>Kullanıcı Adı</label>
                  <input type="text" value={currentUser?.username} onChange={(e) => setCurrentUser({...currentUser, username: e.target.value})} style={{ width: '100%', background: bgCard, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '12px', color: textMain, marginTop: '5px', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '12px', color: textMuted, fontWeight: 'bold', marginLeft: '5px' }}>Biyografi (Maks 50 Karakter)</label>
                  <input type="text" maxLength={50} placeholder="Kendinden bahset..." value={currentUser?.bio || ""} onChange={(e) => setCurrentUser({...currentUser, bio: e.target.value})} style={{ width: '100%', background: bgCard, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '12px', color: textMain, marginTop: '5px', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <button onClick={saveProfileSettings} style={{ width: '100%', background: activeColor, color: badgeText, padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none', fontSize: '15px', marginTop: '10px', boxShadow: `0 5px 15px ${activeColor}40` }}>DEĞİŞİKLİKLERİ KAYDET</button>
            </div>
            <button onClick={() => setShowProfileSettings(false)} style={{ width: '100%', background: 'none', color: textLight, marginTop: '15px', cursor: 'pointer', border: 'none', fontSize: '13px', fontWeight: 'bold' }}>Vazgeç ve Kapat</button>
          </div>
        </div>
      )}

      {/* --- YENİ NESİL PROFİL KARTI (INSTAGRAM İSTATİSTİKLİ POP-UP) --- */}
      {zoomedAvatar && (
        <div onClick={() => setZoomedAvatar(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 15000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div style={{ position: 'relative', width: '100%', maxWidth: '400px', background: bgCard, borderRadius: '25px', overflow: 'hidden', border: `1px solid ${activeColor}30`, boxShadow: `0 20px 60px rgba(0,0,0,0.6)`, animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} onClick={(e) => e.stopPropagation()}>
               {/* KAPAK FOTOĞRAFI (BANNER) */}
               <div style={{ width: '100%', height: '150px', backgroundColor: inputBg, backgroundImage: zoomedAvatar.banner ? `url(${zoomedAvatar.banner})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', borderBottom: `1px solid ${activeColor}20` }}>
                   <button onClick={() => setZoomedAvatar(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(5px)' }}>✕</button>
                   <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.9) 100%)' }}></div>
               </div>

               <div style={{ padding: '0 25px 25px 25px', marginTop: '-55px', position: 'relative', textAlign: 'center' }}>
                   {/* AVATAR */}
                   <div style={{ display: 'inline-block', borderRadius: '50%', padding: '5px', background: bgCard, boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
                       <UserAvatar user={{ username: zoomedAvatar.username, avatar: zoomedAvatar.avatar }} size="100px" fontSize="40px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                   </div>
                   
                   <h3 style={{ color: textMain, margin: '10px 0 5px 0', fontSize: '20px', fontWeight: '900' }}>@{zoomedAvatar.username}</h3>

                   {/* INSTAGRAM STİLİ İSTATİSTİKLER */}
                   <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', margin: '20px 0', borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}`, padding: '15px 0' }}>
                       <div style={{ textAlign: 'center' }}><span style={{ display: 'block', fontWeight: '900', color: textMain, fontSize: '18px' }}>{zoomedAvatar.stats?.posts || 0}</span><span style={{ color: textLight, fontSize: '12px', fontWeight: 'bold' }}>Gönderi</span></div>
                       <div style={{ textAlign: 'center' }}><span style={{ display: 'block', fontWeight: '900', color: textMain, fontSize: '18px' }}>{zoomedAvatar.stats?.followers || 0}</span><span style={{ color: textLight, fontSize: '12px', fontWeight: 'bold' }}>Takipçi</span></div>
                       <div style={{ textAlign: 'center' }}><span style={{ display: 'block', fontWeight: '900', color: textMain, fontSize: '18px' }}>{zoomedAvatar.stats?.following || 0}</span><span style={{ color: textLight, fontSize: '12px', fontWeight: 'bold' }}>Takip</span></div>
                   </div>
                   
                   {/* BİYOGRAFİ KUTUSU */}
                   <div style={{ minHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                       <p style={{ margin: 0, fontSize: '14px', color: textMain, lineHeight: '1.5', maxWidth: '300px' }}>{zoomedAvatar.bio || "SİNEPRO dünyasında bir sinema tutkunu... 🍿"}</p>
                   </div>

                   {/* BUTONLAR */}
                   <div style={{ display: 'flex', gap: '12px' }}>
                       {currentUser?.username !== zoomedAvatar.username ? (
                           <>
                               <button onClick={() => handleFollowUser(zoomedAvatar.username)} style={{ flex: 1, background: activeColor, color: badgeText, border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: `0 8px 20px ${activeColor}40`, transition: '0.3s' }}>Takip Et</button>
                               <button onClick={() => { setZoomedAvatar(null); setShowSocialPanel(true); }} style={{ flex: 1, background: inputBg, color: textMain, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>Mesaj Gönder</button>
                           </>
                       ) : (
                           <button onClick={() => { setZoomedAvatar(null); setViewMode("profile"); }} style={{ width: '100%', background: inputBg, color: textMain, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}>Profilimi Görüntüle</button>
                       )}
                   </div>
               </div>
           </div>
        </div>
      )}

      {/* --- EKSİK OLAN GİRİŞ/KAYIT (AUTH) MODALI --- */}
      {showLogin && (
        <div onClick={() => setShowLogin(false)} style={{ position: 'fixed', inset: 0, background: modalBg, backdropFilter: 'blur(5px)', zIndex: 25000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} className="modal-box auth-modal" style={{ background: bgCard, border: `1px solid ${activeColor}`, position: 'relative' }}>
            <button onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: textLight, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <h2 style={{ color: activeColor, textAlign: 'center', marginTop: 0 }}>
              {authMode === 'login' ? 'Giriş Yap' : authMode === 'register' ? 'Kayıt Ol' : 'Doğrulama'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              {(authMode === 'register' || authMode === 'login' || authMode === 'forgot_password') && (
                 <input type="email" placeholder="E-posta" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ padding: '12px', borderRadius: '10px', background: inputBg, color: textMain, border: `1px solid ${borderColor}`, outline: 'none' }} />
              )}
              {authMode === 'register' && (
                 <input type="text" placeholder="Kullanıcı Adı" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} style={{ padding: '12px', borderRadius: '10px', background: inputBg, color: textMain, border: `1px solid ${borderColor}`, outline: 'none' }} />
              )}
              {(authMode === 'register' || authMode === 'login' || authMode === 'new_password') && (
                 <input type="password" placeholder="Şifre" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ padding: '12px', borderRadius: '10px', background: inputBg, color: textMain, border: `1px solid ${borderColor}`, outline: 'none' }} />
              )}
              {(authMode === 'verify' || authMode === 'verify_forgot' || authMode === 'security_verify') && (
                 <input type="text" placeholder="6 Haneli Kod" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} style={{ padding: '12px', borderRadius: '10px', background: inputBg, color: textMain, border: `1px solid ${borderColor}`, outline: 'none' }} />
              )}

              {authMode === 'login' && <button onClick={handleLogin} style={{ background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Giriş Yap</button>}
              {authMode === 'register' && <button onClick={handleRegisterStart} style={{ background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Kayıt Ol</button>}
              {authMode === 'verify' && <button onClick={handleVerifyAndFinish} style={{ background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Kodu Doğrula</button>}
              {authMode === 'forgot_password' && <button onClick={handleForgotPasswordStart} style={{ background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Şifre Sıfırlama Kodu Gönder</button>}
              {authMode === 'verify_forgot' && <button onClick={handleVerifyForgot} style={{ background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Kodu Doğrula</button>}
              {authMode === 'new_password' && <button onClick={handleSaveNewPassword} style={{ background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Şifreyi Güncelle</button>}
              {authMode === 'security_verify' && <button onClick={handleSecurityUpdate} style={{ background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Kodu Doğrula</button>}
              
            </div>
            <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px' }}>
               {authMode === 'login' && (
                   <>
                     <p style={{ color: textLight, cursor: 'pointer' }} onClick={() => setAuthMode('register')}>Hesabın yok mu? Kayıt Ol</p>
                     <p style={{ color: textLight, cursor: 'pointer' }} onClick={() => setAuthMode('forgot_password')}>Şifremi Unuttum</p>
                   </>
               )}
               {authMode === 'register' && <p style={{ color: textLight, cursor: 'pointer' }} onClick={() => setAuthMode('login')}>Zaten hesabın var mı? Giriş Yap</p>}
               {authMode === 'forgot_password' && <p style={{ color: textLight, cursor: 'pointer' }} onClick={() => setAuthMode('login')}>Giriş ekranına dön</p>}
            </div>
          </div>
        </div>
      )}

      {/* --- GÜVENLİK AYARLARI MODALI --- */}
      {showSecuritySettings && (
        <div onClick={() => setShowSecuritySettings(false)} style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} className="modal-box auth-modal" style={{ background: bgCard, border: `1px solid ${activeColor}` }}>
              <h3 style={{ color: activeColor, textAlign: 'center', marginTop: 0 }}>Güvenlik Ayarları</h3>
              <input type="password" placeholder="Yeni Şifre" value={profilePassword} onChange={(e) => setProfilePassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: inputBg, color: textMain, border: `1px solid ${borderColor}`, outline: 'none', marginTop: '15px' }} />
              <button onClick={startSecurityVerify} style={{ width: '100%', background: activeColor, color: badgeText, padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}>Şifremi Değiştir</button>
          </div>
        </div>
      )}

      {/* --- TEMA DEĞİŞTİRME MODALI --- */}
      {showThemeSettings && (
        <div onClick={() => setShowThemeSettings(false)} style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} className="modal-box theme-modal" style={{ background: bgCard, border: `1px solid ${activeColor}` }}>
              <h3 style={{ color: activeColor, textAlign: 'center', marginTop: 0, marginBottom: '20px' }}>Tema Seçimi</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                 {themes.map(t => (
                    <button key={t.name} onClick={() => { setTheme(t); localStorage.setItem("sinepro_theme", JSON.stringify(t)); setShowThemeSettings(false); }} style={{ background: t.color, color: '#000', padding: '15px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }} className="hover-effect">
                       {t.name}
                    </button>
                 ))}
              </div>
          </div>
        </div>
      )}

      {/* --- FRAGMAN PENCERESİ --- */}
      {activeTrailerKey && (
        <div onClick={() => setActiveTrailerKey(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <iframe style={{ width: '90vw', height: '50vw', maxWidth: '1000px', maxHeight: '560px', borderRadius: '15px' }} src={`https://www.youtube.com/embed/${activeTrailerKey}?autoplay=1`} frameBorder="0" allowFullScreen></iframe>
           <button onClick={() => setActiveTrailerKey(null)} style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}

      {/* --- YENİ EKLENEN: INSTAGRAM STİLİ GÖNDERİ DETAY EKRANI --- */}
      {selectedPost && (
        <div onClick={() => { setSelectedPost(null); setShowCommentBox(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 21000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '900px', background: bgCard, borderRadius: '20px', display: 'flex', flexDirection: 'row', overflow: 'hidden', maxHeight: '80vh', border: `1px solid ${borderColor}` }}>
              <div style={{ flex: 1.5, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                 <img src={selectedPost.image} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} alt="Gönderi" />
              </div>
              <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${borderColor}` }}>
                 <div style={{ padding: '15px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserAvatar user={{ username: selectedPost.username, avatar: selectedPost.avatar }} size="35px" fontSize="14px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                    <span style={{ fontWeight: 'bold', color: textMain }}>@{selectedPost.username}</span>
                    <button onClick={() => setSelectedPost(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: textLight, cursor: 'pointer', fontSize: '18px' }}>✕</button>
                 </div>
                 <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
                    {selectedPost.caption && (
                       <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                          <UserAvatar user={{ username: selectedPost.username, avatar: selectedPost.avatar }} size="30px" fontSize="12px" activeColor={activeColor} theme={theme} badgeText={badgeText} />
                          <div>
                             <span style={{ fontWeight: 'bold', color: textMain, marginRight: '8px' }}>@{selectedPost.username}</span>
                             <span style={{ color: textMain, fontSize: '14px', lineHeight: '1.4' }}>{selectedPost.caption}</span>
                          </div>
                       </div>
                    )}
                   {/* YORUMLAR LİSTESİ */}
{selectedPost.comments && selectedPost.comments.length > 0 ? (
    selectedPost.comments.map((comment: any, index: number) => (
        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'flex-start' }}>
            <div style={{ width: '25px', height: '25px', borderRadius: '50%', background: `linear-gradient(45deg, ${activeColor}, ${theme.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: badgeText, fontSize: '10px', fontWeight: 'bold', flexShrink: 0 }}>
                {comment.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <span style={{ fontWeight: 'bold', color: textMain, marginRight: '8px', fontSize: '13px' }}>@{comment.username}</span>
                        <span style={{ color: textMain, fontSize: '13px', wordBreak: 'break-word' }}>{comment.text}</span>
                    </div>

                    {/* SADECE YORUM SAHİBİNE GÖRÜNEN SİL BUTONU */}
                    {comment.username === currentUser?.username && (
                        <button 
                            onClick={() => {
                                if(window.confirm("Bu yorumu kalıcı olarak silmek istiyor musun?")) {
                                    handleDeleteComment(selectedPost.id, comment);
                                }
                            }}
                            style={{ background: 'none', border: 'none', color: '#ff4d4d', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold', padding: '0 5px' }}
                        >
                            Sil
                        </button>
                    )}
                </div>
            </div>
        </div>
    ))
) : (
    <div style={{ color: textLight, fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>Henüz yorum yok. İlk yorumu sen yap!</div>
)}
                 </div>
                 <div style={{ padding: '15px', borderTop: `1px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                       <button 
                         onClick={() => {
                             handlePostLike(selectedPost.id, selectedPost.likes);
                             const isLiked = selectedPost.likes?.includes(currentUser?.username);
                             const newLikes = isLiked 
                                 ? selectedPost.likes.filter((u: any) => u !== currentUser?.username) 
                                 : [...(selectedPost.likes || []), currentUser?.username];
                             setSelectedPost({ ...selectedPost, likes: newLikes });
                         }} 
                         style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }} 
                         className="hover-effect"
                       >
                          {selectedPost.likes?.includes(currentUser?.username) ? '❤️' : '🤍'}
                       </button>
                       <button 
                           onClick={(e) => {
                               e.preventDefault();
                               setShowCommentBox(!showCommentBox); // Kutuyu aç/kapat
                               
                               // Eğer kutu açılıyorsa içine odaklan
                               if (!showCommentBox) {
                                   setTimeout(() => {
                                       const inputField = document.getElementById('modalCommentInput');
                                       if(inputField) {
                                           inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                           inputField.focus();
                                       }
                                   }, 100);
                               }
                           }} 
                           style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }} 
                           className="hover-effect"
                       >
                           💬
                       </button>
                    </div>
                    <span style={{ fontWeight: 'bold', color: textMain, fontSize: '14px' }}>{selectedPost.likes?.length || 0} beğenme</span>
                    <span style={{ display: 'block', color: textLight, fontSize: '11px', marginTop: '5px' }}>{selectedPost.date}</span>
                   
                   {/* YORUM YAPMA KUTUSU */}
                    {showCommentBox && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: `1px solid ${borderColor}`, paddingTop: '15px', marginTop: '15px' }}>
                            <input 
                                id="modalCommentInput"
                                type="text" 
                                placeholder="Yorum ekle..." 
                                style={{ flex: 1, background: 'transparent', border: 'none', color: textMain, outline: 'none', fontSize: '14px' }}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        const commentText = e.currentTarget.value.trim();
                                        const newComment = { username: currentUser?.username || "Kullanıcı", text: commentText };
                                        const updatedComments = [...(selectedPost.comments || []), newComment];
                                        
                                        // 1. Ekranda anında göster (Bekletmeden)
                                        setSelectedPost({ ...selectedPost, comments: updatedComments });
                                        e.currentTarget.value = ''; 
                                        
                                        // 2. KALICI HAFIZAYA (VERİTABANINA) KAYDET
                                        if (selectedPost.id) {
                                            try {
                                                await setDoc(doc(db, "posts", selectedPost.id), { comments: updatedComments }, { merge: true });
                                            } catch (error) { console.error("Yorum kaydedilemedi!", error); }
                                        }
                                    }
                                }}
                            />
                            <button 
                                onClick={async () => {
                                    const input = document.getElementById('modalCommentInput') as HTMLInputElement;
                                    if (input && input.value.trim()) {
                                        const commentText = input.value.trim();
                                        const newComment = { username: currentUser?.username || "Kullanıcı", text: commentText };
                                        const updatedComments = [...(selectedPost.comments || []), newComment];
                                        
                                        // 1. Ekranda anında göster
                                        setSelectedPost({ ...selectedPost, comments: updatedComments });
                                        input.value = '';
                                        
                                        // 2. KALICI HAFIZAYA (VERİTABANINA) KAYDET
                                        if (selectedPost.id) {
                                            try {
                                                await setDoc(doc(db, "posts", selectedPost.id), { comments: updatedComments }, { merge: true });
                                            } catch (error) { console.error("Yorum kaydedilemedi!", error); }
                                        }
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', color: activeColor, fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                            >
                                Paylaş
                            </button>
                        </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- YENİ EKLENEN: GÖNDERİ PAYLAŞMA KÜÇÜK PENCERESİ --- */}
      {newPostImage && (
        <div style={{ position: 'fixed', inset: 0, background: modalBg, zIndex: 16000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div style={{ background: bgCard, padding: '20px', borderRadius: '15px', width: '100%', maxWidth: '500px', border: `1px solid ${activeColor}` }}>
               <h4 style={{ margin: '0 0 15px 0', color: textMain, fontSize: '18px' }}>Yeni Gönderi Paylaş</h4>
               <div style={{ position: 'relative', marginBottom: '15px', textAlign: 'center', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                   <img src={newPostImage} style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain' }} alt="Önizleme" />
                   <button onClick={() => setNewPostImage(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>✕</button>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                   <input type="text" placeholder="Bu fotoğraf hakkında bir şeyler yaz..." value={newPostCaption} onChange={(e) => setNewPostCaption(e.target.value)} style={{ flex: 1, padding: '12px 15px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: inputBg, color: textMain, outline: 'none' }} />
                   <button onClick={sharePost} style={{ background: activeColor, color: badgeText, border: 'none', padding: '0 25px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Paylaş</button>
               </div>
           </div>
        </div>
      )}

      {/* --- SİNE SOSYAL PANEL --- */}
      {showSocialPanel && currentUser && (
          <SocialPanel 
              currentUser={currentUser} 
              onClose={() => setShowSocialPanel(false)} 
              theme={theme} 
              isDarkMode={isDarkMode} 
              activeColor={activeColor} 
          />
      )}

      {/* --- KÜRESEL SOHBET RESMİ BÜYÜTME EKRANI (POP-UP) --- */}
      {zoomedChatImage && (
        <div 
            onClick={() => setZoomedChatImage(null)} 
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 16000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
            <img 
                src={zoomedChatImage} 
                style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '15px', boxShadow: '0 10px 50px rgba(0,0,0,0.5)', objectFit: 'contain' }} 
                alt="Büyütülmüş Fotoğraf" 
            />
            <button 
                onClick={() => setZoomedChatImage(null)} 
                style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '24px', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                ✕
            </button>
        </div>
      )}

      <SpeedInsights />
    </main>
  );
}