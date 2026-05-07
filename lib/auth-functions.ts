import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// 1. GERÇEK FİREBASE KAYIT
export const registerUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
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