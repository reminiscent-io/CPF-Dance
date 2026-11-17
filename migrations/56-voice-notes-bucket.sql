-- Migration 56: Private bucket for voice-note recordings
--
-- Vercel rejects request bodies over 4.5 MB before a route runs, so voice
-- notes no longer post the recording to /api/voice-to-notes. The browser
-- uploads it here with a signed upload token from
-- /api/voice-to-notes/upload-url, the route reads it back with the service
-- role, sends it to Whisper, and deletes it. Recordings abandoned mid-flow are
-- swept after an hour (lib/voice-notes.ts).
--
-- No storage policies: signed upload tokens bypass RLS, and only the service
-- role reads or deletes. 25 MB is Whisper's limit; the app always uploads
-- recordings as audio/webm.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('voice-notes', 'voice-notes', false, 26214400, '{audio/webm}'::text[])
ON CONFLICT (id) DO NOTHING;
