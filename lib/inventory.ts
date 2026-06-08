import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';

export type FixedAssetCategory = 'furniture' | 'appliances' | 'additional';
export type FixedAssetCondition = 'new' | 'used';

export const ASSET_CONDITION_LABELS: Record<FixedAssetCondition, string> = {
  new: 'Новий',
  used: 'Б/у',
};

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
  condition: FixedAssetCondition;
  value: number;
  quantity: number;
  addedAt: string;
  createdAt?: any;
}

const assetsCollection = collection(firestore, 'fixedAssets');

function createAssetId() {
  return doc(assetsCollection).id;
}

export async function getHostFixedAssets(hostId: string): Promise<FixedAsset[]> {
  const userDoc = await getDoc(doc(firestore, 'users', hostId));
  if (!userDoc.exists()) {
    return [];
  }

  const data = userDoc.data() as { fixedAssets?: FixedAsset[] };
  return (data.fixedAssets || []).sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''));
}

export async function createFixedAsset(asset: Omit<FixedAsset, 'id' | 'createdAt'>): Promise<string> {
  const userRef = doc(firestore, 'users', asset.hostId);
  const userDoc = await getDoc(userRef);
  const currentData = userDoc.exists() ? (userDoc.data() as { fixedAssets?: FixedAsset[] }) : {};
  const nextId = createAssetId();
  const nextAsset: FixedAsset = {
    ...asset,
    id: nextId,
    createdAt: new Date().toISOString(),
  };

  await updateDoc(userRef, {
    fixedAssets: [...(currentData.fixedAssets || []), nextAsset],
  });

  return nextId;
}
