"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { searchUserByUsername, sendFriendRequest, acceptFriendRequest, removeFriendOrRequest, sendDirectMessage, markChatAsRead } from '../lib/social-functions';

export default function SocialPanel({ currentUser, onClose, theme, isDarkMode, activeColor }: any) {
    const [activeTab, setActiveTab] = useState<"chats" | "friends" | "requests" | "search">("chats");
    
    const [friends, setFriends] = useState<string[]>([]);
    const [requests, setRequests] = useState<string[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    
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

    // 1. Kullanıcının Arkadaş ve İsteklerini Dinle
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

    // 2. Kullanıcının Dahil Olduğu Sohbetleri Dinle
    useEffect(() => {
        if (!currentUser?.username) return;
        const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.username));
        const unsubChats = onSnapshot(q, (snapshot) => {
            const loadedChats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Son mesaja göre sırala
            loadedChats.sort((a: any, b: any) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
            setChats(loadedChats);
        });
        return () => unsubChats();
    }, [currentUser]);

    // 3. Aktif Sohbet Odasını Dinle
    useEffect(() => {
        if (!activeChatUser || !currentUser?.username) return;
        const chatId = [currentUser.username, activeChatUser].sort().join("_");
        
        const q = query(collection(db, `chats/${chatId}/messages`), orderBy("createdAt", "asc"));
        const unsubMessages = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            markChatAsRead(chatId, currentUser.username); // Odaya girince okundu yap
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return () => unsubMessages();
    }, [activeChatUser, currentUser]);

    // Fonksiyonlar
    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        if (searchInput.trim().toLowerCase() === currentUser.username.toLowerCase()) {
            setSearchStatus("Kendinizi ekleyemezsiniz :)");
            return;
        }
        setSearchStatus("Aranıyor...");
        const res = await searchUserByUsername(searchInput.trim());
        if (res) {
            setSearchResult(res);
            setSearchStatus("");
        } else {
            setSearchResult(null);
            setSearchStatus("Kullanıcı bulunamadı.");
        }
    };

    const handleSendRequest = async (targetUsername: string) => {
        try {
            await sendFriendRequest(currentUser.username, targetUsername);
            alert("İstek gönderildi!");
            setSearchResult(null);
            setSearchInput("");
        } catch (error) { alert("Bir hata oluştu."); }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !activeChatUser) return;
        const text = messageInput.trim();
        setMessageInput("");
        try {
            await sendDirectMessage(currentUser.username, activeChatUser, text);
        } catch (error) { alert("Mesaj gönderilemedi."); }
    };

    // ARAYÜZ (UI) BİLEŞENLERİ
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onClick={onClose}>
            <div style={{ width: '100%', maxWidth: '400px', height: '100%', background: bgCard, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
                
                <style dangerouslySetInnerHTML={{ __html: `@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }` }} />

                {/* ÜST BAŞLIK */}
                <div style={{ padding: '20px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: activeColor, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {activeChatUser ? (
                            <>
                                <button onClick={() => setActiveChatUser(null)} style={{ background: 'none', border: 'none', color: activeColor, cursor: 'pointer', fontSize: '20px', padding: 0 }}>❮</button>
                                <span>@{activeChatUser}</span>
                            </>
                        ) : "SİNE-SOSYAL"}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: textLight, fontSize: '24px', cursor: 'pointer' }}>✕</button>
                </div>

                {/* ANA İÇERİK */}
                {!activeChatUser ? (
                    <>
                        {/* TABLAR */}
                        <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}` }}>
                            <button onClick={() => setActiveTab("chats")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "chats" ? activeColor : textLight, borderBottom: activeTab === "chats" ? `3px solid ${activeColor}` : '3px solid transparent' }}>Sohbetler</button>
                            <button onClick={() => setActiveTab("friends")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "friends" ? activeColor : textLight, borderBottom: activeTab === "friends" ? `3px solid ${activeColor}` : '3px solid transparent' }}>Arkadaşlar ({friends.length})</button>
                            <button onClick={() => setActiveTab("requests")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "requests" ? activeColor : textLight, borderBottom: activeTab === "requests" ? `3px solid ${activeColor}` : '3px solid transparent', position: 'relative' }}>
                                İstekler
                                {requests.length > 0 && <span style={{ position: 'absolute', top: '10px', right: '10px', width: '10px', height: '10px', background: '#ff4d4d', borderRadius: '50%' }}></span>}
                            </button>
                            <button onClick={() => setActiveTab("search")} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: activeTab === "search" ? activeColor : textLight, borderBottom: activeTab === "search" ? `3px solid ${activeColor}` : '3px solid transparent' }}>🔍 Bul</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {/* TAB: SOHBETLER */}
                            {activeTab === "chats" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {chats.length > 0 ? chats.map(chat => {
                                        const otherUser = chat.participants.find((p: string) => p !== currentUser.username);
                                        const unread = !chat.isRead && chat.lastSender !== currentUser.username;
                                        return (
                                            <div key={chat.id} onClick={() => setActiveChatUser(otherUser)} style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '15px', background: inputBg, borderRadius: '12px', cursor: 'pointer', borderLeft: unread ? `4px solid ${activeColor}` : '4px solid transparent' }}>
                                                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: activeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '20px' }}>{otherUser.charAt(0).toUpperCase()}</div>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <h4 style={{ margin: '0 0 5px 0', color: textMain, fontSize: '15px' }}>{otherUser}</h4>
                                                    <p style={{ margin: 0, color: unread ? activeColor : textLight, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unread ? 'bold' : 'normal' }}>
                                                        {chat.lastSender === currentUser.username ? "Sen: " : ""}{chat.lastMessage}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }) : <p style={{ textAlign: 'center', color: textLight, marginTop: '40px' }}>Henüz aktif bir sohbetiniz yok.</p>}
                                </div>
                            )}

                            {/* TAB: ARKADAŞLAR */}
                            {activeTab === "friends" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {friends.length > 0 ? friends.map(f => (
                                        <div key={f} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: inputBg, borderRadius: '12px' }}>
                                            <span style={{ color: textMain, fontWeight: 'bold' }}>@{f}</span>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => setActiveChatUser(f)} style={{ background: activeColor, color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Mesaj</button>
                                                <button onClick={() => removeFriendOrRequest(currentUser.uid, currentUser.username, f)} style={{ background: 'transparent', border: `1px solid #ff4d4d`, color: '#ff4d4d', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Sil</button>
                                            </div>
                                        </div>
                                    )) : <p style={{ textAlign: 'center', color: textLight, marginTop: '40px' }}>Henüz hiç arkadaşınız yok.</p>}
                                </div>
                            )}

                            {/* TAB: İSTEKLER */}
                            {activeTab === "requests" && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {requests.length > 0 ? requests.map(req => (
                                        <div key={req} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: inputBg, borderRadius: '12px' }}>
                                            <span style={{ color: textMain, fontWeight: 'bold' }}>@{req}</span>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={() => acceptFriendRequest(currentUser.uid, currentUser.username, req)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Kabul Et</button>
                                                <button onClick={() => removeFriendOrRequest(currentUser.uid, currentUser.username, req)} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Reddet</button>
                                            </div>
                                        </div>
                                    )) : <p style={{ textAlign: 'center', color: textLight, marginTop: '40px' }}>Bekleyen arkadaşlık isteği yok.</p>}
                                </div>
                            )}

                            {/* TAB: KULLANICI ARA */}
                            {activeTab === "search" && (
                                <div>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <input type="text" placeholder="Kullanıcı adı yaz..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '10px 15px', borderRadius: '8px', color: textMain, outline: 'none' }} />
                                        <button onClick={handleSearch} style={{ background: activeColor, color: '#000', border: 'none', padding: '0 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Bul</button>
                                    </div>
                                    
                                    {searchStatus && <p style={{ color: textLight, fontSize: '13px', textAlign: 'center' }}>{searchStatus}</p>}

                                    {searchResult && (
                                        <div style={{ background: inputBg, padding: '20px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${activeColor}` }}>
                                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: activeColor, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '24px', fontWeight: 'bold' }}>
                                                {searchResult.username.charAt(0).toUpperCase()}
                                            </div>
                                            <h3 style={{ margin: '0 0 15px 0', color: textMain }}>@{searchResult.username}</h3>
                                            
                                            {friends.includes(searchResult.username) ? (
                                                <button disabled style={{ background: 'transparent', color: textLight, border: `1px solid ${textLight}`, padding: '8px 20px', borderRadius: '8px', cursor: 'not-allowed' }}>Zaten Arkadaşsınız</button>
                                            ) : requests.includes(searchResult.username) ? (
                                                <button onClick={() => acceptFriendRequest(currentUser.uid, currentUser.username, searchResult.username)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>İsteği Kabul Et</button>
                                            ) : (
                                                <button onClick={() => handleSendRequest(searchResult.username)} style={{ background: activeColor, color: '#000', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Arkadaş Ekle</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* SOHBET EKRANI (Açık DM) */
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {messages.map(msg => {
                                const isMe = msg.sender === currentUser.username;
                                return (
                                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', background: isMe ? activeColor : inputBg, color: isMe ? '#000' : textMain, padding: '10px 15px', borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0', fontSize: '14px', lineHeight: '1.4' }}>
                                        {msg.text}
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div style={{ padding: '15px', borderTop: `1px solid ${borderColor}`, display: 'flex', gap: '10px', background: bgCard }}>
                            <input type="text" placeholder="Mesaj yaz..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, background: inputBg, border: `1px solid ${borderColor}`, padding: '12px 15px', borderRadius: '20px', color: textMain, outline: 'none' }} />
                            <button onClick={handleSendMessage} disabled={!messageInput.trim()} style={{ background: activeColor, color: '#000', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: messageInput.trim() ? 'pointer' : 'not-allowed', opacity: messageInput.trim() ? 1 : 0.5 }}>➤</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}