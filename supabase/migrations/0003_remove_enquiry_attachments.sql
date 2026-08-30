-- ===========================================================================
-- Remove the enquiry file-upload feature.
--
-- The design mockup carries no upload control on the quote form; it routes
-- drawings to WhatsApp instead ("Have drawings or reference images? Send them
-- to us on WhatsApp"). The requirements brief does list an "Upload Drawing /
-- Reference" field, but the client chose the mockup's approach, so the column,
-- the bucket and its policies come out.
--
-- Additive migration rather than an edit to 0001, so this is safe whether or
-- not the earlier migrations have already been applied somewhere.
-- ===========================================================================

alter table public.enquiries drop column if exists attachment_path;

-- Remove any objects first; a bucket with contents cannot be deleted.
delete from storage.objects where bucket_id = 'enquiry-attachments';
delete from storage.buckets where id = 'enquiry-attachments';
