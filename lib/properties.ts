import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './firebase';

export interface Property {
  id?: string;
  hostId: string;
  title: string;
  description: string;
  pricePerNight: number;
  address: string;
  images: string[];
  rooms: number;
  guests: number;
  amenities: string[];
  blockedDates?: string[];
  reservedDates?: string[];
  createdAt?: any;
  updatedAt?: any;
}

const propertiesCollection = collection(firestore, 'properties');
const PUBLIC_PROPERTIES_CACHE_TTL_MS = 15000;
const HOST_PROPERTIES_CACHE_TTL_MS = 10000;
let publicPropertiesCache: { data: Property[]; expiresAt: number } | null = null;
const hostPropertiesCache = new Map<string, { data: Property[]; expiresAt: number }>();

function resetPublicPropertiesCache() {
  publicPropertiesCache = null;
}

function resetHostPropertiesCache(hostId?: string) {
  if (hostId) {
    hostPropertiesCache.delete(hostId);
    return;
  }

  hostPropertiesCache.clear();
}

export async function createProperty(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(propertiesCollection, {
    ...property,
    images: property.images || [],
    amenities: property.amenities || [],
    blockedDates: property.blockedDates || [],
    reservedDates: property.reservedDates || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  resetPublicPropertiesCache();
  resetHostPropertiesCache(property.hostId);
  return docRef.id;
}

export async function getHostProperties(hostId: string, forceRefresh = false): Promise<Property[]> {
  const cached = hostPropertiesCache.get(hostId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const q = query(propertiesCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Property) }));
  hostPropertiesCache.set(hostId, { data, expiresAt: Date.now() + HOST_PROPERTIES_CACHE_TTL_MS });
  return data;
}

export async function getPublicProperties(): Promise<Property[]> {
  if (publicPropertiesCache && publicPropertiesCache.expiresAt > Date.now()) {
    return publicPropertiesCache.data;
  }

  const snapshot = await getDocs(propertiesCollection);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Property) }));
  publicPropertiesCache = { data, expiresAt: Date.now() + PUBLIC_PROPERTIES_CACHE_TTL_MS };
  return data;
}

export async function getPropertyById(propertyId: string): Promise<Property | null> {
  const docSnap = await getDoc(doc(propertiesCollection, propertyId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...(docSnap.data() as Property) };
}

export async function updateProperty(propertyId: string, data: Partial<Property>) {
  await updateDoc(doc(propertiesCollection, propertyId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  resetPublicPropertiesCache();
  resetHostPropertiesCache(data.hostId);
}

export async function deleteProperty(propertyId: string) {
  const existing = await getPropertyById(propertyId);
  await deleteDoc(doc(propertiesCollection, propertyId));
  resetPublicPropertiesCache();
  resetHostPropertiesCache(existing?.hostId);
}

export async function addBlockedDate(propertyId: string, date: string) {
  const existing = await getPropertyById(propertyId);
  await updateDoc(doc(propertiesCollection, propertyId), {
    blockedDates: arrayUnion(date),
    updatedAt: serverTimestamp(),
  });
  resetPublicPropertiesCache();
  resetHostPropertiesCache(existing?.hostId);
}

export async function removeBlockedDate(propertyId: string, date: string) {
  const existing = await getPropertyById(propertyId);
  if (!existing) {
    throw new Error('Property not found');
  }

  const normalizeDate = (value: string) => String(value || '').trim();
  const targetDate = normalizeDate(date);
  const nextBlockedDates = (existing.blockedDates || []).filter(
    (blockedDate) => normalizeDate(blockedDate) !== targetDate,
  );

  await updateDoc(doc(propertiesCollection, propertyId), {
    blockedDates: nextBlockedDates,
    updatedAt: serverTimestamp(),
  });
  resetPublicPropertiesCache();
  resetHostPropertiesCache(existing?.hostId);
}
