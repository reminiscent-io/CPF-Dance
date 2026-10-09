\set QUIET on
\pset tuples_only on
\pset format unaligned
insert into profiles values
 ('11111111-1111-1111-1111-111111111111','courtney@cpfdance.com','admin',null),
 ('22222222-2222-2222-2222-222222222222','courtney-alt@example.com','instructor','11111111-1111-1111-1111-111111111111'),
 ('33333333-3333-3333-3333-333333333333','other@example.com','instructor',null),
 ('44444444-4444-4444-4444-444444444444','dancer@example.com','dancer',null);
insert into promo_templates (id, slug, name) values ('aaaaaaaa-0000-0000-0000-000000000001','precision-workshop','Precision Workshop');
insert into promo_template_versions (id, template_id, version, definition, published_at) values
 ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',1,'{}','2026-10-09');
update promo_templates set current_version_id = 'bbbbbbbb-0000-0000-0000-000000000001';

\echo '1 linked login resolves to primary + admin (expect 11111111...|t|t)'
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
set role authenticated;
select promo_owner_id() || '|' || promo_is_admin() || '|' || promo_is_instructor();

\echo '2 linked login inserts asset owned by primary (expect INSERT ok)'
insert into promo_assets (id, owner_id, original_path, display_path, thumb_path, width, height, sha256)
values ('cccccccc-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',
 '11111111-1111-1111-1111-111111111111/assets/c1/original.jpg','11111111-1111-1111-1111-111111111111/assets/c1/display.jpg',
 '11111111-1111-1111-1111-111111111111/assets/c1/thumb.jpg',3000,4000, repeat('a',64));
select 'assets visible to courtney: ' || count(*) from promo_assets;
insert into storage.objects (bucket_id, name) values ('promo-private','11111111-1111-1111-1111-111111111111/assets/c1/original.jpg');
select 'objects visible to courtney: ' || count(*) from storage.objects;
insert into promo_designs (owner_id, template_version_id, format, document, brand_snapshot)
values ('11111111-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-000000000001','ig_post','{}','{}');
select 'designs visible to courtney: ' || count(*) from promo_designs;
reset role;

\echo '3 other instructor sees nothing (expect 0, 0, 0, 0)'
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
set role authenticated;
select 'assets: ' || count(*) from promo_assets;
select 'objects: ' || count(*) from storage.objects;
select 'designs: ' || count(*) from promo_designs;
select 'ai calls: ' || count(*) from promo_ai_calls;
\echo '4 other instructor cannot write into her folder or rows (expect 3 errors)'
insert into storage.objects (bucket_id, name) values ('promo-private','11111111-1111-1111-1111-111111111111/assets/x/original.jpg');
insert into promo_assets (owner_id, original_path, display_path, thumb_path, width, height, sha256)
values ('11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111/a','11111111-1111-1111-1111-111111111111/b','11111111-1111-1111-1111-111111111111/c',1,1,repeat('b',64));
insert into promo_assets (owner_id, original_path, display_path, thumb_path, width, height, sha256)
values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111/a','33333333-3333-3333-3333-333333333333/b','33333333-3333-3333-3333-333333333333/c',1,1,repeat('b',64));
\echo '5 other instructor can use their own folder (expect ok)'
insert into storage.objects (bucket_id, name) values ('promo-private','33333333-3333-3333-3333-333333333333/assets/o/original.jpg');
\echo '6 other instructor reads published templates, cannot draft (expect 1 then error)'
select 'published versions: ' || count(*) from promo_template_versions;
insert into promo_template_versions (template_id, version, definition) values ('aaaaaaaa-0000-0000-0000-000000000001',2,'{}');
\echo '7 nobody but the service role writes the AI log (expect error)'
insert into promo_ai_calls (owner_id, kind, model, status) values ('33333333-3333-3333-3333-333333333333','tag','x','ok');
reset role;

\echo '8 dancer cannot create promo assets or upload (expect 2 errors)'
select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false) \g /dev/null
set role authenticated;
insert into promo_assets (owner_id, original_path, display_path, thumb_path, width, height, sha256)
values ('44444444-4444-4444-4444-444444444444','44444444-4444-4444-4444-444444444444/a','44444444-4444-4444-4444-444444444444/b','44444444-4444-4444-4444-444444444444/c',1,1,repeat('d',64));
insert into storage.objects (bucket_id, name) values ('promo-private','44444444-4444-4444-4444-444444444444/x.jpg');
reset role;

\echo '9 anon is denied outright (expect permission denied x2)'
select set_config('request.jwt.claim.sub','',false) \g /dev/null
set role anon;
select count(*) from promo_assets;
select count(*) from promo_designs;
reset role;

\echo '10 template freeze (expect error, ok, error)'
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
set role authenticated;
update promo_template_versions set definition = '{"x":1}' where version = 1;
insert into promo_template_versions (id, template_id, version, definition) values ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001',2,'{}');
update promo_template_versions set published_at = now() where version = 2;
update promo_template_versions set notes = 'sneaky' where version = 2;
reset role;

\echo '11 AI spend view respects RLS (expect courtney 1, other 0)'
insert into promo_ai_calls (owner_id, kind, model, status, cost_micros) values ('11111111-1111-1111-1111-111111111111','generate','m','ok',1500);
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false) \g /dev/null
set role authenticated;
select 'courtney monthly rows: ' || count(*) || ' cost ' || coalesce(sum(cost_micros),0) from promo_ai_monthly;
reset role;
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false) \g /dev/null
set role authenticated;
select 'other monthly rows: ' || count(*) from promo_ai_monthly;
reset role;
