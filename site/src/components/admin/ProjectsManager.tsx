import { useState } from 'react';

export type AdminProject = {
  id: string;
  name: string;
  location: string;
  category: string;
  material: string;
  product: string;
  application: string;
  imagePath: string;
  altText: string;
  isPublished: boolean;
  sortOrder: number;
};

type Props = {
  initial: AdminProject[];
  categories: readonly string[];
  slotOptions: { id: string; title: string }[];
};

const blank = (sortOrder: number): AdminProject => ({
  id: '',
  // The brief's rule: never invent a project name or location. New rows start
  // at the approved placeholders and stay unpublished until edited.
  name: 'Project Name — Coming Soon',
  location: 'Location — Coming Soon',
  category: 'Commercial',
  material: '',
  product: '',
  application: '',
  imagePath: '',
  altText: '',
  isPublished: false,
  sortOrder,
});

export default function ProjectsManager({ initial, categories, slotOptions }: Props) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<AdminProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(project: AdminProject) {
    setBusy(true);
    setError(null);
    const isNew = !project.id;

    try {
      const res = await fetch('/api/admin/projects', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(project),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Could not save.');

      const saved = { ...project, id: project.id || body.id! };
      setRows((prev) =>
        isNew
          ? [...prev, saved].sort((a, b) => a.sortOrder - b.sortOrder)
          : prev.map((r) => (r.id === saved.id ? saved : r)),
      );
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/projects?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Could not delete.');
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  }

  const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 10 : 10;

  return (
    <>
      <div className="al-toolbar">
        <button
          type="button"
          className="al-admin__btn"
          onClick={() => setEditing(blank(nextOrder))}
          disabled={busy}
        >
          + Add project
        </button>
        <span className="al-toolbar__note">
          {rows.filter((r) => r.isPublished).length} published · {rows.length} total
        </span>
      </div>

      {error && <div className="al-admin-error" role="alert">{error}</div>}

      <div className="al-table">
        <div className="al-table__head al-table__head--proj">
          <span>Project</span>
          <span>Category</span>
          <span>Detail</span>
          <span>Order</span>
          <span>Status</span>
        </div>

        {rows.map((r) => (
          <div className="al-table__row al-table__row--proj" key={r.id}>
            <div>
              <div className="al-cell__name">{r.name}</div>
              <div className="al-cell__sub">{r.location}</div>
              {r.imagePath && <div className="al-cell__ref">{r.imagePath}</div>}
            </div>
            <div className="al-cell__strong">{r.category}</div>
            <div className="al-cell__sub">
              {[r.material, r.product, r.application].filter(Boolean).join(' · ') || '—'}
            </div>
            <div className="al-cell__strong">{r.sortOrder}</div>
            <div className="al-cell__actions">
              <span className={`al-badge${r.isPublished ? ' is-on' : ''}`}>
                {r.isPublished ? 'Published' : 'Draft'}
              </span>
              <button type="button" className="al-cell__archive" onClick={() => setEditing(r)}>
                Edit
              </button>
              <button
                type="button"
                className="al-cell__archive"
                onClick={() => remove(r.id, r.name)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && <div className="al-table__none">No projects yet.</div>}
      </div>

      {editing && (
        <div className="al-modal" role="dialog" aria-modal="true" aria-label="Edit project">
          <div className="al-modal__panel">
            <h2 className="al-modal__title">{editing.id ? 'Edit project' : 'New project'}</h2>

            <div className="al-modal__grid">
              <label>
                <span>Project name</span>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
              <label>
                <span>Location</span>
                <input
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Material</span>
                <input
                  value={editing.material}
                  placeholder="GFRC / FRP"
                  onChange={(e) => setEditing({ ...editing, material: e.target.value })}
                />
              </label>
              <label>
                <span>Product</span>
                <input
                  value={editing.product}
                  placeholder="Facade panels"
                  onChange={(e) => setEditing({ ...editing, product: e.target.value })}
                />
              </label>
              <label>
                <span>Application</span>
                <input
                  value={editing.application}
                  placeholder="Building envelope"
                  onChange={(e) => setEditing({ ...editing, application: e.target.value })}
                />
              </label>
              <label>
                <span>Image placement</span>
                <select
                  value={editing.imagePath}
                  onChange={(e) => setEditing({ ...editing, imagePath: e.target.value })}
                >
                  <option value="">No image</option>
                  {slotOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.id})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sort order</span>
                <input
                  type="number"
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>

            <label className="al-modal__wide">
              <span>Image description (alt text)</span>
              <input
                value={editing.altText}
                onChange={(e) => setEditing({ ...editing, altText: e.target.value })}
              />
            </label>

            <label className="al-modal__check">
              <input
                type="checkbox"
                checked={editing.isPublished}
                onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
              />
              <span>Published — visible on the public site</span>
            </label>

            {editing.name.includes('Coming Soon') && editing.isPublished && (
              <p className="al-modal__warn">
                This will publish with the placeholder name. That is allowed, but replace it with a
                real project name once the client approves one.
              </p>
            )}

            <div className="al-modal__actions">
              <button
                type="button"
                className="al-admin__btn"
                onClick={() => save(editing)}
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="al-cell__archive"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
