import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, firestore } from './firebase';

export type UserRole = 'client' | 'host' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  hostUsername?: string;
  subscriptionPlan?: 'starter' | 'pro' | 'enterprise';
  subscriptionStatus?: 'active' | 'paused' | 'canceled';
  subscriptionRenewAt?: string;
  createdAt: any;
}

function nextMonthDateString() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

const HOST_PUBLIC_KEY_PATTERN = /^h-[a-z0-9]{12}$/;

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

export function generateHostPublicKey(length = 12) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const chars: string[] = [];

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const random = new Uint8Array(length);
    globalThis.crypto.getRandomValues(random);
    for (let i = 0; i < length; i += 1) {
      chars.push(alphabet[random[i] % alphabet.length]);
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      chars.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }
  }

  return `h-${chars.join('')}`;
}

export function isSecureHostPublicKey(value?: string | null) {
  return Boolean(value && HOST_PUBLIC_KEY_PATTERN.test(value));
}

export function ensureSecureHostPublicKey(value?: string | null) {
  if (isSecureHostPublicKey(value)) {
    return value as string;
  }

  return generateHostPublicKey();
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  wantHost: boolean,
  hostUsername: string,
) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const uid = credential.user.uid;
  const role: UserRole = email === 'andrii.disha@gmail.com' ? 'admin' : wantHost ? 'host' : 'client';
  const safeHostUsername = wantHost ? ensureSecureHostPublicKey(hostUsername) : '';

  const userDoc = {
    uid,
    email: email.trim().toLowerCase(),
    name,
    role,
    hostUsername: safeHostUsername,
    ...(role === 'host'
      ? {
          subscriptionPlan: 'starter' as const,
          subscriptionStatus: 'active' as const,
          subscriptionRenewAt: nextMonthDateString(),
        }
      : {}),
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

export async function sendUserPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim().toLowerCase());
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
  subscriptionPlan?: 'starter' | 'pro' | 'enterprise';
  subscriptionStatus?: 'active' | 'paused' | 'canceled';
  subscriptionRenewAt?: string;
}

export async function updateUserProfileData(uid: string, payload: UpdateUserProfilePayload) {
  const nextData: Record<string, any> = {
    email: payload.email,
    name: payload.name,
    role: payload.role,
    hostUsername: payload.role === 'host' ? ensureSecureHostPublicKey(payload.hostUsername) : '',
  };

  if (payload.role === 'host') {
    nextData.subscriptionPlan = payload.subscriptionPlan || 'starter';
    nextData.subscriptionStatus = payload.subscriptionStatus || 'active';
    nextData.subscriptionRenewAt = payload.subscriptionRenewAt || nextMonthDateString();
  } else {
    nextData.subscriptionPlan = '';
    nextData.subscriptionStatus = '';
    nextData.subscriptionRenewAt = '';
  }

  await updateDoc(doc(firestore, 'users', uid), nextData);
  resetUsersCache();
}

export async function createUserDoc(uid: string, email: string, name: string, role: UserRole, hostUsername = '') {
  const userDoc = {
    uid,
    email,
    name,
    role,
    hostUsername: role === 'host' ? ensureSecureHostPublicKey(hostUsername) : '',
    ...(role === 'host'
      ? {
          subscriptionPlan: 'starter' as const,
          subscriptionStatus: 'active' as const,
          subscriptionRenewAt: nextMonthDateString(),
        }
      : {}),
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
      hostUsername: payload.role === 'host' ? ensureSecureHostPublicKey(payload.hostUsername) : '',
    };
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}

export interface UpdateCurrentUserAccountPayload {
  name: string;
  email: string;
  newPassword?: string;
}

export async function updateCurrentUserAccount(payload: UpdateCurrentUserAccountPayload) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Користувач не авторизований');
  }

  const normalizedEmail = payload.email.trim().toLowerCase();

  if (normalizedEmail && normalizedEmail !== (currentUser.email || '').toLowerCase()) {
    await updateEmail(currentUser, normalizedEmail);
  }

  if (payload.newPassword && payload.newPassword.trim().length > 0) {
    await updatePassword(currentUser, payload.newPassword.trim());
  }

  await updateDoc(doc(firestore, 'users', currentUser.uid), {
    name: payload.name,
    email: normalizedEmail,
  });

  resetUsersCache();
}

export interface SubscriptionPayload {
  subscriptionPlan: 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'paused' | 'canceled';
  subscriptionRenewAt: string;
}

export async function updateCurrentUserSubscription(payload: SubscriptionPayload) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Користувач не авторизований');
  }

  await updateDoc(doc(firestore, 'users', currentUser.uid), {
    subscriptionPlan: payload.subscriptionPlan,
    subscriptionStatus: payload.subscriptionStatus,
    subscriptionRenewAt: payload.subscriptionRenewAt,
  });

  resetUsersCache();
}
