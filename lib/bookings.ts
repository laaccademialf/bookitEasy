import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { firestore } from './firebase';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Booking {
  id?: string;
  propertyId: string;
  clientId: string;
  hostId: string;
  guestName?: string;
  guestPhone?: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: BookingStatus;
  earlyCheckIn?: boolean;
  lateCheckOut?: boolean;
  selectedServices?: string[];
  createdAt?: any;
}

export function getCheckInTime(booking?: Booking): string {
  return booking?.earlyCheckIn ? '09:00' : '12:00';
}

export function getCheckOutTime(booking?: Booking): string {
  return booking?.lateCheckOut ? '15:00' : '12:00';
}

const bookingsCollection = collection(firestore, 'bookings');
const propertiesCollection = collection(firestore, 'properties');
const BOOKINGS_CACHE_TTL_MS = 10000;
const hostBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();
const clientBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();
const propertyBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();

function expandDateRange(startDate: string, endDate: string): string[] {
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const current = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  const dates: string[] = [];

  while (current <= end) {
    const year = current.getFullYear();
    const month = `${current.getMonth() + 1}`.padStart(2, '0');
    const day = `${current.getDate()}`.padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

async function syncPropertyReservedDates(propertyId: string) {
  const bookingsSnapshot = await getDocs(query(bookingsCollection, where('propertyId', '==', propertyId)));
  const activeDates = new Set<string>();

  bookingsSnapshot.docs.forEach((docSnap) => {
    const booking = docSnap.data() as Booking;
    if (booking.status === 'cancelled') {
      return;
    }

    expandDateRange(booking.startDate, booking.endDate).forEach((date) => {
      activeDates.add(date);
    });
  });

  await updateDoc(doc(firestore, 'properties', propertyId), {
    reservedDates: Array.from(activeDates).sort(),
    updatedAt: serverTimestamp(),
  });
}

export async function syncReservedDatesForHost(hostId: string) {
  const propertiesSnapshot = await getDocs(query(propertiesCollection, where('hostId', '==', hostId)));
  await Promise.all(
    propertiesSnapshot.docs.map((propertyDoc) => syncPropertyReservedDates(propertyDoc.id)),
  );
}

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
  await syncPropertyReservedDates(booking.propertyId);
  resetBookingsCache();
  return docRef.id;
}

export async function getHostBookings(hostId: string, forceRefresh = false): Promise<Booking[]> {
  const cached = hostBookingsCache.get(hostId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
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

export async function updateBookingStatus(bookingId: string, status: BookingStatus): Promise<void> {
  const bookingSnapshot = await getDoc(doc(bookingsCollection, bookingId));
  await updateDoc(doc(bookingsCollection, bookingId), { status });
  const booking = bookingSnapshot.data() as Booking | undefined;
  if (booking?.propertyId) {
    await syncPropertyReservedDates(booking.propertyId);
  }
  resetBookingsCache();
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
