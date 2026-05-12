"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
// DİKKAT: setDoc, addDoc ve serverTimestamp eklendi! (DM Fotoğrafları için)
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { searchUserByUsername, markChatAsRead } from '../lib/social-functions';

export default function SocialPanel({ currentUser, onClose, theme, isDarkMode, activeColor, lang = "TR", onOpenProfile }: any) {
    const [activeTab, setActiveTab] = useState<"chats" | "friends" | "requests" | "search">("chats");
    
    const [friends, setFriends] = useState<string[]>([]);
    const [requests, setRequests] = useState<string[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    
    const [requestUsersData, setRequestUsersData] = useState<any[]>([]);
    const [friendsUserData, setFriendsUserData] = useState<any[]>([]);
    const [chatUsersData, setChatUsersData] = useState<any[]>([]); // YENİ: Sohbetlerdeki kişilerin avatarları için
    
    const [searchInput, setSearchInput] = useState("");
    const [searchResult, setSearchResult] = useState<any>(null);
    const [searchStatus, setSearchStatus] = useState("");

    const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [messageInput, setMessageInput] = useState("");
    
    // YENİ: DM için resim hafızası
    const [dmImage, setDmImage] = useState<string | null>(null);
    const [zoomedDmImage, setZoomedDmImage] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const bgCard = isDarkMode ? '#1F2833' : '#FFFFFF';
    const inputBg = isDarkMode ? '#0B0C10' : '#E8ECEF';
    const textMain = isDarkMode ? 'white' : '#111111';
    const textLight = isDarkMode ? '#888' : '#999999';
    const borderColor = isDarkMode ? '#333' : '#DDDDDD';

    useEffect(() => {
        if (!currentUser?.uid) return;
        const unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFriends(data.friends || []);
                setRequests(data.friendRequests || []);
            }
        });
        return () => unsubUser();
    }, [currentUser]);

    useEffect(() => {
        const fetchRequestData = async () => {
            if (requests.length === 0) { setRequestUsersData([]); return; }
            const details = [];
            for (const reqUsername of requests) {
                const q = query(collection(db, "users"), where("username", "==", reqUsername));
                const snap = await getDocs(q);
                if (!snap.empty) details.push(snap.docs[0].data());
                else details.push({ username: reqUsername, avatar: "default" });
            }
            setRequestUsersData(details);
        };
        fetchRequestData();
    }, [requests]);

    useEffect(() => {
        const fetchFriendsData = async () => {
            if (friends.length === 0) { setFriendsUserData([]); return; }
            const details = [];
            for (const fUsername of friends) {
                const q = query(collection(db, "users"), where("username", "==", fUsername));
                const snap = await getDocs(q);
                if (!snap.empty) details.push(snap.docs[0].data());
                else details.push({ username: fUsername, avatar: "default" });
            }
            setFriendsUserData(details);
        };
        fetchFriendsData();
    }, [friends]);

    useEffect(() => {
        if (!currentUser?.username) return;
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.username));
        const unsubChats = onSnapshot(q, (snapshot) => {
            const loadedChats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            loadedChats.sort((a: any, b: any) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
            setChats(loadedChats);
        });
        return () => unsubChats();
    }, [currentUser]);

    // YENİ MOTOR: Sohbet Listesindeki Adamların Avatarlarını Çeker
    useEffect(() => {
        const fetchChatUsersData = async () => {
            if (chats.length === 0) { setChatUsersData([]); return; }
            const details = [];
            for (const chat of chats) {
                const otherUser = chat.participants.find((p: string) => p !== currentUser.username);
                if (otherUser) {
                    const q = query(collection(db, "users"), where("username", "==", otherUser));
                    const snap = await getDocs(q);
                    if (!snap.empty) details.push(snap.docs[0].data());
                    else details.push({ username: otherUser, avatar: "default" });
                }
            }
            setChatUsersData(details);
        };
        fetchChatUsersData();
    }, [chats, currentUser]);

    useEffect(() => {
        if (!activeChatUser || !currentUser?.username) return;
        const chatId = [currentUser.username, activeChatUser].sort().join("_");
        const q = query(collection(db, `chats/${chatId}/messages`), orderBy("createdAt", "asc"));
        const unsubMessages = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            markChatAsRead(chatId, currentUser.username); 
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return () => unsubMessages();
    }, [activeChatUser, currentUser]);

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation(); 
        if (!window.confirm(lang === "TR" ? "Bu sohbeti tamamen silmek istediğine emin misin?" : "Are you sure you want to delete this chat?")) return;
        try {
            await deleteDoc(doc(db, "chats", chatId));
        } catch (error) { console.error("Sohbet silme hatası", error); }
    };

    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        if (searchInput.trim().toLowerCase() === currentUser.username.toLowerCase()) {
            setSearchStatus(lang === "TR" ? "Kendinizi ekleyemezsiniz :)" : "You cannot add yourself :)");
            return;
        }
        setSearchStatus(lang === "TR" ? "Aranıyor..." : "Searching...");
        const res = await searchUserByUsername(searchInput.trim());
        if (res) { setSearchResult(res); setSearchStatus(""); }
        else { setSearchResult(null); setSearchStatus(lang === "TR" ? "Kullanıcı bulunamadı." : "User not found."); }
    };

    const handleSendRequest = async (targetUsername: string) => {
        try {
            const q = query(collection(db, "users"), where("username", "==", targetUsername));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return;
            const targetUserDoc = querySnapshot.docs[0];
            if (targetUserDoc.data().isPrivate) {
                alert(lang === "TR" ? "Bu hesap gizli!" : "This account is private!");
                return;
            }
            await updateDoc(doc(db, "users", targetUserDoc.id), { friendRequests: arrayUnion(currentUser.username) });
            alert(lang === "TR" ? "İstek gönderildi!" : "Request sent!");
            setSearchResult(null);
        } catch (error) { alert("Hata!"); }
    };

    const handleAcceptRequest = async (targetUsername: string) => {
        try {
            await updateDoc(doc(db, "users", currentUser.uid), { friendRequests: arrayRemove(targetUsername), friends: arrayUnion(targetUsername) });
            const q = query(collection(db, "users"), where("username", "==", targetUsername));
            const snap = await getDocs(q);
            if (!snap.empty) await updateDoc(doc(db, "users", snap.docs[0].id), { friends: arrayUnion(currentUser.username) });
        } catch (e) { console.error(e); }
    };

    const handleRemoveFriend = async (targetUsername: string) => {
        if (!window.confirm(lang === "TR" ? "Arkadaşlıktan çıkarmak istiyor musun?" : "Unfriend?")) return;
        try {
            await updateDoc(doc(db, "users", currentUser.uid), { friendRequests: arrayRemove(targetUsername), friends: arrayRemove(targetUsername) });
            const q = query(collection(db, "users"), where("username", "==", targetUsername));
            const snap = await getDocs(q);
            if (!snap.empty) await updateDoc(doc(db, "users", snap.docs[0].id), { friends: arrayRemove(currentUser.username) });
        } catch (e) { console.error(e); }
    };

    // YENİ MOTOR: DM'den Resim Seçme
    const handleDmImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert(lang === "TR" ? "Dosya çok büyük! Lütfen 10MB'dan küçük bir resim seçin." : "File too large! Max 10MB.");
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                const MAX_WIDTH = 1200; 
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    setDmImage(canvas.toDataURL('image/jpeg', 0.6));
                }
            };
            if (event.target?.result) img.src = event.target.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; 
    };

    // YENİ MOTOR: Hem Yazı Hem Fotoğraf Gönderebilen DM Sistemi
    const handleSendMessage = async () => {
        if ((!messageInput.trim() && !dmImage) || !activeChatUser) return;
        
        const text = messageInput.trim();
        const imageToSend = dmImage;

        setMessageInput("");
        setDmImage(null);

        const chatId = [currentUser.username, activeChatUser].sort().join("_");
        try {
            await addDoc(collection(db, `chats/${chatId}/messages`), {
                sender: currentUser.username,
                text: text,
                image: imageToSend,
                createdAt: serverTimestamp()
            });
            
            await setDoc(doc(db, "chats", chatId), {
                participants: [currentUser.username, activeChatUser],
                lastMessage: text || (lang === "TR" ? "📷 Fotoğraf" : "📷 Photo"),
                lastMessageTime: serverTimestamp(),
                lastSender: currentUser.username,
                isRead: false
            }, { merge: true });

            const targetNotifKey = `sinepro_notifications_${activeChatUser}`;
            const targetNotifs = JSON.parse(localStorage.getItem(targetNotifKey) || "[]");
            targetNotifs.unshift({ id: Date.now(), text: `@${currentUser.username} ${lang === "TR" ? "sana bir mesaj gönderdi! 💬" : "sent you a message! 💬"}`, isRead: false, date: new Date().toLocaleDateString('tr-TR') });
            localStorage.setItem(targetNotifKey, JSON.stringify(targetNotifs));
            
        } catch (error) { 
            console.error(error);
            alert(lang === "TR" ? "Mesaj gönderilemedi." : "Message couldn't be sent."); 
        }
    };

    const handleUnsendMessage = async (msgId: string) => {
        if(!window.confirm(lang === "TR" ? "Mesajı herkesten silmek istiyor musun?" : "Unsend this message?")) return;
        try {
            const chatId = [currentUser.username, activeChatUser].sort().join("_");
            await deleteDoc(doc(db, `chats/${chatId}/messages`, msgId));
        } catch(e) { console.error("Silme hatası", e); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onClick={onClose}>
            <div style={{ width: '100%', maxWidth: '400px', height: '100%', background: bgCard, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                
                <style dangerouslySetInnerHTML={{ __html: `@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }` }} />

                <div style={{ padding: '20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: activeColor, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {activeChatUser ? (
                            <>
                                <button onClick={() => setActiveChatUser(null)} style={{ background: 'none', border: 'none', color: activeColor, cursor: 'pointer', fontSize: '20px', padding: 0 }}>❮</button>
                                <span onClick={() => onOpenProfile && onOpenProfile(activeChatUser, "default")} style={{ cursor: 'pointer' }}>@{activeChatUser}</span>
                            </>
                        ) : (lang === "TR" ? "SİNE-SOSYAL" : "SINE-SOCIAL")}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: textLight, fontSize: '24px', cursor: 'pointer' }}>✕</button>
                </div>

                {!activeChatUser ? (
                    <>
                        <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}` }}>
                            <button onClick={() => setActiveTab("chats")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "chats" ? activeColor : textLight, borderBottom: activeTab === "chats" ? `3px solid ${activeColor}` : '3px solid transparent' }}>{lang === "TR" ? "Sohbetler" : "Chats"}</button>
                            <button onClick={() => setActiveTab("friends")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "friends" ? activeColor : textLight, borderBottom: activeTab === "friends" ? `3px solid ${activeColor}` : '3px solid transparent' }}>{lang === "TR" ? "Arkadaşlar" : "Friends"}</button>
                            <button onClick={() => setActiveTab("requests")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "requests" ? activeColor : textLight, borderBottom: activeTab === "requests" ? `3px solid ${activeColor}` : '3px solid transparent', position: 'relative' }}>
                                {lang === "TR" ? "İstekler" : "Requests"}
                                {requests.length > 0 && <span style={{ position: 'absolute', top: '10px', right: '10px', width: '10px', height: '10px', background: '#ff4d4d', borderRadius: '50%' }}></span>}
                            </button>
                            <button onClick={() => setActiveTab("search")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "search" ? activeColor : textLight, borderBottom: activeTab === "search" ? `3px solid ${activeColor}` : '3px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                🔍 {lang === "TR" ? "Ara" : "Search"}
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            
                            {/* TAB: SOHBETLER */}
                            {activeTab === "chats" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {chats.length > 0 ? chats.map(chat => {
                                        const otherUser = chat.participants.find((p: string) => p !== currentUser.username);
                                        const unread = !chat.isRead && chat.lastSender !== currentUser.username;
                                        // Kullanıcının avatarını bul
                                        const chatUserData = chatUsersData.find(u => u.username === otherUser);
                                        
                                        return (
                                            <div key={chat.id} style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '15px', background: inputBg, borderRadius: '12px', borderLeft: unread ? `4px solid ${activeColor}` : '4px solid transparent' }}>
                                                {/* SOHBET KISMINDAKİ AVATAR */}
                                                <div 
                                                    onClick={() => onOpenProfile && onOpenProfile(otherUser, chatUserData?.avatar || "default")}
                                                    style={{ width: '45px', height: '45px', borderRadius: '50%', overflow: 'hidden', background: chatUserData?.avatar && chatUserData.avatar !== "default" ? 'transparent' : activeColor, border: `2px solid ${activeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}
                                                >
                                                    {chatUserData?.avatar && chatUserData.avatar !== "default" 
                                                        ? <img src={chatUserData.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> 
                                                        : otherUser.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setActiveChatUser(otherUser)}>
                                                    <h4 style={{ margin: '0 0 5px 0', color: textMain, fontSize: '15px' }}>{otherUser}</h4>
                                                    <p style={{ margin: 0, color: unread ? activeColor : textLight, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unread ? 'bold' : 'normal' }}>
                                                        {chat.lastSender === currentUser.username ? (lang === "TR" ? "Sen: " : "You: ") : ""}{chat.lastMessage}
                                                    </p>
                                                </div>
                                                <button onClick={(e) => handleDeleteChat(e, chat.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '18px', padding: '5px' }}>🗑️</button>
                                            </div>
                                        );
                                    }) : <p style={{ textAlign: 'center', color: textLight, marginTop: '40px' }}>{lang === "TR" ? "Henüz aktif bir sohbetiniz yok." : "No active chats yet."}</p>}
                                </div>
                            )}

                            {/* TAB: ARKADAŞLAR */}
                            {activeTab === "friends" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {friendsUserData.length > 0 ? friendsUserData.map(fUser => (
                                        <div key={fUser.username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: inputBg, borderRadius: '15px', border: `1px solid ${borderColor}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => onOpenProfile && onOpenProfile(fUser.username, fUser.avatar, fUser.banner)}>
                                                {/* ARKADAŞ AVATARI */}
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: fUser.avatar !== "default" ? 'transparent' : activeColor, border: `2px solid ${activeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                                                    {fUser.avatar !== "default" ? <img src={fUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : fUser.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ color: textMain, fontWeight: 'bold', fontSize: '15px' }}>@{fUser.username}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => setActiveChatUser(fUser.username)} style={{ background: activeColor, color: '#000', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>{lang === "TR" ? "Mesaj" : "Chat"}</button>
                                                <button onClick={() => handleRemoveFriend(fUser.username)} style={{ background: 'transparent', border: `1px solid #ff4d4d`, color: '#ff4d4d', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                                            </div>
                                        </div>
                                    )) : <p style={{ textAlign: 'center', color: textLight, marginTop: '40px' }}>{lang === "TR" ? "Arkadaşın yok." : "No friends yet."}</p>}
                                </div>
                            )}

                            {/* TAB: İSTEKLER */}
                            {activeTab === "requests" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {requestUsersData.length > 0 ? requestUsersData.map(reqUser => (
                                        <div key={reqUser.username} style={{ position: 'relative', overflow: 'hidden', borderRadius: '15px', background: inputBg, border: `1px solid ${borderColor}`, padding: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
                                            {reqUser.banner && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${reqUser.banner})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3, zIndex: 0 }}></div>}
                                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div onClick={() => onOpenProfile && onOpenProfile(reqUser.username, reqUser.avatar, reqUser.banner)} style={{ width: '45px', height: '45px', borderRadius: '50%', background: reqUser.avatar !== "default" ? 'transparent' : activeColor, border: `2px solid ${activeColor}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                                                        {reqUser.avatar !== "default" ? <img src={reqUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : reqUser.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span onClick={() => onOpenProfile && onOpenProfile(reqUser.username, reqUser.avatar, reqUser.banner)} style={{ color: textMain, fontWeight: 'bold', cursor: 'pointer' }}>@{reqUser.username}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => handleAcceptRequest(reqUser.username)} style={{ background: '#4CAF50', color: 'white', border: 'none', width: '35px', height: '35px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                                                    <button onClick={() => handleRemoveFriend(reqUser.username)} style={{ background: '#ff4d4d', color: 'white', border: 'none', width: '35px', height: '35px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                                                </div>
                                            </div>
                                        </div>
                                    )) : <p style={{ textAlign: 'center', color: textLight, marginTop: '40px' }}>{lang === "TR" ? "Bekleyen istek yok." : "No requests."}</p>}
                                </div>
                            )}

                            {/* TAB: SEARCH */}
                            {activeTab === "search" && (
                                <div>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <input type="text" placeholder={lang === "TR" ? "Kullanıcı adı yaz..." : "Type username..."} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '10px', color: textMain, outline: 'none' }} />
                                        <button onClick={handleSearch} style={{ background: activeColor, color: '#000', border: 'none', padding: '0 15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Bul</button>
                                    </div>
                                    {searchResult && (
                                        <div style={{ background: inputBg, padding: '20px', borderRadius: '15px', textAlign: 'center', border: `1px solid ${activeColor}` }}>
                                            <div onClick={() => onOpenProfile && onOpenProfile(searchResult.username, "default")} style={{ width: '60px', height: '60px', borderRadius: '50%', background: activeColor, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer' }}>
                                                {searchResult.username.charAt(0).toUpperCase()}
                                            </div>
                                            <h3 onClick={() => onOpenProfile && onOpenProfile(searchResult.username, "default")} style={{ margin: '0 0 15px 0', color: textMain, cursor: 'pointer' }}>@{searchResult.username}</h3>
                                            
                                            {searchResult.isPrivate ? (
                                                <div style={{ padding: '8px 20px', color: '#ff4d4d', fontWeight: 'bold', border: '1px solid #ff4d4d', borderRadius: '8px', display: 'inline-block' }}>🔒 {lang === "TR" ? "Bu hesap gizli" : "Private Account"}</div>
                                            ) : friends.includes(searchResult.username) ? (
                                                <button disabled style={{ background: 'transparent', color: textLight, border: `1px solid ${textLight}`, padding: '8px 20px', borderRadius: '8px', cursor: 'not-allowed' }}>{lang === "TR" ? "Zaten Arkadaşsınız" : "Already Friends"}</button>
                                            ) : requests.includes(searchResult.username) ? (
                                                <button onClick={() => handleAcceptRequest(searchResult.username)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{lang === "TR" ? "İsteği Kabul Et" : "Accept Request"}</button>
                                            ) : (
                                                <button onClick={() => handleSendRequest(searchResult.username)} style={{ background: activeColor, color: '#000', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{lang === "TR" ? "Arkadaş Ekle" : "Add Friend"}</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* MESAJLAŞMA EKRANI (AÇIK DM) */
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {messages.map(msg => {
                                const isMe = msg.sender === currentUser.username;
                                const msgTime = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                            <div style={{ background: isMe ? activeColor : inputBg, color: isMe ? '#000' : textMain, padding: '10px 15px', borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0', fontSize: '14px', lineHeight: '1.4' }}>
                                                {/* EĞER RESİM VARSA GÖSTER */}
                                                {msg.image && (
                                                    <img 
                                                        src={msg.image} 
                                                        onClick={() => setZoomedDmImage(msg.image)}
                                                        style={{ cursor: 'zoom-in', maxWidth: '200px', width: '100%', borderRadius: '10px', marginBottom: msg.text ? '8px' : '0', objectFit: 'cover' }} 
                                                        alt="DM Fotoğraf" 
                                                    />
                                                )}
                                                {msg.text && <div>{msg.text}</div>}
                                            </div>
                                            {isMe && (
                                                <button onClick={() => handleUnsendMessage(msg.id)} style={{ background: 'rgba(255,0,0,0.1)', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '12px', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px' }} title={lang === "TR" ? "Geri Al (Herkesten Sil)" : "Unsend"}>
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '10px', color: textLight, alignSelf: isMe ? 'flex-end' : 'flex-start', margin: isMe ? '0 35px 0 0' : '0 0 0 5px', fontWeight: 'bold' }}>
                                            {msgTime}
                                        </span>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        {/* DM RESİM ÖNİZLEME KUTUSU */}
                        {dmImage && (
                            <div style={{ position: 'relative', display: 'inline-block', padding: '10px 15px', background: bgCard, borderTop: `1px solid ${borderColor}` }}>
                                <img src={dmImage} style={{ height: '80px', borderRadius: '8px', border: `2px solid ${activeColor}` }} alt="Preview" />
                                <button onClick={() => setDmImage(null)} style={{ position: 'absolute', top: '2px', right: '5px', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                            </div>
                        )}

                        <div style={{ padding: '15px', borderTop: `1px solid ${borderColor}`, display: 'flex', gap: '10px', background: bgCard }}>
                            {/* YENİ: DM FOTOĞRAF EKLEME BUTONU */}
                            <button onClick={() => document.getElementById('dmImageInput')?.click()} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: 0 }} className="hover-effect">📸</button>
                            <input type="file" accept="image/*" onChange={handleDmImageUpload} style={{ display: 'none' }} id="dmImageInput" />
                            
                            <input type="text" placeholder={lang === "TR" ? "Mesaj yaz..." : "Type message..."} value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '20px', color: textMain, outline: 'none' }} />
                            <button onClick={handleSendMessage} disabled={!messageInput.trim() && !dmImage} style={{ background: activeColor, color: '#000', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (messageInput.trim() || dmImage) ? 'pointer' : 'not-allowed', opacity: (messageInput.trim() || dmImage) ? 1 : 0.5 }}>➤</button>
                        </div>
                    </div>
                )}
            </div>

            {/* YENİ: DM'DEKİ RESMİ BÜYÜTME POP-UP'I */}
            {zoomedDmImage && (
                <div onClick={(e) => { e.stopPropagation(); setZoomedDmImage(null); }} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
                    <img src={zoomedDmImage} style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '15px', boxShadow: '0 10px 50px rgba(0,0,0,0.5)', objectFit: 'contain' }} alt="Büyütülmüş Fotoğraf" />
                    <button onClick={() => setZoomedDmImage(null)} style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '24px', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
            )}
        </div>
    );
}