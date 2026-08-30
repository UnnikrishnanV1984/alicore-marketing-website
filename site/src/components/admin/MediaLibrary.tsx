import { useState } from 'react';

export type AdminSlot = {
  id: string;
  groupTitle: string;
  title: string;
  placeholder: string;
  hasImage: boolean;
  altText: string;
  previewUrl: string | null;
};

const WIDTHS = [640, 1280, 2000] as const;

/**
 * Resize and encode in the browser.
 *
 * `sharp` cannot run in a Workers isolate (native addon, no Node runtime), so
 * the three responsive widths are produced here with canvas and handed to the
 * server ready to store. Zero server CPU, and it keeps the whole pipeline
 * inside the free tier.
 */
async function makeVariants(file: File): Promise<{ blobs: Map<number, Blob>; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  const blobs = new Map<number, Blob>();

  for (const target of WIDTHS) {
    // Never upscale: a 900px original should not be stored as a 2000px file.
    const width = Math.min(target, bitmap.width);
    const height = Math.round((width / bitmap.width) * bitmap.height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable in this browser.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.82),
    );
    if (!blob) throw new Error('Could not encode the image.');
    blobs.set(target, blob);
  }

  const result = { blobs, w: bitmap.width, h: bitmap.height };
  bitmap.close();
  return result;
}

export default function MediaLibrary({ slots }: { slots: AdminSlot[] }) {
  const [state, setState] = useState(slots);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const groups = Array.from(new Set(state.map((s) => s.groupTitle)));

  async function upload(slot: AdminSlot, file: File) {
    if (!file.type.startsWith('image/')) {
      setError('That is not an image file.');
      return;
    }
    setBusy(slot.id);
    setError(null);

    try {
      const { blobs, w, h } = await makeVariants(file);

      const form = new FormData();
      form.append('slotId', slot.id);
      form.append('altText', slot.altText || '');
      form.append('width', String(w));
      form.append('height', String(h));
      for (const [width, blob] of blobs) {
        form.append(`variant_${width}`, blob, `${width}.webp`);
      }

      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? 'Upload failed.');
      }

      const preview = URL.createObjectURL(blobs.get(640)!);
      setState((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, hasImage: true, previewUrl: preview } : s)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(null);
    }
  }

  async function saveAlt(slotId: string, altText: string) {
    setState((prev) => prev.map((s) => (s.id === slotId ? { ...s, altText } : s)));
    try {
      await fetch('/api/admin/media', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slotId, altText }),
      });
    } catch {
      setError('Could not save the description.');
    }
  }

  const filled = state.filter((s) => s.hasImage).length;

  return (
    <>
      <div className="al-media__progress">
        <strong>{filled}</strong> of <strong>{state.length}</strong> placements have a photograph.
        {filled < state.length && ' Empty slots show an art-direction note on the live site.'}
      </div>

      {error && <div className="al-admin-error" role="alert">{error}</div>}

      {groups.map((group) => (
        <section className="al-media__group" key={group}>
          <div className="al-media__grouphead">
            <h2>{group}</h2>
            <span>{state.filter((s) => s.groupTitle === group && s.hasImage).length} / {state.filter((s) => s.groupTitle === group).length} filled</span>
          </div>

          <div className="al-media__grid">
            {state
              .filter((s) => s.groupTitle === group)
              .map((slot) => (
                <div className="al-media__item" key={slot.id}>
                  <label
                    className={`al-media__drop${dragging === slot.id ? ' is-dragging' : ''}${
                      busy === slot.id ? ' is-busy' : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(slot.id);
                    }}
                    onDragLeave={() => setDragging(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(null);
                      const f = e.dataTransfer.files?.[0];
                      if (f) upload(slot, f);
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) upload(slot, f);
                        e.target.value = '';
                      }}
                    />
                    {slot.previewUrl ? (
                      <img src={slot.previewUrl} alt="" />
                    ) : (
                      <span className="al-media__note">{slot.placeholder}</span>
                    )}
                    {busy === slot.id && <span className="al-media__busy">Processing…</span>}
                  </label>

                  <div className="al-media__title">{slot.title}</div>
                  <div className="al-media__id">{slot.id}</div>

                  <input
                    className="al-media__alt"
                    defaultValue={slot.altText}
                    placeholder="Describe this image (for accessibility and SEO)"
                    onBlur={(e) => {
                      if (e.target.value !== slot.altText) saveAlt(slot.id, e.target.value);
                    }}
                  />
                </div>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
