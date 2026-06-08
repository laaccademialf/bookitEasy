import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
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
  updatedAt?: any;
}

const expensesCollection = collection(firestore, 'expenses');
const EXPENSES_CACHE_TTL_MS = 10000;
const hostExpensesCache = new Map<string, { data: Expense[]; expiresAt: number }>();
const propertyExpensesCache = new Map<string, { data: Expense[]; expiresAt: number }>();

function resetExpensesCache() {
  hostExpensesCache.clear();
  propertyExpensesCache.clear();
}

export async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
  const docRef = await addDoc(expensesCollection, {
    ...expense,
    createdAt: serverTimestamp(),
  });
  resetExpensesCache();
  return docRef.id;
}

export async function updateExpense(
  expenseId: string,
  expense: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  await updateDoc(doc(expensesCollection, expenseId), {
    ...expense,
    updatedAt: serverTimestamp(),
  });
  resetExpensesCache();
}

export async function deleteExpense(expenseId: string) {
  await deleteDoc(doc(expensesCollection, expenseId));
  resetExpensesCache();
}

export async function getHostExpenses(hostId: string): Promise<Expense[]> {
  const cached = hostExpensesCache.get(hostId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const q = query(expensesCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Expense) }));
  hostExpensesCache.set(hostId, { data, expiresAt: Date.now() + EXPENSES_CACHE_TTL_MS });
  return data;
}

export async function getPropertyExpenses(propertyId: string): Promise<Expense[]> {
  const cached = propertyExpensesCache.get(propertyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const q = query(expensesCollection, where('propertyId', '==', propertyId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Expense) }));
  propertyExpensesCache.set(propertyId, { data, expiresAt: Date.now() + EXPENSES_CACHE_TTL_MS });
  return data;
}
