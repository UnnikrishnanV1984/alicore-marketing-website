---
name: quote-enquiry-conventions
description: Field list, placement rules, and mobile requirements for Alicore's quote/enquiry contact form and the WhatsApp/Call/Email CTAs. Use this whenever building or reviewing the Contact page, any "Request a Quote" button or form, or mobile navigation/CTA behavior.
---

# Quote & enquiry conventions

## Contact form fields (in order)

1. Name
2. Company
3. Phone
4. Email
5. Project Location
6. Product / Requirement
7. Estimated Quantity
8. Message
9. Upload Drawing / Reference (file upload)

Submit button label: "Request a Quote". The mockup's field ids
(`enq-name`, `enq-company`, `enq-phone`, `enq-email`, `enq-location`, `enq-product`,
`enq-qty`, `enq-message`) confirm this exact field set and order — keep it unless a
real requirement changes it.

## Always-present contact options

Alongside the form, the Contact page (and ideally the footer) must offer:
"WhatsApp Us," "Call Us," "Email Us" as direct-action links, not just the form.
The header/top bar in the mockup also surfaces a phone number and WhatsApp link
persistently across the whole site — preserve that pattern.

## Enquiries feed the admin panel

Form submissions should land in the admin dashboard's "Enquiries" queue (see the
Admin mockup) — coordinate with whichever agent builds the admin panel so the data
model matches: at minimum, capture every field above plus a submission timestamp.

## Mobile-specific requirements

- Large, readable headings
- Fast-loading, properly optimized images
- Simple navigation (collapse the full nav into a mobile menu)
- Easy, thumb-reachable WhatsApp and Call buttons
- A large, prominent enquiry CTA (don't shrink "Request a Quote" into a minor link)

## Placement

Don't confine "Request a Quote" / "Discuss Your Project" / "Talk to Our Team" CTAs to
the Contact page alone — the brief calls for strong enquiry buttons throughout the
site (header, hero, end of Products/GFRC/FRP/Custom Solutions sections, footer).
