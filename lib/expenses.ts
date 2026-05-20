import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { firestore } from './firebase';

export type ExpenseCategory = 'utility' | 'cleaning' | 'repair' | 'other';

export interface Expense {
  id?: string;
  hostId: string;
  propertyId?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  createdAt?: any;
}

const expensesCollection = collection(firestore, 'expenses');

export async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
  const docRef = await addDoc(expensesCollection, {
    ...expense,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getHostExpenses(hostId: string): Promise<Expense[]> {
  const q = query(expensesCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Expense) }));
}

export async function getPropertyExpenses(propertyId: string): Promise<Expense[]> {
  const q = query(expensesCollection, where('propertyId', '==', propertyId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Expense) }));
}
