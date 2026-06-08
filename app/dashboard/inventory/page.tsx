'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../../providers';
import { getHostProperties, type Property } from '../../../lib/properties';
import {
  ASSET_CATEGORY_LABELS,
  ASSET_CONDITION_LABELS,
  createFixedAsset,
  getHostFixedAssets,
  type FixedAsset,
  type FixedAssetCategory,
  type FixedAssetCondition,
} from '../../../lib/inventory';
import { X } from 'lucide-react';

const CATEGORIES = Object.entries(ASSET_CATEGORY_LABELS) as [FixedAssetCategory, string][];
const CONDITIONS = Object.entries(ASSET_CONDITION_LABELS) as [FixedAssetCondition, string][];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY_FORM = {
  propertyId: '',
  name: '',
  category: '' as FixedAssetCategory | '',
  condition: '' as FixedAssetCondition | '',
  value: 0,
  quantity: 1,
  addedAt: todayIso(),
};

export default function InventoryPage() {
  const { profile, loading } = useContext(AuthContext);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadData = async (hostId: string) => {
    // Properties always load — they have public read rights.
    const propsData = await getHostProperties(hostId);
    setProperties(propsData);

    // Fixed assets may fail if Firestore rules are not yet deployed.
    try {
      const assetsData = await getHostFixedAssets(hostId);
      setAssets(assetsData);
    } catch {
      // Leave existing assets state; do not block the page.
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!profile?.uid || (profile.role !== 'host' && profile.role !== 'admin')) return;
      setSyncing(true);
      try {
        await loadData(profile.uid);
      } catch {
        setStatus('Не вдалося синхронізувати обʼєкти для інвентаризації.');
      } finally {
        setSyncing(false);
      }
    };
    bootstrap();
  }, [profile]);

  useEffect(() => {
    if (showForm) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [showForm]);

  const handleSync = async () => {
    if (!profile?.uid) return;
    setSyncing(true);
    setStatus('');
    try {
      await loadData(profile.uid);
      setStatus('Інвентаризацію синхронізовано з вашими обʼєктами.');
    } catch {
      setStatus('Не вдалося синхронізувати обʼєкти.');
    } finally {
      setSyncing(false);
      setTimeout(() => setStatus(''), 2500);
    }
  };

  const openForm = () => {
    setForm({ ...EMPTY_FORM, addedAt: todayIso(), propertyId: properties[0]?.id || '' });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError('');
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    if (!form.propertyId) { setFormError('Оберіть обʼєкт.'); return; }
    if (!form.name.trim()) { setFormError('Введіть назву ОЗ.'); return; }
    if (!form.category) { setFormError('Оберіть категорію.'); return; }
    if (!form.condition) { setFormError('Оберіть стан.'); return; }
    if (form.value < 0) { setFormError('Вартість не може бути від́ємною.'); return; }
    if (form.quantity < 1) { setFormError('Кількість має бути більше 0.'); return; }
    if (!form.addedAt) { setFormError('Вкажіть дату додавання.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const propertyTitle = properties.find((p) => p.id === form.propertyId)?.title || '';
      const newAsset: Omit<FixedAsset, 'id' | 'createdAt'> = {
        hostId: profile.uid,
        propertyId: form.propertyId,
        propertyTitle,
        name: form.name.trim(),
        category: form.category as FixedAssetCategory,
        condition: form.condition as FixedAssetCondition,
        value: form.value,
        quantity: form.quantity,
        addedAt: form.addedAt,
      };
      const id = await createFixedAsset(newAsset);
      setAssets((prev) => [...prev, { ...newAsset, id }]);
      closeForm();
      setStatus('Основний засіб додано.');
      setTimeout(() => setStatus(''), 2500);
    } catch {
      setFormError('Не вдалося зберегти. Перевірте права доступу Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const assetsByProperty = useMemo(() => {
    const map = new Map<string, FixedAsset[]>();
    for (const asset of assets) {
      const list = map.get(asset.propertyId) || [];
      list.push(asset);
      map.set(asset.propertyId, list);
    }
    return map;
  }, [assets]);

  if (loading) {
    return <p className="p-8 text-slate-500">Завантаження...</p>;
  }

  if (!profile || profile.role === 'client') {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Доступ заборонено</h1>
          <p className="mt-4 text-slate-600">Цей розділ доступний тільки для орендодавців.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Інвентаризація</h1>
            <p className="mt-2 text-sm text-slate-600">
              Облік основних засобів по ваших обʼєктах.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openForm}
              disabled={properties.length === 0}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Додати ОЗ
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? 'Синхронізація...' : 'Синхронізувати'}
            </button>
          </div>
        </div>

        {/* Status */}
        {status ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {status}
          </div>
        ) : null}

        {/* Summary */}
        <div className="mt-6 flex gap-4 text-sm text-slate-600">
          <span>Обʼєктів: <strong className="text-slate-900">{properties.length}</strong></span>
          <span>ОЗ всього: <strong className="text-slate-900">{assets.length}</strong></span>
        </div>

        {/* Property cards with assets */}
        <div className="mt-4 space-y-4">
          {properties.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Поки немає обʼєктів. Додайте обʼєкт у розділі «Мої обʼєкти».
            </p>
          ) : (
            properties.map((property) => {
              const propertyAssets = assetsByProperty.get(property.id || '') || [];
              return (
                <div key={property.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{property.title}</p>
                      <p className="text-xs text-slate-500">{property.address || 'Адресу не вказано'}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      ОЗ: {propertyAssets.length}
                    </span>
                  </div>

                  {propertyAssets.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {propertyAssets.map((asset) => (
                        <div key={asset.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-sm font-medium text-slate-900">{asset.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {ASSET_CATEGORY_LABELS[asset.category]} • {ASSET_CONDITION_LABELS[asset.condition]} • {asset.value.toLocaleString('uk-UA')} грн • {asset.quantity} шт. • {asset.addedAt}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">Основних засобів ще немає.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Modal */}
      <dialog
        ref={dialogRef}
        onClose={closeForm}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Додати основний засіб</h2>
          <button
            type="button"
            onClick={closeForm}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Property */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Обʼєкт</label>
            <select
              value={form.propertyId}
              onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Категорія</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as FixedAssetCategory }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            >
              <option value="">— Оберіть категорію —</option>
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Стан</label>
            <select
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as FixedAssetCondition }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            >
              <option value="">— Оберіть стан —</option>
              {CONDITIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Вартість (грн)</label>
            <input
              type="number"
              min={0}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: Math.max(0, Number(e.target.value)) }))}
              placeholder="0"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Назва ОЗ</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Наприклад: Диван, Холодильник"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          {/* Added At */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Дата додавання</label>
            <input
              type="date"
              value={form.addedAt}
              onChange={(e) => setForm((f) => ({ ...f, addedAt: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Кількість</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </div>

          {formError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={closeForm}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Збереження...' : 'Зберегти'}
          </button>
        </div>
      </dialog>
    </main>
  );
}
