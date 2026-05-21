import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { firestore } from './firebase';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id?: string;
  propertyId: string;
  clientId: string;
  hostId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: BookingStatus;
  createdAt?: any;
}

const bookingsCollection = collection(firestore, 'bookings');
const BOOKINGS_CACHE_TTL_MS = 10000;
const hostBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();
const clientBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();
const propertyBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();

function resetBookingsCache() {
  hostBookingsCache.clear();
  clientBookingsCache.clear();
  propertyBookingsCache.clear();
}

export async function createBooking(booking: Omit<Booking, 'id' | 'createdAt'>) {
  const docRef = await addDoc(bookingsCollection, {
    ...booking,
    status: booking.status || 'pending',
    createdAt: serverTimestamp(),
  });
  resetBookingsCache();
  return docRef.id;
}

export async function getHostBookings(hostId: string): Promise<Booking[]> {
  const cached = hostBookingsCache.get(hostId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const q = query(bookingsCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Booking) }));
  hostBookingsCache.set(hostId, { data, expiresAt: Date.now() + BOOKINGS_CACHE_TTL_MS });
  return data;
}

export async function getClientBookings(clientId: string): Promise<Booking[]> {
  const cached = clientBookingsCache.get(clientId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const q = query(bookingsCollection, where('clientId', '==', clientId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Booking) }));
  clientBookingsCache.set(clientId, { data, expiresAt: Date.now() + BOOKINGS_CACHE_TTL_MS });
  return data;
}

export async function getPropertyBookings(propertyId: string): Promise<Booking[]> {
  const cached = propertyBookingsCache.get(propertyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const q = query(bookingsCollection, where('propertyId', '==', propertyId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Booking) }));
  propertyBookingsCache.set(propertyId, { data, expiresAt: Date.now() + BOOKINGS_CACHE_TTL_MS });
  return data;
}
