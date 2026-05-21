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
  createdAt?: any;
  updatedAt?: any;
}

const propertiesCollection = collection(firestore, 'properties');
const PUBLIC_PROPERTIES_CACHE_TTL_MS = 15000;
let publicPropertiesCache: { data: Property[]; expiresAt: number } | null = null;

function resetPublicPropertiesCache() {
  publicPropertiesCache = null;
}

export async function createProperty(property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = await addDoc(propertiesCollection, {
    ...property,
    images: property.images || [],
    amenities: property.amenities || [],
    blockedDates: property.blockedDates || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  resetPublicPropertiesCache();
  return docRef.id;
}

export async function getHostProperties(hostId: string): Promise<Property[]> {
  const q = query(propertiesCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Property) }));
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
}

export async function deleteProperty(propertyId: string) {
  await deleteDoc(doc(propertiesCollection, propertyId));
  resetPublicPropertiesCache();
}

export async function addBlockedDate(propertyId: string, date: string) {
  await updateDoc(doc(propertiesCollection, propertyId), {
    blockedDates: arrayUnion(date),
    updatedAt: serverTimestamp(),
  });
  resetPublicPropertiesCache();
}
