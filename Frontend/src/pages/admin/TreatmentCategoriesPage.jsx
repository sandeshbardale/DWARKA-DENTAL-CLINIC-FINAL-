import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, ToggleLeft, ToggleRight, RefreshCw, Search, Tag, Users } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../utils/api';

function CategoryModal({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(initial || { name: '', code: '', defaultDurationMinutes: 30, defaultFollowUpDays: 30, isActive: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card p-5 sm:p-6 w-full max-w-md space-y-4 rounded-t-2xl sm:rounded-2xl max-h-[90svh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto sm:hidden" aria-hidden="true" />
        <h3 className="font-semibold text-[var(--color-text)]">{initial ? 'Edit Category' : 'New Treatment Category'}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Category Name *</label>
            <input className="form-input mt-1 w-full" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Root Canal Treatment" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)]">Code * (auto-uppercased)</label>
            <input className="form-input mt-1 w-full font-mono uppercase" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. RCT" maxLength={10} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Duration (minutes)</label>
              <input type="number" min={5} max={480} className="form-input mt-1 w-full" value={form.defaultDurationMinutes} onChange={e => set('defaultDurationMinutes', Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Follow-up (days, 0=none)</label>
              <input type="number" min={0} max={365} className="form-input mt-1 w-full" value={form.defaultFollowUpDays} onChange={e => set('defaultFollowUpDays', Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="catActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4" />
            <label htmlFor="catActive" className="text-sm">Active</label>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button onClick={onClose} className="btn btn-outline btn-sm" disabled={saving}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.code} className="btn btn-primary btn-sm justify-center">
            {saving ? 'Saving…' : (initial ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TreatmentCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getCategories({ search, status: statusFilter });
      setCategories(res.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function handleSave(form) {
    setSaving(true);
    try {
      if (editTarget) await api.updateCategory(editTarget.id, form);
      else await api.createCategory(form);
      setShowModal(false); setEditTarget(null);
      fetchCategories();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(cat) {
    try {
      await api.toggleCategory(cat.id, !cat.isActive);
      fetchCategories();
    } catch (err) { alert(err.message); }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Treatment Categories</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{categories.length} categories</p>
        </div>
        <button onClick={() => { setEditTarget(null); setShowModal(true); }} className="btn btn-primary btn-sm flex items-center gap-1.5">
          <Plus size={15} /> New Category
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 bg-[var(--color-bg-subtle)] px-3 py-2 rounded-lg" style={{ minWidth: 'min(100%, 180px)' }}>
          <Search size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
          <input
            type="search" placeholder="Search categories…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none text-[var(--color-text)] min-w-0"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="form-select text-sm flex-1 sm:flex-none" style={{ minWidth: '120px', maxWidth: '160px' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={fetchCategories} className="btn btn-outline btn-sm flex items-center gap-1 flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="card p-3 border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
              <tr>
                {['Code', 'Name', 'Duration', 'Follow-up', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--color-border)] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <EmptyState icon={Tag} title="No categories found" description="Create your first treatment category." />
                </td></tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)] ${!cat.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--color-primary-600)] bg-[var(--color-primary-50)] w-fit">{cat.code}</td>
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{cat.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{cat.defaultDurationMinutes} min</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{cat.defaultFollowUpDays === 0 ? 'None' : `${cat.defaultFollowUpDays} days`}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cat.isActive ? 'badge-green' : 'badge-gray'}`}>{cat.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/patients?categoryId=${cat.id}`} className="btn btn-outline btn-xs flex items-center gap-1 text-[var(--color-primary-600)]">
                          <Users size={12} /> View Patients
                        </Link>
                        <button onClick={() => { setEditTarget(cat); setShowModal(true); }} className="btn btn-outline btn-xs flex items-center gap-1">
                          <Edit3 size={12} /> Edit
                        </button>
                        <button onClick={() => handleToggle(cat)} className="btn btn-outline btn-xs flex items-center gap-1">
                          {cat.isActive ? <ToggleRight size={14} className="text-emerald-500" /> : <ToggleLeft size={14} />}
                          {cat.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <CategoryModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
