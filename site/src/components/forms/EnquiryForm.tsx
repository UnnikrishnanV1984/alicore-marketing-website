import { useEffect, useRef, useState } from 'react';
import { enquirySchema } from '../../lib/schema';
import { productOptions } from '../../content/products';

type Props = {
  turnstileSiteKey?: string;
  whatsappHref: string;
  phoneHref: string;
  phoneDisplay: string;
};

type FieldErrors = Partial<Record<string, string>>;
type Status = 'idle' | 'submitting' | 'sent' | 'error';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

const FIELDS = [
  { id: 'name', label: 'Name', required: true, placeholder: 'Full name', type: 'text', autoComplete: 'name' },
  { id: 'company', label: 'Company', required: false, placeholder: 'Firm / company', type: 'text', autoComplete: 'organization' },
  { id: 'phone', label: 'Phone', required: true, placeholder: 'Mobile number', type: 'tel', autoComplete: 'tel' },
  { id: 'email', label: 'Email', required: true, placeholder: 'name@company.com', type: 'email', autoComplete: 'email' },
  { id: 'location', label: 'Project Location', required: false, placeholder: 'City / site', type: 'text', autoComplete: 'address-level2' },
  { id: 'quantity', label: 'Estimated Quantity', required: false, placeholder: 'sq.ft / nos.', type: 'text', autoComplete: 'off' },
] as const;

/**
 * Quote enquiry form.
 *
 * There is deliberately no file upload: the mockup has none, and routes
 * drawings to WhatsApp instead ("Have drawings or reference images? Send them
 * to us on WhatsApp"). The requirements brief does list an upload field, but
 * the client chose the mockup's approach.
 */
export default function EnquiryForm({
  turnstileSiteKey,
  whatsappHref,
  phoneHref,
  phoneDisplay,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Turnstile. Skipped entirely when no site key is configured so the form
  // still works in local development.
  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return;

    const render = () => {
      if (!window.turnstile || !turnstileRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'light',
        action: 'enquiry',
      });
    };

    if (window.turnstile) {
      render();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  // Announce the outcome to assistive tech.
  useEffect(() => {
    if (status === 'sent' || status === 'error') statusRef.current?.focus();
  }, [status]);

  function readForm() {
    const fd = new FormData(formRef.current!);
    return {
      name: String(fd.get('name') ?? '').trim(),
      company: String(fd.get('company') ?? '').trim(),
      phone: String(fd.get('phone') ?? '').trim(),
      email: String(fd.get('email') ?? '').trim(),
      location: String(fd.get('location') ?? '').trim(),
      product: String(fd.get('product') ?? '').trim(),
      quantity: String(fd.get('quantity') ?? '').trim(),
      message: String(fd.get('message') ?? '').trim(),
      website: String(fd.get('website') ?? ''),
    };
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setErrors({});

    const parsed = enquirySchema.safeParse({ ...readForm(), turnstileToken: '' });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      // Move focus to the first field with a problem.
      const firstKey = Object.keys(next)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`)?.focus();
      return;
    }

    try {
      setStatus('submitting');
      const token =
        formRef.current?.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value ??
        '';

      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, turnstileToken: token }),
      });

      const body = (await res.json().catch(() => ({}))) as { ref?: string; error?: string };
      if (!res.ok) throw new Error(body.error || 'We could not submit your enquiry.');

      setReference(body.ref ?? null);
      setStatus('sent');
      formRef.current?.reset();
    } catch (err) {
      // Fail loudly. A silently dropped lead is the worst outcome here, so we
      // surface the error AND the direct contact routes.
      setFormError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
      if (window.turnstile && widgetId.current) window.turnstile.reset(widgetId.current);
    }
  }

  /* --- success panel ---------------------------------------------------- */
  if (status === 'sent') {
    return (
      <div className="al-form" ref={statusRef} tabIndex={-1} role="status">
        <div className="al-form__done">
          <div className="al-form__done-eyebrow">Enquiry Received</div>
          <h3 className="al-form__done-title">Thank you.</h3>
          <p className="al-form__done-body">
            Our team will review your requirement and respond with the right manufacturing
            approach.
          </p>
          {reference && <p className="al-form__ref">Your reference — {reference}</p>}
          <button
            type="button"
            className="al-form__again"
            onClick={() => {
              setStatus('idle');
              setReference(null);
            }}
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  const busy = status === 'submitting';

  return (
    <div className="al-form">
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <h3 className="al-form__title">Request a Quote</h3>

        <div className="al-form__grid">
          {FIELDS.map((f) => (
            <label key={f.id} className="al-field">
              <span className="al-field__label">
                {f.label} {f.required && <abbr title="required">*</abbr>}
              </span>
              <input
                name={f.id}
                type={f.type}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete}
                aria-invalid={errors[f.id] ? true : undefined}
                aria-describedby={errors[f.id] ? `err-${f.id}` : undefined}
              />
              {errors[f.id] && (
                <span className="al-field__err" id={`err-${f.id}`}>
                  {errors[f.id]}
                </span>
              )}
            </label>
          ))}
        </div>

        <label className="al-field al-field--wide">
          <span className="al-field__label">Product / Requirement</span>
          <select name="product" defaultValue={productOptions[0]}>
            {productOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <label className="al-field al-field--wide">
          <span className="al-field__label">Message</span>
          <textarea name="message" rows={3} placeholder="Scope, timeline, finish, references…" />
        </label>

        {/* Honeypot. Real people never see or fill this. */}
        <div className="al-hp" aria-hidden="true">
          <label>
            Website
            <input name="website" type="text" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="al-form__note">
          <span className="al-form__note-mark" aria-hidden="true" />
          <span>
            Have drawings or reference images? Send them to us on{' '}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>{' '}
            and we'll match them to your enquiry.
          </span>
        </div>

        {turnstileSiteKey && <div ref={turnstileRef} className="al-form__turnstile" />}

        {formError && (
          <div className="al-form__error" ref={statusRef} tabIndex={-1} role="alert">
            <strong>{formError}</strong>
            <span>
              Your enquiry was not saved. Please{' '}
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                message us on WhatsApp
              </a>{' '}
              or call <a href={phoneHref}>{phoneDisplay}</a> so it doesn't get lost.
            </span>
          </div>
        )}

        <button type="submit" className="al-form__submit" disabled={busy}>
          {busy ? 'Sending…' : 'Request a Quote'}
        </button>

        <p className="al-form__foot">
          Prefer to talk? Call <a href={phoneHref}>{phoneDisplay}</a> or message us on WhatsApp — we
          respond to project enquiries the same working day.
        </p>
      </form>
    </div>
  );
}
