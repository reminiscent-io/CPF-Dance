-- Minimal stand-ins for the Supabase pieces the promo migrations touch.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null, owner uuid, metadata jsonb
);
create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

-- Supabase grants new public tables to anon/authenticated by default.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create type user_role as enum ('instructor', 'dancer', 'guardian', 'admin');
create table public.profiles (
  id uuid primary key, email text, role user_role not null,
  linked_profile_id uuid references public.profiles(id)
);
create function update_updated_at_column() returns trigger language plpgsql as
  $$ begin new.updated_at = now(); return new; end $$;
create table public.assets (
  id uuid primary key default gen_random_uuid(), title text, file_url text, file_type text,
  file_size bigint, instructor_id uuid references public.profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.classes (
  id uuid primary key default gen_random_uuid(), instructor_id uuid references public.profiles(id),
  title text, asset_id uuid references public.assets(id)
);
