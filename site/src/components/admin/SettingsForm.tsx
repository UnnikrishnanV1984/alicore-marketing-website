import { useState } from 'react';

export type AdminSettings = {
  phoneDisplay: string;
  phoneE164: string;
  whatsappE164: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  notifyEmails: string;
};

type Field = {
  key: keyof AdminSettings;
  label: string;
  hint: string;
  placeholder: string;
  type?: string;
};

const CONTACT: Field[] = [
  { key: 'phoneDisplay', label: 'Phone — as displayed', hint: 'How the number reads on the site.', placeholder: '9995 495 395' },
  { key: 'phoneE164', label: 'Phone — dialling format', hint: 'What the Call button dials. International format.', placeholder: '+919995495395', type: 'tel' },
  { key: 'whatsappE164', label: 'WhatsApp number', hint: 'Digits only, country code first, no plus sign.', placeholder: '919995495395' },
  { key: 'email', label: 'Public email address', hint: 'Shown in the footer and the Contact panel. Blank shows [ADD EMAIL].', placeholder: 'info@alicore.in', type: 'email' },
  { key: 'address', label: 'Postal address', hint: 'Shown in the footer. Blank shows [ADD ADDRESS].', placeholder: 'Street, city, state, PIN' },
];

const SOCIAL: Field[] = [
  { key: 'instagram', label: 'Instagram', hint: '', placeholder: 'https://instagram.com/…', type: 'url' },
  { key: 'facebook', label: 'Facebook', hint: '', placeholder: 'https://facebook.com/…', type: 'url' },
  { key: 'linkedin', label: 'LinkedIn', hint: '', placeholder: 'https://linkedin.com/company/…', type: 'url' },
  { key: 'youtube', label: 'YouTube', hint: '', placeholder: 'https://youtube.com/@…', type: 'url' },
];

export default function SettingsForm({ initial }: { initial: AdminSettings }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badField, setBadField] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = (key: keyof AdminSettings, v: string) => {
    setValues((p) => ({ ...p, [key]: v }));
    setNotice(null);
  };

  const dirty = (Object.keys(values) as (keyof AdminSettings)[]).some(
    (k) => values[k] !== saved[k],
  );
  // Everything except the alert recipients is baked into the pages at build.
  const needsRebuild = (Object.keys(values) as (keyof AdminSettings)[]).some(
    (k) => k !== 'notifyEmails' && values[k] !== saved[k],
  );

  async function save() {
    setBusy(true);
    setError(null);
    setBadField(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; field?: string };
      if (!res.ok) {
        setBadField(body.field ?? null);
        throw new Error(body.error ?? 'Could not save.');
      }
      const rebuild = needsRebuild;
      setSaved(values);
      setNotice(
        rebuild
          ? 'Saved. These values are built into the pages, so press Publish to put them on the live site.'
          : 'Saved. Alert recipients take effect immediately — no rebuild needed.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/publish', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Could not start the rebuild.');
      setNotice('Rebuild started. The live site updates in about a minute.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the rebuild.');
    } finally {
      setPublishing(false);
    }
  }

  const renderField = (f: Field) => (
    <label className="al-set__field" key={f.key}>
      <span className="al-set__label">{f.label}</span>
      <input
        type={f.type ?? 'text'}
        value={values[f.key]}
        placeholder={f.placeholder}
        aria-invalid={badField === f.key ? true : undefined}
        onChange={(e) => set(f.key, e.target.value)}
      />
      {f.hint && <span className="al-set__hint">{f.hint}</span>}
    </label>
  );

  return (
    <>
      {error && (
        <div className="al-admin-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="al-set__notice" role="status">
          {notice}
        </div>
      )}

      <section className="al-set__group">
        <div className="al-set__grouphead">
          <h2>Contact details</h2>
          <span className="al-set__flag">Built into the pages — needs Publish</span>
        </div>
        <div className="al-set__grid">{CONTACT.map(renderField)}</div>
      </section>

      <section className="al-set__group">
        <div className="al-set__grouphead">
          <h2>Social profiles</h2>
          <span className="al-set__flag">Built into the pages — needs Publish</span>
        </div>
        <p className="al-set__note">
          Leave one blank and its name still appears in the footer, as plain text rather than a link
          that goes nowhere.
        </p>
        <div className="al-set__grid">{SOCIAL.map(renderField)}</div>
      </section>

      <section className="al-set__group">
        <div className="al-set__grouphead">
          <h2>Enquiry alerts</h2>
          <span className="al-set__flag is-live">Takes effect immediately</span>
        </div>
        <div className="al-set__grid">
          <label className="al-set__field al-set__field--wide">
            <span className="al-set__label">Send new enquiries to</span>
            <input
              type="text"
              value={values.notifyEmails}
              placeholder="sales@alicore.in, projects@alicore.in"
              aria-invalid={badField === 'notifyEmails' ? true : undefined}
              onChange={(e) => set('notifyEmails', e.target.value)}
            />
            <span className="al-set__hint">
              Separate multiple addresses with commas. Read when an enquiry arrives, so a change
              here applies to the very next one.
            </span>
          </label>
        </div>
      </section>

      <div className="al-toolbar">
        <button type="button" className="al-admin__btn" onClick={save} disabled={busy || !dirty}>
          {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
        <button
          type="button"
          className="al-admin__btn"
          onClick={publish}
          disabled={publishing || dirty}
          title={dirty ? 'Save your changes first' : 'Rebuild the public site'}
        >
          {publishing ? 'Starting…' : 'Publish to the live site'}
        </button>
        <span className="al-toolbar__note">
          {dirty ? 'Unsaved changes.' : 'All changes saved.'}
        </span>
      </div>
    </>
  );
}
