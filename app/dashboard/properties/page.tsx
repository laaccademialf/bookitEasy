'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '../../providers';
import { createProperty, deleteProperty, getHostProperties, updateProperty, type Property } from '../../../lib/properties';
import { ensureSecureHostPublicKey, isSecureHostPublicKey, updateUserProfileData } from '../../../lib/auth';
import { uploadPropertyImages } from '../../../lib/storage';
import { Check, Copy, Edit3, ExternalLink, Home, Plus, Trash2, X } from 'lucide-react';
import { PageBanner } from '../../../components/PageBanner';

const EMPTY_FORM = {
  title: '',
  description: '',
  pricePerNight: 0,
  address: '',
  rooms: 1,
  guests: 1,
  amenities: '',
};

export default function PropertiesPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [publicHostUsername, setPublicHostUsername] = useState('');
  const [ensuringHostUsername, setEnsuringHostUsername] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const loadProperties = async () => {
      if (!profile?.uid) return;
      try {
        const data = await getHostProperties(profile.uid);
        setProperties(data);
      } catch {
        setStatus('Не вдалося завантажити обʼєкти. Перевірте доступ до бази даних.');
      }
    };

    loadProperties();
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role === 'client') return;
    if (publicHostUsername) return;

    const ensureHostUsername = async () => {
      const fallback = ensureSecureHostPublicKey(profile.hostUsername);
      if (profile.hostUsername && isSecureHostPublicKey(profile.hostUsername)) {
        setPublicHostUsername(profile.hostUsername);
        return;
      }

      try {
        setEnsuringHostUsername(true);
        await updateUserProfileData(profile.uid, {
          email: profile.email,
          name: profile.name,
          role: profile.role,
          hostUsername: fallback,
        });
        setPublicHostUsername(fallback);
      } catch {
        setPublicHostUsername(fallback);
      } finally {
        setEnsuringHostUsername(false);
      }
    };

    ensureHostUsername();
  }, [profile, publicHostUsername]);

  const resetForm = () => {
    setEditingId(null);
    setExistingImages([]);
    setImageFiles(null);
    setForm(EMPTY_FORM);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (property: Property) => {
    setEditingId(property.id ?? null);
    setExistingImages(property.images ?? []);
    setImageFiles(null);
    setForm({
      title: property.title,
      description: property.description,
      pricePerNight: property.pricePerNight,
      address: property.address,
      rooms: property.rooms,
      guests: property.guests,
      amenities: property.amenities?.join(', ') ?? '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleCopyLink = async () => {
    if (!publicHostUsername || typeof window === 'undefined') return;
    const url = `${window.location.origin}/host/${publicHostUsername}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setStatus('Не вдалося скопіювати посилання.');
      setTimeout(() => setStatus(''), 2500);
    }
  };

  const handleDelete = async (propertyId: string | undefined) => {
    if (!propertyId) return;
    if (typeof window !== 'undefined' && !window.confirm('Видалити цей обʼєкт?')) return;
    try {
      await deleteProperty(propertyId);
      setProperties(properties.filter((item) => item.id !== propertyId));
      setStatus('Властивість видалено');
      closeModal();
    } catch {
      setStatus('Не вдалося видалити обʼєкт. Спробуйте ще раз.');
    } finally {
      setTimeout(() => setStatus(''), 2500);
    }
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

    try {
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
        let uploadFailed = false;
        if (imageFiles) {
          try {
            const uploadedUrls = await uploadPropertyImages(newId, imageFiles);
            propertyPayload.images = uploadedUrls;
            await updateProperty(newId, { images: uploadedUrls });
          } catch {
            uploadFailed = true;
            setStatus('Обʼєкт збережено, але фото не завантажились. Виберіть фото ще раз і натисніть «Оновити».');
          }
        }
        setProperties((current) => [{ id: newId, ...propertyPayload }, ...current]);
        if (uploadFailed) {
          // Switch to edit mode so user can retry photo upload without creating a duplicate
          setEditingId(newId);
          setExistingImages(propertyPayload.images);
          setImageFiles(null);
          setSaving(false);
          return;
        }
        setStatus('Властивість додано. Посилання хоста для клієнта згенеровано нижче.');
      }

      resetForm();
      setIsModalOpen(false);
    } catch (error: any) {
      const code = error?.code ? String(error.code) : '';
      if (code === 'permission-denied') {
        setStatus('Немає прав на створення/оновлення обʼєкта. Перевірте роль орендодавця.');
      } else {
        setStatus('Не вдалося зберегти обʼєкт. Спробуйте ще раз.');
      }
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 3000);
    }
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
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <PageBanner
        title="Обʼєкти"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {publicHostUsername ? (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title={`Скопіювати посилання /host/${publicHostUsername}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400 hover:text-slate-900 sm:text-sm"
                >
                  {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {linkCopied ? 'Скопійовано' : 'Копія посилання'}
                </button>
                <Link
                  href={`/host/${publicHostUsername}`}
                  target="_blank"
                  title="Відкрити публічну сторінку"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white p-2 text-slate-700 transition hover:border-sky-400 hover:text-slate-900"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <span className="text-xs text-slate-500">{ensuringHostUsername ? 'Генеруємо посилання...' : ''}</span>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-400 sm:text-sm"
            >
              <Plus className="h-4 w-4" /> Додати
            </button>
          </div>
        }
      />

      <div className="w-full px-3 py-5 sm:px-6 sm:py-8 lg:px-6">
        {status && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {status}
          </div>
        )}

        {properties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Home className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-slate-600">У вас ще немає обʼєктів.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
            >
              <Plus className="h-4 w-4" /> Додати перший обʼєкт
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {properties.map((property) => {
              const thumb = property.images?.[0];
              return (
                <div
                  key={property.id}
                  className="group flex aspect-square flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-300 hover:shadow-md"
                >
                  <div className="relative flex-1 overflow-hidden bg-slate-100">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={property.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Home className="h-10 w-10" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent p-2">
                      <h3 className="truncate text-xs font-semibold text-white sm:text-sm">{property.title}</h3>
                      <p className="truncate text-[10px] text-slate-200 sm:text-xs">{property.pricePerNight} грн/ніч</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(property)}
                    className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:text-sm"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Редагувати
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                {editingId ? 'Редагувати обʼєкт' : 'Новий обʼєкт'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Закрити"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form id="property-form" onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">Назва обʼєкта</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Адреса</label>
                <input
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Опис</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Ціна, грн/ніч</label>
                  <input
                    type="number"
                    value={form.pricePerNight}
                    onChange={(event) => setForm({ ...form, pricePerNight: Number(event.target.value) })}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Кімнат</label>
                  <input
                    type="number"
                    value={form.rooms}
                    onChange={(event) => setForm({ ...form, rooms: Number(event.target.value) })}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Гостей</label>
                  <input
                    type="number"
                    value={form.guests}
                    onChange={(event) => setForm({ ...form, guests: Number(event.target.value) })}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Зручності (через кому)</label>
                <input
                  value={form.amenities}
                  onChange={(event) => setForm({ ...form, amenities: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Фото обʼєкта</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setImageFiles(event.target.files)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-sm file:text-slate-900 focus:border-sky-400"
                />
                {existingImages.length > 0 && (
                  <p className="mt-2 text-sm text-slate-500">Завантажено {existingImages.length} фото</p>
                )}
              </div>
              {status && <p className="text-sm text-slate-700">{status}</p>}
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => handleDelete(editingId)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" /> Видалити
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  form="property-form"
                  disabled={saving}
                  className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {saving ? 'Збереження...' : editingId ? 'Оновити' : 'Створити'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
