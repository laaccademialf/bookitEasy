import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadPropertyImages(propertyId: string, files: FileList) {
  const urls: string[] = [];
  const uploads = Array.from(files).map(async (file) => {
    const storageRef = ref(storage, `properties/${propertyId}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  });

  await Promise.all(uploads);
  return urls;
}
