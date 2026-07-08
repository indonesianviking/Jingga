'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { apiRequest } from '@/lib/api';

interface UploadForm {
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: string;
}

export default function UploadPage() {
  const { user, walletAddress, isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<UploadForm>({
    judul: '',
    deskripsi: '',
    kategori: 'fiksi',
    harga: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'cover') => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (type === 'file') setFile(selected);
      else setCover(selected);
    }
    e.target.value = '';
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'File harus dipilih' });
      return;
    }
    if (!form.judul.trim()) {
      setMessage({ type: 'error', text: 'Judul harus diisi' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('judul', form.judul);
      formData.append('deskripsi', form.deskripsi);
      formData.append('kategori', form.kategori);
      formData.append('harga', form.harga);
      formData.append('file', file);
      if (cover) formData.append('cover', cover);

      const token = localStorage.getItem('jingga_auth_token');
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/v1/karya`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      setMessage({ type: 'success', text: 'Karya berhasil diupload! 🎉' });
      setForm({ judul: '', deskripsi: '', kategori: 'fiksi', harga: '' });
      setFile(null);
      setCover(null);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload gagal' });
    } finally {
      setUploading(false);
    }
  }, [form, file, cover]);

  // Auth gate
  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-ink-subtle">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-lg">
          <div className="bg-canvas border border-hairline p-xl max-w-md text-center">
            <h1 className="text-headline text-ink mb-md">Hubungkan Wallet</h1>
            <p className="text-body text-ink-muted mb-lg">
              Hubungkan wallet Stellar Anda untuk mengupload karya
            </p>
            {isFreighterAvailable ? (
              <button
                onClick={connectFreighter}
                className="w-full bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors mb-md"
              >
                Connect Freighter Wallet
              </button>
            ) : (
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block bg-surface-1 text-ink text-button py-sm px-md rounded-none hover:bg-surface-2 transition-colors border border-hairline mb-md"
              >
                Install Freighter Extension
              </a>
            )}
            {authError && <p className="text-body-sm text-semantic-error mt-md">{authError}</p>}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[800px] py-xl px-lg">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-display-md text-ink mb-sm">Upload Karya</h1>
          <p className="text-body text-ink-muted mb-md">
            Upload file karya Anda langsung ke Jingga
          </p>
          <div className="bg-surface-1 border border-hairline p-md">
            <p className="text-body-sm text-ink-muted">
              💡 <strong>Mau menulis langsung?</strong>{' '}
              <a href="/editor" className="text-primary hover:underline">Gunakan Editor kami</a> untuk menulis, edit, dan publish karya — semua dalam satu halaman.
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-lg p-md border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-canvas border border-hairline p-lg">
          <div className="space-y-lg">
            {/* File Upload */}
            <div>
              <label className="block text-body-sm text-ink-muted mb-xs">File Karya *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-hairline p-lg text-center cursor-pointer hover:border-primary transition-colors"
              >
                {file ? (
                  <div>
                    <p className="text-body text-ink">{file.name}</p>
                    <p className="text-caption text-ink-subtle">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-sm">📄</div>
                    <p className="text-body text-ink-muted">Klik untuk memilih file</p>
                    <p className="text-caption text-ink-subtle">PDF, DOCX, TXT (max 50MB)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={(e) => handleFileSelect(e, 'file')}
                className="hidden"
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-body-sm text-ink-muted mb-xs">Cover Image (opsional)</label>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed border-hairline p-md text-center cursor-pointer hover:border-primary transition-colors"
              >
                {cover ? (
                  <div className="flex items-center gap-sm justify-center">
                    <img
                      src={URL.createObjectURL(cover)}
                      alt="Cover preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <p className="text-body-sm text-ink">{cover.name}</p>
                  </div>
                ) : (
                  <p className="text-body-sm text-ink-muted">Klik untuk memilih cover image</p>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'cover')}
                className="hidden"
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="md:col-span-2">
                <label className="block text-body-sm text-ink-muted mb-xs">Judul *</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  placeholder="Judul karya Anda"
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-body-sm text-ink-muted mb-xs">Deskripsi</label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat tentang karya Anda"
                  rows={3}
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-body-sm text-ink-muted mb-xs">Kategori</label>
                <select
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                >
                  <option value="fiksi">Fiksi</option>
                  <option value="non-fiksi">Non-Fiksi</option>
                  <option value="paper">Paper / Artikel</option>
                  <option value="puisi">Puisi</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm text-ink-muted mb-xs">Harga (XLM) *</label>
                <input
                  type="number"
                  value={form.harga}
                  onChange={(e) => setForm({ ...form, harga: e.target.value })}
                  placeholder="10"
                  min="0"
                  step="0.1"
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-md">
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {uploading ? 'Mengupload...' : '🚀 Upload & Publish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
