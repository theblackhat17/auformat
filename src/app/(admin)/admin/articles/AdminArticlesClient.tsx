'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  categoryId: string | null;
  readingTime: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  published: boolean;
  publishedAt: string | null;
  sortOrder: number;
  createdAt: string;
  categorySlug: string | null;
  categoryLabel: string | null;
  categoryIcon: string | null;
  authorName: string | null;
}

interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  type: string;
}

const EMPTY: Omit<ArticleRow, 'id' | 'createdAt' | 'readingTime' | 'categorySlug' | 'categoryLabel' | 'categoryIcon' | 'authorName'> = {
  slug: '',
  title: '',
  excerpt: null,
  content: '',
  coverImage: null,
  categoryId: null,
  metaTitle: null,
  metaDescription: null,
  metaKeywords: null,
  published: false,
  publishedAt: null,
  sortOrder: 0,
};

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function calcReadingTime(markdown: string): number {
  const words = markdown.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdminArticlesClient() {
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ArticleRow | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview' | 'seo'>('edit');
  const [uploadingInline, setUploadingInline] = useState(false);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [aRes, cRes] = await Promise.all([
        fetch('/api/admin/articles'),
        fetch('/api/admin/categories?type=blog'),
      ]);
      if (!aRes.ok) throw new Error();
      const articles = await aRes.json();
      const cats = cRes.ok ? await cRes.json() : [];
      setItems(Array.isArray(articles) ? articles : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterStatus === 'published' && !i.published) return false;
      if (filterStatus === 'draft' && i.published) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !i.slug.includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, filterStatus]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setTab('edit'); setModalOpen(true); };
  const openEdit = (item: ArticleRow) => {
    setEditing(item);
    setForm({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      coverImage: item.coverImage,
      categoryId: item.categoryId,
      metaTitle: item.metaTitle,
      metaDescription: item.metaDescription,
      metaKeywords: item.metaKeywords,
      published: item.published,
      publishedAt: item.publishedAt,
      sortOrder: item.sortOrder,
    });
    setTab('edit');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.slug || !form.title) { toast.error('Slug et titre requis'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/articles/${editing.id}` : '/api/admin/articles';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erreur'); }
      toast.success(editing ? 'Article modifie' : 'Article cree');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ArticleRow) => {
    if (!confirm(`Supprimer "${item.title}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/articles/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Article supprime');
      load();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const togglePublish = async (item: ArticleRow) => {
    try {
      const res = await fetch(`/api/admin/articles/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, published: !item.published }),
      });
      if (!res.ok) throw new Error();
      toast.success(item.published ? 'Depublie' : 'Publie');
      load();
    } catch {
      toast.error('Erreur');
    }
  };

  const insertMarkdown = (before: string, after = '') => {
    const textarea = document.getElementById('article-content') as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end);
    const newText = form.content.slice(0, start) + before + selected + after + form.content.slice(end);
    setForm((prev) => ({ ...prev, content: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = document.getElementById('article-content') as HTMLTextAreaElement | null;
    const current = form.content;
    if (!textarea) {
      setForm((prev) => ({ ...prev, content: current + text }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = current.slice(0, start) + text + current.slice(end);
    setForm((prev) => ({ ...prev, content: newText }));
    setTimeout(() => {
      textarea.focus();
      const cursor = start + text.length;
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingInline(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur upload');
        return;
      }
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      insertAtCursor(`\n\n![${alt}](${data.path})\n\n`);
      toast.success('Image inseree');
    } catch {
      toast.error('Erreur upload');
    } finally {
      setUploadingInline(false);
    }
  };

  const wordCount = form.content.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean).length;
  const readingTimeEstimate = calcReadingTime(form.content);

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">Articles de blog visibles sur /blog</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium">
          + Nouvel article
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher un article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'published', 'draft'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterStatus === s ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}>
              {s === 'all' ? 'Tous' : s === 'published' ? 'Publies' : 'Brouillons'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Article</th>
              <th className="text-left px-4 py-3 font-medium">Categorie</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.coverImage ? (
                      <Image src={item.coverImage} alt="" width={48} height={48} className="rounded-lg object-cover w-12 h-12" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-xl">📰</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 font-mono">/blog/{item.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {item.categoryLabel ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                      {item.categoryIcon} {item.categoryLabel}
                    </span>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {formatDate(item.publishedAt || item.createdAt)}
                  <div className="text-gray-400">{item.readingTime} min lecture</div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => togglePublish(item)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${item.published ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {item.published ? '● Publie' : '○ Brouillon'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {item.published && (
                    <a href={`/blog/${item.slug}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-700 text-xs">Voir</a>
                  )}
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Modifier</button>
                  <button onClick={() => handleDelete(item)} className="text-red-500 hover:underline text-xs">Supprimer</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                {items.length === 0 ? 'Aucun article. Cree ton premier article !' : 'Aucun resultat'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Modifier : ${editing.title}` : 'Nouvel article'} size="xl">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-1">
              {(['edit', 'preview', 'seo'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t === 'edit' ? '✏️ Edition' : t === 'preview' ? '👁️ Apercu' : '🔍 SEO'}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400 pb-2">
              {wordCount} mots · ~{readingTimeEstimate} min de lecture
            </div>
          </div>

          {/* Edit tab */}
          {tab === 'edit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                  <input value={form.title} onChange={(e) => {
                    const title = e.target.value;
                    setForm((prev) => ({ ...prev, title, slug: editing ? prev.slug : slugify(title) }));
                  }} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Comment choisir le bois de sa cuisine ?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL) *</label>
                  <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extrait (resume)</label>
                <textarea value={form.excerpt || ''} onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phrase d'accroche affichee sur la liste du blog..." />
                <p className="text-xs text-gray-400 mt-1">{(form.excerpt || '').length}/200 caracteres recommandes</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                  <select value={form.categoryId || ''} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value || null }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Aucune</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.published} onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                      className="rounded w-4 h-4" />
                    <span className="text-sm text-gray-700">Publier l&apos;article</span>
                  </label>
                </div>
              </div>

              <div>
                <ImageUpload value={form.coverImage || undefined} onChange={(url) => setForm((prev) => ({ ...prev, coverImage: url }))} label="Image de couverture" />
              </div>

              {/* Markdown toolbar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Contenu (Markdown)</label>
                  <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-gray-600">Aide markdown ↗</a>
                </div>
                <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-50 rounded-t-lg border border-gray-200 border-b-0">
                  <button type="button" onClick={() => insertMarkdown('## ', '')} className="px-2 py-1 text-xs hover:bg-white rounded font-semibold">H2</button>
                  <button type="button" onClick={() => insertMarkdown('### ', '')} className="px-2 py-1 text-xs hover:bg-white rounded font-semibold">H3</button>
                  <span className="border-r border-gray-300 mx-1" />
                  <button type="button" onClick={() => insertMarkdown('**', '**')} className="px-2 py-1 text-xs hover:bg-white rounded font-bold">B</button>
                  <button type="button" onClick={() => insertMarkdown('*', '*')} className="px-2 py-1 text-xs hover:bg-white rounded italic">I</button>
                  <span className="border-r border-gray-300 mx-1" />
                  <button type="button" onClick={() => insertMarkdown('- ', '')} className="px-2 py-1 text-xs hover:bg-white rounded">• Liste</button>
                  <button type="button" onClick={() => insertMarkdown('1. ', '')} className="px-2 py-1 text-xs hover:bg-white rounded">1. Ordre</button>
                  <span className="border-r border-gray-300 mx-1" />
                  <button type="button" onClick={() => insertMarkdown('[', '](https://)')} className="px-2 py-1 text-xs hover:bg-white rounded">🔗 Lien</button>
                  <button
                    type="button"
                    onClick={() => inlineImageInputRef.current?.click()}
                    disabled={uploadingInline}
                    className="px-2 py-1 text-xs hover:bg-white rounded disabled:opacity-50"
                    title="Uploader une image dans l'article"
                  >
                    {uploadingInline ? '⏳ Upload...' : '🖼️ Image'}
                  </button>
                  <button type="button" onClick={() => insertMarkdown('![', '](https://)')} className="px-2 py-1 text-xs hover:bg-white rounded" title="Inserer une image depuis une URL externe">🔗🖼️ Image URL</button>
                  <input
                    ref={inlineImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleInlineImageUpload}
                  />
                  <button type="button" onClick={() => insertMarkdown('> ', '')} className="px-2 py-1 text-xs hover:bg-white rounded">❝ Citation</button>
                </div>
                <textarea
                  id="article-content"
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  rows={18}
                  className="w-full border border-gray-200 rounded-b-lg px-3 py-2 text-sm font-mono leading-relaxed"
                  placeholder={`## Mon premier titre\n\nUn paragraphe d'introduction.\n\n### Sous-titre\n\n- Premier point\n- Deuxieme point\n\n**Du texte gras** et *de l'italique*.`}
                />
              </div>
            </div>
          )}

          {/* Preview tab */}
          {tab === 'preview' && (
            <div className="space-y-6">
              {form.coverImage && (
                <div className="relative h-64 -mx-6 overflow-hidden">
                  <Image src={form.coverImage} alt={form.title} fill className="object-cover" sizes="100vw" />
                </div>
              )}
              <div className="max-w-3xl mx-auto">
                {form.categoryId && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                      {categories.find((c) => c.id === form.categoryId)?.icon} {categories.find((c) => c.id === form.categoryId)?.label}
                    </span>
                  </div>
                )}
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{form.title || 'Titre de l\'article'}</h1>
                {form.excerpt && <p className="text-lg text-gray-600 mb-6">{form.excerpt}</p>}
                <div className="text-xs text-gray-400 mb-8 pb-4 border-b border-gray-100">
                  ~{readingTimeEstimate} min de lecture · {wordCount} mots
                </div>
                <article className="article-prose">
                  {form.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">Le contenu apparaitra ici...</p>
                  )}
                </article>
              </div>
              <style jsx>{`
                .article-prose :global(h2) { font-size: 1.5rem; font-weight: 700; color: #000000; margin: 2rem 0 1rem; }
                .article-prose :global(h3) { font-size: 1.25rem; font-weight: 600; color: #000000; margin: 1.5rem 0 0.75rem; }
                .article-prose :global(p) { margin: 0 0 1.25rem; line-height: 1.75; color: #4B5563; }
                .article-prose :global(ul), .article-prose :global(ol) { margin: 0 0 1.25rem 1.5rem; }
                .article-prose :global(ul) { list-style: disc; }
                .article-prose :global(ol) { list-style: decimal; }
                .article-prose :global(li) { margin: 0.25rem 0; line-height: 1.7; color: #4B5563; }
                .article-prose :global(strong) { font-weight: 700; color: #000000; }
                .article-prose :global(em) { font-style: italic; }
                .article-prose :global(a) { color: #2C5F2D; text-decoration: underline; }
                .article-prose :global(blockquote) { border-left: 4px solid #D4A574; padding: 0.5rem 1rem; margin: 1.5rem 0; color: #6B7280; font-style: italic; background: #F5F1E8; }
                .article-prose :global(img) { max-width: 100%; border-radius: 0.5rem; margin: 1.5rem 0; }
                .article-prose :global(code) { background: #F3F4F6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; }
              `}</style>
            </div>
          )}

          {/* SEO tab */}
          {tab === 'seo' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                💡 Une bonne meta-description et un meta-title bien rediges aident Google a mieux referencer ton article.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta titre</label>
                <input value={form.metaTitle || ''} onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={form.title || 'Titre pour Google (60 car. max)'} />
                <p className="text-xs text-gray-400 mt-1">{(form.metaTitle || '').length}/60 caracteres</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta description</label>
                <textarea value={form.metaDescription || ''} onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                  rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={form.excerpt || 'Description pour Google (160 car. max)'} />
                <p className="text-xs text-gray-400 mt-1">{(form.metaDescription || '').length}/160 caracteres</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mots-cles (separes par des virgules)</label>
                <input value={form.metaKeywords || ''} onChange={(e) => setForm((prev) => ({ ...prev, metaKeywords: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="bois cuisine, choisir bois, chene, hetre" />
              </div>

              {/* SERP preview */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <p className="text-xs text-gray-500 mb-2">Apercu Google :</p>
                <p className="text-xs text-green-700 truncate">auformat.com › blog › {form.slug || 'mon-article'}</p>
                <p className="text-base text-blue-700 hover:underline cursor-pointer mt-1 truncate">{form.metaTitle || form.title || 'Titre de l\'article'}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{form.metaDescription || form.excerpt || 'Description de l\'article...'}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium disabled:opacity-50">
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
