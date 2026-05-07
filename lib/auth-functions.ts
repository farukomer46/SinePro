import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  User
} from "firebase/auth";
import { auth } from "./firebase";

// YENİ KAYIT OLMA FONKSİYONU
// email: string ve password: string diyerek TypeScript'i sakinleştiriyoruz
export const registerUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// GİRİŞ YAPMA FONKSİYONU
export const loginUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw error;
  }
};

// ÇIKIŞ YAPMA FONKSİYONU
export const logoutUser = () => signOut(auth);
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";

// Kullanıcının favorilerini Firestore'a kaydetme/güncelleme
export const syncFavoritesToFirebase = async (userId: string, favorites: any[]) => {
  try {
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, { favorites }, { merge: true });
  } catch (error) {
    console.error("Favoriler senkronize edilemedi:", error);
  }
};

// Kullanıcının favorilerini Firestore'dan çekme
export const getFavoritesFromFirebase = async (userId: string) => {
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data().favorites || [];
    }
    return [];
  } catch (error) {
    console.error("Favoriler çekilemedi:", error);
    return [];
  }
};