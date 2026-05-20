'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../providers';
import { createProperty, deleteProperty, getHostProperties, updateProperty, type Property } from '../../../lib/properties';
import { uploadPropertyImages } from '../../../lib/storage';
import { Edit3, PlusCircle, Trash2 } from 'lucide-react';

export default function PropertiesPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    pricePerNight: 0,
    address: '',
    rooms: 1,
    guests: 1,
    amenities: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const loadProperties = async () => {
      if (!profile?.uid) return;
      const data = await getHostProperties(profile.uid);
      setProperties(data);
    };

    loadProperties();
  }, [profile]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      pricePerNight: 0,
      address: '',
      rooms: 1,
      guests: 1,
      amenities: '',
    });
  };

  const handleEdit = (property: Property) => {
    setEditingId(property.id ?? null);
    setExistingImages(property.images ?? []);
    setForm({
      title: property.title,
      description: property.description,
      pricePerNight: property.pricePerNight,
      address: property.address,
      rooms: property.rooms,
      guests: property.guests,
      amenities: property.amenities?.join(', ') ?? '',
    });
  };

  const handleDelete = async (propertyId: string | undefined) => {
    if (!propertyId) return;
    await deleteProperty(propertyId);
    setProperties(properties.filter((item) => item.id !== propertyId));
    setStatus('Властивість видалено');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.uid) return;
    setSaving(true);
    setStatus('');

    const propertyPayload = {
      hostId: profile.uid,
      title: form.title,
      description: form.description,
      pricePerNight: Number(form.pricePerNight),
      address: form.address,
      rooms: Number(form.rooms),
      guests: Number(form.guests),
      images: existingImages,
      amenities: form.amenities.split(',').map((item) => item.trim()).filter(Boolean),
    };

    if (editingId) {
      if (imageFiles) {
        const uploadedUrls = await uploadPropertyImages(editingId, imageFiles);
        propertyPayload.images = [...existingImages, ...uploadedUrls];
      }

      await updateProperty(editingId, propertyPayload);
      setProperties((current) => current.map((item) => (item.id === editingId ? { ...item, ...propertyPayload } : item)));
      setStatus('Властивість оновлено');
    } else {
      const newId = await createProperty(propertyPayload);
      if (imageFiles) {
        const uploadedUrls = await uploadPropertyImages(newId, imageFiles);
        propertyPayload.images = uploadedUrls;
        await updateProperty(newId, { images: uploadedUrls });
      }
      setProperties((current) => [{ id: newId, ...propertyPayload }, ...current]);
      setStatus('Властивість додано');
    }

    resetForm();
    setSaving(false);
    setTimeout(() => setStatus(''), 2000);
  };

  if (loading) {
    return <p className="p-8 text-slate-300">Завантаження...</p>;
  }

  if (!profile || profile.role === 'client') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 text-slate-600">Це сторінка лише для орендодавців. Увійдіть як хост або створіть профіль хоста.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-500">Управління нерухомістю</p>
              <h1 className="mt-4 text-4xl font-semibold text-slate-900">Ваші об’єкти</h1>
              <p className="mt-3 text-slate-600">Створюйте, редагуйте та видаляйте ваші пропозиції. Цей модуль — ядро B2B-платформи.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-700">
              <PlusCircle className="h-5 w-5 text-sky-500" /> Додати нову
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-2xl font-semibold text-slate-900">Список об’єктів</h2>
            <div className="mt-6 space-y-4">
              {properties.length === 0 ? (
                <p className="text-slate-400">У вас ще немає об’єктів. Додайте перший.</p>
              ) : (
                properties.map((property) => (
                  <div key={property.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{property.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{property.address}</p>
                        <p className="mt-1 text-sm text-slate-600">{property.rooms} кімнати · {property.guests} гостей</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(property)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-900 transition hover:border-sky-400"
                        >
                          <Edit3 className="h-4 w-4" /> Редагувати
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(property.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-500 bg-rose-100 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-200"
                        >
                          <Trash2 className="h-4 w-4" /> Видалити
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-2xl font-semibold text-slate-900">Форма об’єкта</h2>
            <p className="mt-2 text-sm text-slate-600">Додайте або відредагуйте об’єкт, щоб він з’явився в кабінеті та на персональній сторінці.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">Назва об’єкта</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Адреса</label>
                <input
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  required
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Опис</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={4}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Ціна за ніч, грн</label>
                  <input
                    type="number"
                    value={form.pricePerNight}
                    onChange={(event) => setForm({ ...form, pricePerNight: Number(event.target.value) })}
                    required
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Кімнат</label>
                  <input
                    type="number"
                    value={form.rooms}
                    onChange={(event) => setForm({ ...form, rooms: Number(event.target.value) })}
                    required
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Гостей</label>
                  <input
                    type="number"
                    value={form.guests}
                    onChange={(event) => setForm({ ...form, guests: Number(event.target.value) })}
                    required
                    className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Зручності (через кому)</label>
                <input
                  value={form.amenities}
                  onChange={(event) => setForm({ ...form, amenities: event.target.value })}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Фото об’єкта</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setImageFiles(event.target.files)}
                  className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:text-slate-900 focus:border-sky-400"
                />
                {existingImages.length > 0 && (
                  <p className="mt-2 text-sm text-slate-400">Завантажено {existingImages.length} фото</p>
                )}
              </div>
              {status && <p className="text-sm text-sky-300">{status}</p>}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {editingId ? 'Оновити об’єкт' : 'Додати об’єкт'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
