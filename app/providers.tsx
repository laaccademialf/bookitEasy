'use client';

import { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getUserProfile } from '../lib/auth';

const ADMIN_EMAILS = new Set(
  [
    'andrii.disha@gmail.com',
    ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean),
  ].map((email) => email.toLowerCase())
);

interface UserProfile {
  uid: string;
  email: string;
  role: 'client' | 'host' | 'admin';
  name: string;
  hostUsername?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  impersonatedRole?: UserProfile['role'] | null;
  setImpersonatedRole?: (role: UserProfile['role'] | null) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  impersonatedRole: null,
  setImpersonatedRole: () => {},
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedRole, setImpersonatedRole] = useState<UserProfile['role'] | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      const currentEmail = (currentUser.email || '').toLowerCase();
      const isAdminByEmail = ADMIN_EMAILS.has(currentEmail);

      if (isAdminByEmail) {
        setProfile({
          uid: currentUser.uid,
          email: currentUser.email || '',
          name: currentUser.displayName || 'Адміністратор',
          role: 'admin',
          hostUsername: '',
        });
        setLoading(false);
        return;
      }

      try {
        const loadedProfile = await getUserProfile(currentUser.uid);
        setProfile(loadedProfile);
      } catch (error) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, impersonatedRole, setImpersonatedRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}
