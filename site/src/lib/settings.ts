import { anonClient, serviceClient } from './supabase';
import { buildEnv, serverEnv } from './env';

/**
 * Admin-editable contact details and social links.
 *
 * Resolution order, most specific first:
 *   1. the site_settings row, when the database is reachable
 *   2. environment variables
 *   3. hardcoded defaults from the mockup
 *
 * Never throws. If the database is unreachable the site still renders with
 * whatever env provides -- the same offline behaviour as the image slots.
 *
 * NOTE ON TIMING: public pages are prerendered, so these values are baked in
 * at build time. Editing them in the admin console requires a rebuild before
 * the change appears on the live site (the Settings screen says so, and can
 * trigger one). `notifyEmails` is the exception -- it is read at request time
 * by /api/enquiry and takes effect immediately.
 */

export const PLACEHOLDER_EMAIL = '[ADD EMAIL]';
export const PLACEHOLDER_ADDRESS = '[ADD ADDRESS]';

export type SocialKey = 'instagram' | 'facebook' | 'linkedin' | 'youtube';

export type SiteSettings = {
  phoneDisplay: string;
  phoneE164: string;
  whatsappE164: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
};

/** Everything a template needs, with hrefs and placeholders already resolved. */
export type ResolvedContact = SiteSettings & {
  phoneHref: string;
  whatsappHref: string;
  emailHref: string;
  emailDisplay: string;
  addressDisplay: string;
  hasEmail: boolean;
  hasAddress: boolean;
  social: { key: SocialKey; label: string; href: string }[];
};

const WHATSAPP_MESSAGE =
  'Hello Alicore, I would like to discuss an architectural products requirement.';

function defaults(): SiteSettings {
  return {
    phoneDisplay: buildEnv('PUBLIC_PHONE_DISPLAY') || '9995 495 395',
    phoneE164: buildEnv('PUBLIC_PHONE_E164') || '+919995495395',
    whatsappE164: buildEnv('PUBLIC_WHATSAPP_E164') || '919995495395',
    email: buildEnv('PUBLIC_EMAIL') || '',
    address: buildEnv('PUBLIC_ADDRESS') || '',
    instagram: '',
    facebook: '',
    linkedin: '',
    youtube: '',
  };
}

const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

export function resolve(s: SiteSettings): ResolvedContact {
  const wa = s.whatsappE164.replace(/\D/g, '');
  return {
    ...s,
    phoneHref: `tel:${s.phoneE164}`,
    whatsappHref: `https://wa.me/${wa}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
    emailHref: s.email ? `mailto:${s.email}` : '',
    emailDisplay: s.email || PLACEHOLDER_EMAIL,
    addressDisplay: s.address || PLACEHOLDER_ADDRESS,
    hasEmail: Boolean(s.email),
    hasAddress: Boolean(s.address),
    // Order is fixed by the brief: Instagram, Facebook, LinkedIn, YouTube.
    social: (['instagram', 'facebook', 'linkedin', 'youtube'] as SocialKey[]).map((key) => ({
      key,
      label: SOCIAL_LABELS[key],
      href: s[key],
    })),
  };
}

// One query per build (and per Worker isolate), not one per page.
let cache: ResolvedContact | null = null;

export async function loadContact(locals?: unknown): Promise<ResolvedContact> {
  if (cache) return cache;

  const base = defaults();
  const supabase = anonClient(locals);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('phone_display, phone_e164, whatsapp_e164, email, address, instagram, facebook, linkedin, youtube')
        .eq('id', true)
        .maybeSingle();

      if (!error && data) {
        // A blank column means "not set" and falls back rather than blanking
        // out a working value.
        base.phoneDisplay = data.phone_display || base.phoneDisplay;
        base.phoneE164 = data.phone_e164 || base.phoneE164;
        base.whatsappE164 = data.whatsapp_e164 || base.whatsappE164;
        base.email = data.email || base.email;
        base.address = data.address || base.address;
        base.instagram = data.instagram || '';
        base.facebook = data.facebook || '';
        base.linkedin = data.linkedin || '';
        base.youtube = data.youtube || '';
      }
    } catch {
      // Unreachable at build time -> fall back to env. Never fail the build.
    }
  }

  cache = resolve(base);
  return cache;
}

/** Admin reads bypass the cache so a save is reflected on the next render. */
export async function loadSettingsForAdmin(locals: unknown): Promise<SiteSettings & { notifyEmails: string }> {
  const base = defaults();
  try {
    const supabase = serviceClient(locals);
    const { data } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle();
    if (data) {
      return {
        phoneDisplay: data.phone_display ?? base.phoneDisplay,
        phoneE164: data.phone_e164 ?? base.phoneE164,
        whatsappE164: data.whatsapp_e164 ?? base.whatsappE164,
        email: data.email ?? '',
        address: data.address ?? '',
        instagram: data.instagram ?? '',
        facebook: data.facebook ?? '',
        linkedin: data.linkedin ?? '',
        youtube: data.youtube ?? '',
        notifyEmails: data.notify_emails ?? '',
      };
    }
  } catch {
    /* fall through to defaults */
  }
  return { ...base, notifyEmails: '' };
}

/**
 * Where enquiry alerts go. Read at request time, so a change in the admin
 * console applies to the very next enquiry with no rebuild.
 */
export async function loadNotifyEmails(locals: unknown): Promise<string> {
  try {
    const supabase = serviceClient(locals);
    const { data } = await supabase
      .from('site_settings')
      .select('notify_emails')
      .eq('id', true)
      .maybeSingle();
    if (data?.notify_emails) return data.notify_emails;
  } catch {
    /* fall back to the env var below */
  }
  return serverEnv(locals, 'ENQUIRY_NOTIFY_TO') ?? '';
}
