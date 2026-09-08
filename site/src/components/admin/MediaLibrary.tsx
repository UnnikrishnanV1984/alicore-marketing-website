import { useRef, useState } from 'react';

export type AdminSlotImage = {
  position: number;
  hasImage: boolean;
  altText: string;
  previewUrl: string | null;
  /** Friendly name for a split-layout position, e.g. "Left", where "Photo N" would be confusing. */
  label?: string;
};

export type AdminSlot = {
  id: string;
  groupTitle: string;
  title: string;
  placeholder: string;
  /** One entry for a single-image slot; up to 5 for a Products-group slot. */
  images: AdminSlotImage[];
  /** Set only for a Projects-group slot backed by a row in `projects`. */
  project: { id: string; isPublished: boolean } | null;
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

function updateImage(
  slots: AdminSlot[],
  slotId: string,
  position: number,
  patch: Partial<AdminSlotImage>,
): AdminSlot[] {
  return slots.map((s) =>
    s.id !== slotId
      ? s
      : {
          ...s,
          images: s.images.map((img) => (img.position === position ? { ...img, ...patch } : img)),
        },
  );
}

export default function MediaLibrary({ slots }: { slots: AdminSlot[] }) {
  const [state, setState] = useState(slots);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /**
   * A slot that goes from empty to filled changes the page's STRUCTURE -- an
   * <img> replaces the art-direction block -- so it only reaches the public
   * site after a rebuild. Replacing an existing photograph does not: the paths
   * are stable, so the upload alone is enough.
   *
   * Without this flag the first upload is silent: the tile updates, the site
   * does not, and there is nothing on screen to explain the gap.
   */
  const [needsPublish, setNeedsPublish] = useState(false);

  const groups = Array.from(new Set(state.map((s) => s.groupTitle)));
  const busyKey = (slotId: string, position: number) => `${slotId}:${position}`;

  /**
   * A second upload landing on the same placement before the first has
   * finished doesn't just show a flicker -- both write to the same stable
   * storage path, so whichever finishes last silently overwrites the other.
   * That is how a good, full-resolution photograph got clobbered by a stray
   * duplicate drop/select once in production. `busy` (React state) isn't
   * enough to prevent it: two calls fired back-to-back both read `busy` as
   * null before either state update commits. This ref is a synchronous lock
   * that the second call sees immediately.
   */
  const uploading = useRef(new Set<string>());

  async function upload(slot: AdminSlot, image: AdminSlotImage, file: File) {
    if (!file.type.startsWith('image/')) {
      setError('That is not an image file.');
      return;
    }
    const key = busyKey(slot.id, image.position);
    if (uploading.current.has(key)) return;
    uploading.current.add(key);
    setBusy(key);
    setError(null);

    try {
      const { blobs, w, h } = await makeVariants(file);

      const form = new FormData();
      form.append('slotId', slot.id);
      form.append('position', String(image.position));
      form.append('altText', image.altText || '');
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
      const wasEmpty = !image.hasImage;
      setState((prev) => updateImage(prev, slot.id, image.position, { hasImage: true, previewUrl: preview }));

      if (wasEmpty) {
        setNeedsPublish(true);
        setNotice(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      uploading.current.delete(key);
      setBusy(null);
    }
  }

  async function removeImage(slot: AdminSlot, image: AdminSlotImage) {
    const key = busyKey(slot.id, image.position);
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/media?slotId=${encodeURIComponent(slot.id)}&position=${image.position}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? 'Could not remove the photograph.');
      }
      setState((prev) => updateImage(prev, slot.id, image.position, { hasImage: false, previewUrl: null }));
      setNeedsPublish(true);
      setNotice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the photograph.');
    } finally {
      setBusy(null);
    }
  }

  async function toggleProjectVisibility(slot: AdminSlot) {
    if (!slot.project) return;
    const next = !slot.project.isPublished;
    const key = `project:${slot.project.id}`;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch('/api/admin/project-visibility', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: slot.project.id, isPublished: next }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? 'Could not change visibility.');
      }
      setState((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, project: { ...s.project!, isPublished: next } } : s)),
      );
      // The standalone /projects page is server-rendered and picks this up
      // immediately, but the home page's Projects section is prerendered --
      // same asymmetry as everywhere else a rebuild-required change meets a
      // live one.
      setNeedsPublish(true);
      setNotice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change visibility.');
    } finally {
      setBusy(null);
    }
  }

  async function saveAlt(slotId: string, position: number, altText: string) {
    setState((prev) => updateImage(prev, slotId, position, { altText }));
    try {
      await fetch('/api/admin/media', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slotId, position, altText }),
      });
    } catch {
      setError('Could not save the description.');
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
      setNeedsPublish(false);
      setNotice('Rebuild started. The new photographs appear on the site in about a minute.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the rebuild.');
    } finally {
      setPublishing(false);
    }
  }

  const totalPlacements = state.reduce((n, s) => n + s.images.length, 0);
  const filledPlacements = state.reduce((n, s) => n + s.images.filter((i) => i.hasImage).length, 0);

  return (
    <>
      <div className="al-toolbar al-toolbar--floating">
        <button
          type="button"
          className="al-admin__btn"
          onClick={publish}
          disabled={publishing}
          title="Rebuild the public site"
        >
          {publishing ? 'Starting…' : 'Publish to the live site'}
        </button>
        {needsPublish && <span className="al-toolbar__dot" aria-hidden="true" />}
      </div>

      <div className="al-media__progress">
        <strong>{filledPlacements}</strong> of <strong>{totalPlacements}</strong> placements have a
        photograph.
        {filledPlacements < totalPlacements && ' Empty placements show an art-direction note on the live site.'}
      </div>

      {error && <div className="al-admin-error" role="alert">{error}</div>}
      {notice && <div className="al-set__notice" role="status">{notice}</div>}

      {needsPublish && (
        <div className="al-set__notice" role="status">
          A photograph was added to or removed from a placement that was empty or full. Press{' '}
          <strong>Publish to the live site</strong> (top right) to put it on the public site —
          replacing a photograph that was already there goes live on its own, but filling or
          emptying a placement does not.
        </div>
      )}

      {groups.map((group) => (
        <section className="al-media__group" key={group}>
          <div className="al-media__grouphead">
            <h2>{group}</h2>
            <span>
              {state.filter((s) => s.groupTitle === group).reduce((n, s) => n + s.images.filter((i) => i.hasImage).length, 0)} /{' '}
              {state.filter((s) => s.groupTitle === group).reduce((n, s) => n + s.images.length, 0)} filled
            </span>
          </div>

          <div className={`al-media__products${group === 'Projects' ? ' al-media__products--row' : ''}`}>
            {state
              .filter((s) => s.groupTitle === group)
              .map((slot) => (
                <div className="al-media__product" key={slot.id}>
                  <div className="al-media__producthead">
                    <div>
                      <div className="al-media__title">{slot.title}</div>
                      <div className="al-media__id">{slot.id}</div>
                    </div>
                    {slot.project && (
                      <button
                        type="button"
                        className={`al-media__vis${slot.project.isPublished ? ' is-on' : ''}`}
                        onClick={() => toggleProjectVisibility(slot)}
                        disabled={busy === `project:${slot.project.id}`}
                        title={
                          slot.project.isPublished
                            ? 'Visible on the public site — click to hide'
                            : 'Hidden from the public site — click to show'
                        }
                      >
                        {slot.project.isPublished ? 'Visible' : 'Hidden'}
                      </button>
                    )}
                  </div>

                  <div className="al-media__grid">
                    {slot.images.map((image) => {
                      const key = busyKey(slot.id, image.position);
                      return (
                        <div className="al-media__item" key={key}>
                          <label
                            className={`al-media__drop${dragging === key ? ' is-dragging' : ''}${
                              busy === key ? ' is-busy' : ''
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragging(key);
                            }}
                            onDragLeave={() => setDragging(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragging(null);
                              const f = e.dataTransfer.files?.[0];
                              if (f) upload(slot, image, f);
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) upload(slot, image, f);
                                e.target.value = '';
                              }}
                            />
                            {image.previewUrl ? (
                              <img src={image.previewUrl} alt="" />
                            ) : (
                              <span className="al-media__note">
                                {slot.images.length > 1
                                  ? (image.label ?? `Photo ${image.position}`)
                                  : slot.placeholder}
                              </span>
                            )}
                            {busy === key && <span className="al-media__busy">Processing…</span>}
                          </label>

                          {slot.images.length > 1 && (
                            <div className="al-media__posrow">
                              <span>{image.label ?? `Photo ${image.position}`}</span>
                              {image.hasImage && (
                                <button
                                  type="button"
                                  className="al-media__remove"
                                  onClick={() => removeImage(slot, image)}
                                  disabled={busy === key}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}

                          <input
                            className="al-media__alt"
                            defaultValue={image.altText}
                            placeholder="Describe this image (for accessibility and SEO)"
                            onBlur={(e) => {
                              if (e.target.value !== image.altText) saveAlt(slot.id, image.position, e.target.value);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
