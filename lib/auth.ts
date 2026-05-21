import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
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

const USERS_CACHE_TTL_MS = 15000;
let usersCache: { data: UserProfile[]; expiresAt: number } | null = null;

function resetUsersCache() {
  usersCache = null;
}

function getFirebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
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
  resetUsersCache();
  return credential.user;
}

export async function signInUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
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
  if (usersCache && usersCache.expiresAt > Date.now()) {
    return usersCache.data;
  }

  const usersQuery = query(collection(firestore, 'users'));
  const snapshot = await getDocs(usersQuery);
  const data = snapshot.docs.map((doc) => doc.data() as UserProfile);
  usersCache = { data, expiresAt: Date.now() + USERS_CACHE_TTL_MS };
  return data;
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
  resetUsersCache();
}

export interface UpdateUserProfilePayload {
  email: string;
  name: string;
  role: UserRole;
  hostUsername?: string;
}

export async function updateUserProfileData(uid: string, payload: UpdateUserProfilePayload) {
  await updateDoc(doc(firestore, 'users', uid), {
    email: payload.email,
    name: payload.name,
    role: payload.role,
    hostUsername: payload.hostUsername ?? '',
  });
  resetUsersCache();
}

export async function createUserDoc(uid: string, email: string, name: string, role: UserRole, hostUsername = '') {
  const userDoc = {
    uid,
    email,
    name,
    role,
    hostUsername,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(firestore, 'users', uid), userDoc);
  resetUsersCache();
}

export interface CreateUserByAdminPayload {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  hostUsername?: string;
}

export async function createUserByAdmin(payload: CreateUserByAdminPayload) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const appName = `bookiteasy-admin-create-${Date.now()}`;
  const secondaryApp = initializeApp(getFirebaseClientConfig(), appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, payload.password);
    const uid = credential.user.uid;

    try {
      await createUserDoc(uid, normalizedEmail, payload.name, payload.role, payload.hostUsername ?? '');
    } catch (error) {
      // Prevent partially-created accounts when Firestore write fails.
      await credential.user.delete().catch(() => undefined);
      throw error;
    }

    return {
      uid,
      email: normalizedEmail,
      name: payload.name,
      role: payload.role,
      hostUsername: payload.hostUsername ?? '',
    };
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}
