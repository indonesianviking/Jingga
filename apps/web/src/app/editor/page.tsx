'use client';

import React, { useState, useCallback } from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import JinggaEditor from '@/components/editor/JinggaEditor';
import { apiRequest } from '@/lib/api';

interface DraftData {
  id?: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: string;
  content: string;
}

export default function EditorPage() {
  const { user, walletAddress, isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<DraftData>({
    judul: '',
    deskripsi: '',
    kategori: 'fiksi',
    harga: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEditorChange = useCallback((_html: string, _json: unknown) => {
    // Content is managed by the editor internally
    // We capture it on save/publish
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!form.judul.trim()) {
      setMessage({ type: 'error', text: 'Judul harus diisi' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Get content from editor
      const editorEl = document.querySelector('.ProseMirror');
      const content = editorEl?.innerHTML || form.content;

      const payload = {
        judul: form.judul,
        deskripsi: form.deskripsi,
        kategori: form.kategori,
        content,
        status: 'draft',
      };

      if (savedDraftId) {
        await apiRequest(`/api/v1/karya/${savedDraftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        const result = await apiRequest<{ id: string }>('/api/v1/karya', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSavedDraftId(result.id);
      }

      setMessage({ type: 'success', text: 'Draft berhasil disimpan!' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal menyimpan draft' });
    } finally {
      setSaving(false);
    }
  }, [form, savedDraftId]);

  const handlePublish = useCallback(async () => {
    if (!form.judul.trim()) {
      setMessage({ type: 'error', text: 'Judul harus diisi' });
      return;
    }
    if (!form.harga || parseFloat(form.harga) <= 0) {
      setMessage({ type: 'error', text: 'Harga harus lebih dari 0 XLM' });
      return;
    }

    setPublishing(true);
    setMessage(null);

    try {
      const editorEl = document.querySelector('.ProseMirror');
      const content = editorEl?.innerHTML || form.content;

      const payload = {
        judul: form.judul,
        deskripsi: form.deskripsi,
        kategori: form.kategori,
        harga: parseFloat(form.harga),
        content,
        status: 'published',
      };

      if (savedDraftId) {
        // Update existing draft then publish
        await apiRequest(`/api/v1/karya/${savedDraftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        await apiRequest(`/api/v1/karya/${savedDraftId}/publish`, {
          method: 'POST',
        });
      } else {
        // Create and publish in one go
        await apiRequest('/api/v1/karya', {
          method: 'POST',
          body: JSON.stringify({ ...payload, status: 'published' }),
        });
      }

      setMessage({ type: 'success', text: 'Karya berhasil dipublish ke Marketplace! 🎉' });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal publish karya' });
    } finally {
      setPublishing(false);
    }
  }, [form, savedDraftId, router]);

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
              Hubungkan wallet Stellar Anda untuk mulai menulis dan publish karya
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
            <div className="relative my-md">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hairline"></div></div>
              <div className="relative flex justify-center text-sm"><span className="bg-canvas px-sm text-ink-subtle">atau</span></div>
            </div>
            <a
              href="/login"
              className="block w-full border border-hairline text-ink text-button py-sm px-md rounded-none hover:bg-surface-1 transition-colors"
            >
              Login dengan Email
            </a>
            {authError && <p className="text-body-sm text-semantic-error mt-md">{authError}</p>}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[1200px] py-xl px-lg">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-display-md text-ink mb-sm">Editor</h1>
          <p className="text-body text-ink-muted">
            Tulis, edit, dan publish karya Anda langsung ke Marketplace
            {walletAddress && (
              <span className="font-mono text-caption text-ink-subtle ml-xs">
                ({truncateAddress(walletAddress, 6)})
              </span>
            )}
          </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-lg">
          {/* Editor */}
          <div>
            <JinggaEditor
              initialContent={form.content}
              onChange={handleEditorChange}
              placeholder="Mulai tulis karya Anda di sini... Support rich text, gambar, heading, dan lainnya."
            />
          </div>

          {/* Sidebar - Metadata */}
          <div className="space-y-lg">
            {/* Karya Details */}
            <div className="bg-canvas border border-hairline p-lg">
              <h3 className="text-card-title text-ink mb-md">Detail Karya</h3>

              <div className="space-y-md">
                <div>
                  <label className="block text-body-sm text-ink-muted mb-xs">Judul *</label>
                  <input
                    type="text"
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="Judul karya Anda"
                    className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
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
                  />
                  <p className="text-caption text-ink-subtle mt-xs">Harga akses untuk pembaca</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-canvas border border-hairline p-lg">
              <h3 className="text-card-title text-ink mb-md">Aksi</h3>

              <div className="space-y-sm">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || publishing}
                  className="w-full bg-surface-1 text-ink text-button py-sm px-md rounded-none hover:bg-surface-2 transition-colors border border-hairline disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan Draft'}
                </button>

                <button
                  onClick={handlePublish}
                  disabled={saving || publishing}
                  className="w-full bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {publishing ? 'Publishing...' : '🚀 Publish ke Marketplace'}
                </button>
              </div>

              <div className="mt-md pt-md border-t border-hairline">
                <p className="text-caption text-ink-subtle">
                  Publish akan membuat karya Anda tersedia di Marketplace dan siap dibeli oleh pembaca.
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-surface-1 border border-hairline p-lg">
              <h3 className="text-card-title text-ink mb-sm">💡 Tips</h3>
              <ul className="space-y-xs text-body-sm text-ink-muted">
                <li>• Gunakan heading untuk struktur yang jelas</li>
                <li>• Upload gambar untuk ilustrasi</li>
                <li>• Simpan draft sebelum publish</li>
                <li>• Harga dalam XLM (Stellar)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
