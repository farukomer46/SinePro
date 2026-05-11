"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { searchUserByUsername, sendDirectMessage, markChatAsRead } from '../lib/social-functions';

export default function SocialPanel({ currentUser, onClose, theme, isDarkMode, activeColor, lang = "TR", onOpenProfile }: any) {
    const [activeTab, setActiveTab] = useState<"chats" | "friends" | "requests" | "search">("chats");
    
    const [friends, setFriends] = useState<string[]>([]);
    const [requests, setRequests] = useState<string[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    
    // Veri hafızaları (Avatar ve Bannerlar için)
    const [requestUsersData, setRequestUsersData] = useState<any[]>([]);
    const [friendsUserData, setFriendsUserData] = useState<any[]>([]);
    
    const [searchInput, setSearchInput] = useState("");
    const [searchResult, setSearchResult] = useState<any>(null);
    const [searchStatus, setSearchStatus] = useState("");

    const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [messageInput, setMessageInput] = useState("");
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const bgCard = isDarkMode ? '#1F2833' : '#FFFFFF';
    const inputBg = isDarkMode ? '#0B0C10' : '#E8ECEF';
    const textMain = isDarkMode ? 'white' : '#111111';
    const textLight = isDarkMode ? '#888' : '#999999';
    const borderColor = isDarkMode ? '#333' : '#DDDDDD';

    // 1. Temel Arkadaş ve İstek Verilerini Dinle
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

    // 2. İstek Atanların Profil Verilerini Çek
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

    // 3. Arkadaşların Profil Verilerini (Avatarlarını) Çek
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

    // 4. Sohbet Listesini Dinle
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

    // 5. Mesajları Dinle
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

    // --- FONKSİYONLAR ---

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation(); // Kart tıklamasını engelle
        if (!window.confirm(lang === "TR" ? "Bu sohbeti tamamen silmek istediğine emin misin?" : "Are you sure you want to delete this chat?")) return;
        try {
            await deleteDoc(doc(db, "chats", chatId));
        } catch (error) { console.error("Sohbet silme hatası", error); }
    };

    const handleSearch = async () => {
        if (!searchInput.trim()) return;
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

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !activeChatUser) return;
        const text = messageInput.trim();
        setMessageInput("");
        await sendDirectMessage(currentUser.username, activeChatUser, text);
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
                            <button onClick={() => setActiveTab("requests")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "requests" ? activeColor : textLight, borderBottom: activeTab === "requests" ? `3px solid ${activeColor}` : '3px solid transparent' }}>{lang === "TR" ? "İstekler" : "Requests"}</button>
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
                                        return (
                                            <div key={chat.id} onClick={() => setActiveChatUser(otherUser)} style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '15px', background: inputBg, borderRadius: '12px', cursor: 'pointer', position: 'relative', borderLeft: unread ? `4px solid ${activeColor}` : '4px solid transparent' }}>
                                                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '20px' }}>{otherUser.charAt(0).toUpperCase()}</div>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <h4 style={{ margin: '0 0 5px 0', color: textMain, fontSize: '15px' }}>{otherUser}</h4>
                                                    <p style={{ margin: 0, color: textLight, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.lastMessage}</p>
                                                </div>
                                                {/* SOHBET SİLME BUTONU */}
                                                <button onClick={(e) => handleDeleteChat(e, chat.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '18px', padding: '5px' }}>🗑️</button>
                                            </div>
                                        );
                                    }) : <p style={{ textAlign: 'center', color: textLight, marginTop: '40px' }}>{lang === "TR" ? "Sohbet kutun boş." : "Inbox is empty."}</p>}
                                </div>
                            )}

                            {/* TAB: ARKADAŞLAR (AVATARLAR EKLENDİ) */}
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
                                        <div key={reqUser.username} style={{ position: 'relative', overflow: 'hidden', borderRadius: '15px', background: inputBg, border: `1px solid ${borderColor}`, padding: '15px' }}>
                                            {reqUser.banner && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${reqUser.banner})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3, zIndex: 0 }}></div>}
                                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeColor, border: `2px solid ${activeColor}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                                                        {reqUser.avatar !== "default" ? <img src={reqUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : reqUser.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ color: textMain, fontWeight: 'bold' }}>@{reqUser.username}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => handleAcceptRequest(reqUser.username)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                                                    <button onClick={() => handleRemoveFriend(reqUser.username)} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
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
                                        <input type="text" placeholder={lang === "TR" ? "Kullanıcı Ara..." : "Search..."} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '10px', color: textMain, outline: 'none' }} />
                                        <button onClick={handleSearch} style={{ background: activeColor, color: '#000', border: 'none', padding: '0 15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Bul</button>
                                    </div>
                                    {searchResult && (
                                        <div style={{ background: inputBg, padding: '20px', borderRadius: '15px', textAlign: 'center', border: `1px solid ${activeColor}` }}>
                                            <h3 style={{ margin: '0 0 15px 0', color: textMain }}>@{searchResult.username}</h3>
                                            <button onClick={() => handleSendRequest(searchResult.username)} style={{ background: activeColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{lang === "TR" ? "Arkadaş Ekle" : "Add Friend"}</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* MESAJLAŞMA EKRANI */
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {messages.map(msg => {
                                const isMe = msg.sender === currentUser.username;
                                return (
                                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ background: isMe ? activeColor : inputBg, color: isMe ? '#000' : textMain, padding: '10px 15px', borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0', fontSize: '14px' }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div style={{ padding: '15px', borderTop: `1px solid ${borderColor}`, display: 'flex', gap: '10px', background: bgCard }}>
                            <input type="text" placeholder={lang === "TR" ? "Mesaj..." : "Message..."} value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '20px', color: textMain, outline: 'none' }} />
                            <button onClick={handleSendMessage} disabled={!messageInput.trim()} style={{ background: activeColor, color: '#000', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}>➤</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}