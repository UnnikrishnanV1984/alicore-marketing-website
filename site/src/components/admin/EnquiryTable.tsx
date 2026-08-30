import { useMemo, useState } from 'react';

export type AdminEnquiry = {
  id: string;
  ref: string;
  createdAt: string;
  name: string;
  company: string | null;
  phone: string;
  email: string;
  location: string | null;
  product: string | null;
  quantity: string | null;
  message: string | null;
  status: string;
  internalNote: string | null;
};

const STATUSES = ['new', 'contacted', 'quoted', 'closed'] as const;
const DAY = 86_400_000;

const fmtDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const fmtTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function ageLabel(from: Date, now: number): string {
  const days = Math.floor((now - from.getTime()) / DAY);
  if (days >= 1) return `${days} ${days === 1 ? 'day' : 'days'}`;
  const hours = Math.floor((now - from.getTime()) / 3_600_000);
  if (hours >= 1) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return 'Just now';
}

export default function EnquiryTable({ initial }: { initial: AdminEnquiry[] }) {
  const [rows, setRows] = useState(initial);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = Date.now();

  const visible = useMemo(
    () => rows.filter((r) => (showArchived ? r.status === 'archived' : r.status !== 'archived')),
    [rows, showArchived],
  );

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status !== 'archived');
    const ages = open.map((r) => Math.floor((now - new Date(r.createdAt).getTime()) / DAY));
    const oldest = ages.length ? Math.max(...ages) : 0;
    return {
      total: open.length,
      recent: ages.filter((a) => a <= 7).length,
      oldest: oldest >= 1 ? `${oldest}d` : open.length ? '<1d' : '—',
    };
  }, [rows, now]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/enquiries', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? 'Update failed.');
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...(body.status ? { status: String(body.status) } : {}),
                ...(body.internalNote !== undefined
                  ? { internalNote: String(body.internalNote) }
                  : {}),
              }
            : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy(null);
    }
  }

  /** Real file download, not the prototype's clipboard copy. */
  function downloadCsv() {
    const header = [
      'Reference', 'Submitted', 'Days old', 'Status', 'Name', 'Company', 'Phone',
      'Email', 'Location', 'Quantity', 'Requirement', 'Message', 'Internal note',
    ];
    const body = visible.map((r) => {
      const d = new Date(r.createdAt);
      return [
        r.ref, d.toISOString(), String(Math.floor((now - d.getTime()) / DAY)), r.status,
        r.name, r.company ?? '', r.phone, r.email, r.location ?? '', r.quantity ?? '',
        r.product ?? '', (r.message ?? '').replace(/\s+/g, ' '), (r.internalNote ?? '').replace(/\s+/g, ' '),
      ];
    });
    const csv = [header, ...body]
      .map((cols) => cols.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `alicore-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="al-empty">
        <div className="al-empty__eyebrow">No enquiries yet</div>
        <h2 className="al-empty__title">Nothing in the queue.</h2>
        <p className="al-empty__body">
          Submissions from the website's Request a Quote form will appear here with their submission
          time and age.
        </p>
        <a className="al-admin__btn" href="/contact">
          Open the form
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="al-stats">
        <div className="al-stat">
          <div className="al-stat__k">Total</div>
          <div className="al-stat__v">{stats.total}</div>
        </div>
        <div className="al-stat">
          <div className="al-stat__k">Last 7 days</div>
          <div className="al-stat__v is-gold">{stats.recent}</div>
        </div>
        <div className="al-stat">
          <div className="al-stat__k">Oldest open</div>
          <div className="al-stat__v">{stats.oldest}</div>
        </div>
      </div>

      {error && <div className="al-admin-error" role="alert">{error}</div>}

      <div className="al-table">
        <div className="al-table__head">
          <span>Contact</span>
          <span>Project</span>
          <span>Requirement</span>
          <span>Submitted</span>
          <span>Status</span>
        </div>

        {visible.map((r) => {
          const created = new Date(r.createdAt);
          const days = Math.floor((now - created.getTime()) / DAY);
          const hot = days >= 3 && r.status === 'new';

          return (
            <div className="al-table__row" key={r.id}>
              <div>
                <div className="al-cell__name">{r.name}</div>
                {r.company && <div className="al-cell__sub">{r.company}</div>}
                <div className="al-cell__sub">
                  <a href={`tel:${r.phone}`}>{r.phone}</a>
                </div>
                <div className="al-cell__sub">
                  <a href={`mailto:${r.email}`}>{r.email}</a>
                </div>
              </div>

              <div>
                <div className="al-cell__strong">{r.location || 'Location not given'}</div>
                {r.quantity && <div className="al-cell__sub">Qty — {r.quantity}</div>}
                <div className="al-cell__ref">{r.ref}</div>
              </div>

              <div>
                <div className="al-cell__product">{r.product || '—'}</div>
                {r.message && <div className="al-cell__msg">{r.message}</div>}
                <textarea
                  className="al-cell__note"
                  defaultValue={r.internalNote ?? ''}
                  placeholder="Internal note…"
                  rows={2}
                  onBlur={(e) => {
                    if (e.target.value !== (r.internalNote ?? '')) {
                      patch(r.id, { internalNote: e.target.value });
                    }
                  }}
                />
              </div>

              <div>
                <div className="al-cell__strong">{fmtDate.format(created)}</div>
                <div className="al-cell__ref">{fmtTime.format(created)} hrs</div>
                <div className={`al-age${hot ? ' is-hot' : ''}`}>{ageLabel(created, now)}</div>
              </div>

              <div className="al-cell__actions">
                <select
                  value={r.status}
                  disabled={busy === r.id}
                  onChange={(e) => patch(r.id, { status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                  {r.status === 'archived' && <option value="archived">Archived</option>}
                </select>

                {/* Archive, never delete. The mockup's "Clear all" would wipe
                    live customer leads with no undo. */}
                <button
                  type="button"
                  className="al-cell__archive"
                  disabled={busy === r.id}
                  onClick={() =>
                    patch(r.id, { status: r.status === 'archived' ? 'new' : 'archived' })
                  }
                >
                  {r.status === 'archived' ? 'Restore' : 'Archive'}
                </button>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="al-table__none">
            {showArchived ? 'Nothing archived.' : 'No open enquiries.'}
          </div>
        )}
      </div>

      <div className="al-toolbar">
        <button type="button" className="al-admin__btn" onClick={() => location.reload()}>
          Refresh
        </button>
        <button type="button" className="al-admin__btn" onClick={downloadCsv}>
          Download CSV
        </button>
        <button
          type="button"
          className="al-admin__btn"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? 'Show open' : 'Show archived'}
        </button>
      </div>
    </>
  );
}
