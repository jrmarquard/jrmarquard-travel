'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({ id: '', title: '', start: '', end: '', countries: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          title: form.title,
          start: form.start,
          end: form.end,
          countries: form.countries
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create trip');
        return;
      }
      router.push(`/trips/${form.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mb-8 block">
        ← All trips
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-8">New trip</h1>

      <form onSubmit={submit} className="space-y-5">
        <Field label="ID" hint="URL slug — lowercase letters, numbers, hyphens only">
          <input
            required
            pattern="[a-z0-9-]+"
            placeholder="japan-2027"
            value={form.id}
            onChange={(e) => set('id', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Title">
          <input
            required
            placeholder="Japan 2027"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date">
            <input
              required
              type="date"
              value={form.start}
              onChange={(e) => set('start', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="End date">
            <input
              required
              type="date"
              value={form.end}
              onChange={(e) => set('end', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Countries" hint="Comma-separated ISO codes e.g. JP, KR">
          <input
            placeholder="JP, KR"
            value={form.countries}
            onChange={(e) => set('countries', e.target.value)}
            className={inputCls}
          />
        </Field>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Creating…' : 'Create trip'}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
