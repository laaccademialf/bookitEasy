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

export async function createBooking(booking: Omit<Booking, 'id' | 'createdAt'>) {
  const docRef = await addDoc(bookingsCollection, {
    ...booking,
    status: booking.status || 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getHostBookings(hostId: string): Promise<Booking[]> {
  const q = query(bookingsCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Booking) }));
}

export async function getClientBookings(clientId: string): Promise<Booking[]> {
  const q = query(bookingsCollection, where('clientId', '==', clientId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Booking) }));
}

export async function getPropertyBookings(propertyId: string): Promise<Booking[]> {
  const q = query(bookingsCollection, where('propertyId', '==', propertyId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Booking) }));
}
