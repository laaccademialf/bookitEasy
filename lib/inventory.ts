import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { firestore } from './firebase';

export type FixedAssetCategory = 'furniture' | 'appliances' | 'additional';

export const ASSET_CATEGORY_LABELS: Record<FixedAssetCategory, string> = {
  furniture: 'Меблі',
  appliances: 'Техніка',
  additional: 'Додаткове обладнання',
};

export interface FixedAsset {
  id?: string;
  hostId: string;
  propertyId: string;
  propertyTitle: string;
  name: string;
  category: FixedAssetCategory;
  quantity: number;
  createdAt?: any;
}

const assetsCollection = collection(firestore, 'fixedAssets');

export async function getHostFixedAssets(hostId: string): Promise<FixedAsset[]> {
  const q = query(assetsCollection, where('hostId', '==', hostId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<FixedAsset, 'id'>) }));
}

export async function createFixedAsset(asset: Omit<FixedAsset, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(assetsCollection, { ...asset, createdAt: serverTimestamp() });
  return docRef.id;
}
