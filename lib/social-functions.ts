import { db } from './firebase';
import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, arrayRemove, query, where, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';

// 1. Kullanıcıyı Username (Kullanıcı Adı) ile Bulma Motoru
export const searchUserByUsername = async (username: string) => {
    const q = query(collection(db, "users"), where("username", "==", username));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

// 2. Arkadaşlık İsteği Gönderme Motoru
export const sendFriendRequest = async (currentUsername: string, targetUsername: string) => {
    const targetUser = await searchUserByUsername(targetUsername);
    if (!targetUser) throw new Error("Kullanıcı bulunamadı");
    
    // Karşı tarafın "friendRequests" listesine bizim adımızı ekler
    await setDoc(doc(db, "users", targetUser.id), {
        friendRequests: arrayUnion(currentUsername)
    }, { merge: true });
}

// 3. Arkadaşlık İsteğini Kabul Etme Motoru
export const acceptFriendRequest = async (currentUserUid: string, currentUsername: string, targetUsername: string) => {
    const targetUser = await searchUserByUsername(targetUsername);
    if (!targetUser) throw new Error("Kullanıcı bulunamadı");

    // 1. Kendi listemize arkadaşı ekle, gelen isteklerden sil
    await setDoc(doc(db, "users", currentUserUid), {
        friends: arrayUnion(targetUsername),
        friendRequests: arrayRemove(targetUsername)
    }, { merge: true });

    // 2. Karşı tarafın arkadaş listesine bizi ekle
    await setDoc(doc(db, "users", targetUser.id), {
        friends: arrayUnion(currentUsername)
    }, { merge: true });
}

// 4. İsteği Reddetme veya Arkadaş Silme Motoru
export const removeFriendOrRequest = async (currentUserUid: string, currentUsername: string, targetUsername: string) => {
    const targetUser = await searchUserByUsername(targetUsername);
    
    // Kendimizden sil
    await updateDoc(doc(db, "users", currentUserUid), {
        friends: arrayRemove(targetUsername),
        friendRequests: arrayRemove(targetUsername)
    });

    // Karşı taraftan sil (Eğer hesabı hala duruyorsa)
    if (targetUser) {
        await updateDoc(doc(db, "users", targetUser.id), {
            friends: arrayRemove(currentUsername)
        });
    }
}

// 5. Özel Mesaj (DM) Gönderme Motoru
export const sendDirectMessage = async (currentUsername: string, targetUsername: string, text: string) => {
    // İki kullanıcının adını alfabetik sıraya dizip benzersiz bir Sohbet Odası ID'si oluşturur (Örn: ali_veli)
    const chatId = [currentUsername, targetUsername].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    
    // Ana sohbet odasını güncelle (Son mesaj ve okunma durumu için)
    await setDoc(chatRef, {
        participants: [currentUsername, targetUsername],
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastSender: currentUsername,
        isRead: false
    }, { merge: true });

    // Mesajı odanın içindeki "messages" alt koleksiyonuna yaz
    await addDoc(collection(chatRef, "messages"), {
        sender: currentUsername,
        text: text,
        createdAt: serverTimestamp()
    });
}

// 6. Mesajları Okundu Olarak İşaretleme Motoru
export const markChatAsRead = async (chatId: string, currentUsername: string) => {
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
        const data = chatSnap.data();
        // Eğer son mesajı atan biz değilsek (karşı tarafsa), okundu olarak işaretle
        if (data.lastSender !== currentUsername) {
            await updateDoc(chatRef, { isRead: true });
        }
    }
}