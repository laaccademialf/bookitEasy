import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
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

export interface BookingAvailability {
  id?: string;
  propertyId: string;
  hostId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  createdAt?: any;
  updatedAt?: any;
}

export function getCheckInTime(booking?: Booking): string {
  return booking?.earlyCheckIn ? '09:00' : '12:00';
}

export function getCheckOutTime(booking?: Booking): string {
  return booking?.lateCheckOut ? '15:00' : '12:00';
}

const bookingsCollection = collection(firestore, 'bookings');
const bookingAvailabilityCollection = collection(firestore, 'bookingAvailability');
const propertiesCollection = collection(firestore, 'properties');
const BOOKINGS_CACHE_TTL_MS = 10000;
const hostBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();
const clientBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();
const propertyBookingsCache = new Map<string, { data: Booking[]; expiresAt: number }>();
const propertyAvailabilityCache = new Map<string, { data: BookingAvailability[]; expiresAt: number }>();

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

async function upsertBookingAvailability(
  bookingId: string,
  booking: Omit<BookingAvailability, 'id' | 'createdAt' | 'updatedAt'>,
  includeCreatedAt = false,
) {
  await setDoc(
    doc(bookingAvailabilityCollection, bookingId),
    {
      ...booking,
      ...(includeCreatedAt ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function syncReservedDatesForHost(hostId: string) {
  const [propertiesSnapshot, bookingsSnapshot] = await Promise.all([
    getDocs(query(propertiesCollection, where('hostId', '==', hostId))),
    getDocs(query(bookingsCollection, where('hostId', '==', hostId))),
  ]);

  const activeDatesByProperty = new Map<string, Set<string>>();

  await Promise.all(
    bookingsSnapshot.docs.map(async (bookingDoc) => {
      const booking = bookingDoc.data() as Booking;

      await upsertBookingAvailability(
        bookingDoc.id,
        {
          propertyId: booking.propertyId,
          hostId: booking.hostId,
          clientId: booking.clientId,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
        },
        true,
      );

      if (booking.status === 'cancelled') {
        return;
      }

      const propertyDates = activeDatesByProperty.get(booking.propertyId) || new Set<string>();
      expandDateRange(booking.startDate, booking.endDate).forEach((date) => propertyDates.add(date));
      activeDatesByProperty.set(booking.propertyId, propertyDates);
    }),
  );

  await Promise.all(
    propertiesSnapshot.docs.map((propertyDoc) =>
      updateDoc(doc(firestore, 'properties', propertyDoc.id), {
        reservedDates: Array.from(activeDatesByProperty.get(propertyDoc.id) || []).sort(),
        updatedAt: serverTimestamp(),
      })
    ),
  );

  propertyAvailabilityCache.clear();
}

function resetBookingsCache() {
  hostBookingsCache.clear();
  clientBookingsCache.clear();
  propertyBookingsCache.clear();
  propertyAvailabilityCache.clear();
}

export async function createBooking(booking: Omit<Booking, 'id' | 'createdAt'>) {
  const docRef = await addDoc(bookingsCollection, {
    ...booking,
    status: booking.status || 'pending',
    createdAt: serverTimestamp(),
  });

  try {
    await upsertBookingAvailability(
      docRef.id,
      {
        propertyId: booking.propertyId,
        hostId: booking.hostId,
        clientId: booking.clientId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status || 'pending',
      },
      true,
    );
  } catch (error) {
    console.error('Failed to mirror booking availability:', error);
  }

  try {
    await syncPropertyReservedDates(booking.propertyId);
  } catch (error) {
    console.error('Failed to sync property reserved dates:', error);
  }

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
    try {
      await upsertBookingAvailability(bookingId, {
        propertyId: booking.propertyId,
        hostId: booking.hostId,
        clientId: booking.clientId,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status,
      });
    } catch (error) {
      console.error('Failed to update booking availability:', error);
    }

    try {
      await syncPropertyReservedDates(booking.propertyId);
    } catch (error) {
      console.error('Failed to sync property reserved dates:', error);
    }
  }
  resetBookingsCache();
}

export async function getPublicPropertyAvailability(propertyId: string): Promise<BookingAvailability[]> {
  const cached = propertyAvailabilityCache.get(propertyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const snapshot = await getDocs(query(bookingAvailabilityCollection, where('propertyId', '==', propertyId)));
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BookingAvailability) }));
  propertyAvailabilityCache.set(propertyId, { data, expiresAt: Date.now() + BOOKINGS_CACHE_TTL_MS });
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
