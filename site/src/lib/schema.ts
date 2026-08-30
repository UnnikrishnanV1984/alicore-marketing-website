import { z } from 'zod';
import { productOptions } from '../content/products';

/**
 * Enquiry validation. ONE schema, used by both the React form and the
 * /api/enquiry endpoint, so client and server can never drift.
 *
 * Eight fields, matching the mockup's input ids. There is no attachment field:
 * the mockup carries no upload control and routes drawings to WhatsApp.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const enquirySchema = z.object({
  // 1. Name *
  name: trimmed(120).min(2, 'Please enter your name.'),

  // 2. Company
  company: trimmed(160).optional().or(z.literal('')),

  // 3. Phone *
  phone: trimmed(32)
    .min(7, 'Please enter a valid phone number.')
    .regex(/^[+()\-\s\d]{7,32}$/, 'Please enter a valid phone number.'),

  // 4. Email *
  email: trimmed(200).email('Please enter a valid email address.'),

  // 5. Project Location
  location: trimmed(160).optional().or(z.literal('')),

  // 6. Product / Requirement
  product: z.enum(productOptions).or(z.literal('')),

  // 7. Estimated Quantity
  quantity: trimmed(80).optional().or(z.literal('')),

  // 8. Message
  message: trimmed(4000).optional().or(z.literal('')),

  // Anti-spam. Must be empty; bots fill it in.
  website: z.literal('').optional(),

  // Cloudflare Turnstile token.
  turnstileToken: z.string().optional().or(z.literal('')),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

/** Human-readable reference, e.g. ENQ-M4K2P9X. Matches the mockup's format. */
export function makeRef(now: number = Date.now()): string {
  return `ENQ-${now.toString(36).toUpperCase()}`;
}

