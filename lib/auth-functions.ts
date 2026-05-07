import { auth, db } from './firebase'; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// 1. GERÇEK FİREBASE KAYIT (Kullanıcı Adı Benzersizlik Kontrollü)
export const registerUser = async (email: string, password: string, username: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error("USERNAME_TAKEN");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: username
    });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username,
      avatar: "default",
      favorites: [],
      createdAt: new Date().toISOString()
    });

    return user;
  } catch (error: any) {
    console.error("Kayıt Hatası Detayı:", error); 
    throw error; 
  }
};

// 2. GERÇEK FİREBASE GİRİŞ
export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// 3. FİREBASE ÇIKIŞ
export const logoutUser = async () => {
  await signOut(auth);
};

// 4. FAVORİLERİ BULUTA YEDEKLE
export const syncFavoritesToFirebase = async (uid: string, favorites: any[]) => {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { favorites: favorites }, { merge: true });
  } catch (error) {
    console.error("Favoriler eşitlenemedi:", error);
  }
};

// 5. FAVORİLERİ BULUTTAN ÇEK
export const getFavoritesFromFirebase = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists() && docSnap.data().favorites) {
      return docSnap.data().favorites;
    }
    return [];
  } catch (error) {
    console.error("Favoriler çekilemedi:", error);
    return [];
  }
};