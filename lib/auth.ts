import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, firestore } from './firebase';

export type UserRole = 'client' | 'host' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  hostUsername?: string;
  createdAt: any;
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  wantHost: boolean,
  hostUsername: string,
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  const role: UserRole = email === 'andrii.disha@gmail.com' ? 'admin' : wantHost ? 'host' : 'client';

  const userDoc = {
    uid,
    email,
    name,
    role,
    hostUsername: wantHost ? hostUsername : '',
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(firestore, 'users', uid), userDoc);
  return credential.user;
}

export async function signInUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(firestore, 'users', uid));
  if (!userDoc.exists()) {
    return null;
  }

  return userDoc.data() as UserProfile;
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const usersQuery = query(collection(firestore, 'users'));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((doc) => doc.data() as UserProfile);
}

export async function getHostProfileByUsername(username: string): Promise<UserProfile | null> {
  const usersQuery = query(
    collection(firestore, 'users'),
    where('hostUsername', '==', username),
    where('role', 'in', ['host', 'admin']),
  );
  const snapshot = await getDocs(usersQuery);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserProfile;
}

export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(firestore, 'users', uid), { role });
}
