-- CPF Dance database schema
--
-- The production schema after migration 53, generated on 2026-11-12 from the
-- live database's catalog. To build a new database, run this file once in the
-- SQL editor of a fresh Supabase project, then any migration numbered above 53.
--
-- migrations/ is the change history, not a way to build a database: 01-04 were
-- deleted, and production has changes no migration made (the user_role enum
-- still carries studio and studio_admin, several policies came from the
-- dashboard). When you add a migration, apply the same change here.
--
-- Supabase supplies everything this file assumes: auth.users, the storage
-- schema, the anon, authenticated and service_role roles, the extensions
-- schema, and the supabase_realtime publication.

SET check_function_bodies = false;
SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Types

CREATE TYPE public.class_type AS ENUM ('group', 'private', 'workshop', 'master_class', 'competition_choreography');
CREATE TYPE public.instructor_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.note_visibility AS ENUM ('private', 'shared_with_student', 'shared_with_guardian', 'shared_with_studio', 'shared_with_instructor');
CREATE TYPE public.payment_method AS ENUM ('stripe', 'cash', 'check', 'other');
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'disputed', 'cancelled');
CREATE TYPE public.pricing_model AS ENUM ('per_person', 'per_class', 'per_hour', 'tiered');
CREATE TYPE public.user_role AS ENUM ('instructor', 'dancer', 'guardian', 'studio_admin', 'admin', 'studio');

-- Tables

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    file_size bigint,
    instructor_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.class_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stripe_checkout_session_id text NOT NULL,
    class_id uuid NOT NULL,
    workshop_option text,
    student_id uuid,
    buyer_name text,
    buyer_email text,
    buyer_phone text,
    amount_paid numeric(10,2) NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    purchased_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.classes (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    instructor_id uuid NOT NULL,
    studio_id uuid,
    class_type class_type NOT NULL,
    title text NOT NULL,
    description text,
    location text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    max_capacity integer,
    price numeric(10,2),
    is_cancelled boolean DEFAULT false,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pricing_model pricing_model DEFAULT 'per_person'::pricing_model,
    base_cost numeric(10,2),
    cost_per_person numeric(10,2),
    cost_per_hour numeric(10,2),
    tiered_base_students integer,
    tiered_additional_cost numeric(10,2),
    actual_attendance_count integer,
    external_signup_url text,
    is_public boolean DEFAULT false,
    asset_id uuid,
    is_virtual boolean DEFAULT false NOT NULL,
    google_meet_url text,
    google_calendar_event_id text,
    series_id uuid,
    workshop_price numeric(10,2),
    workshop_signup_url text,
    workshop_full_only boolean DEFAULT false NOT NULL,
    share_slug text
);

CREATE TABLE public.enrollments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now(),
    attendance_status text,
    notes text,
    workshop_pass boolean DEFAULT false NOT NULL
);

CREATE TABLE public.instructor_access_requests (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text,
    status instructor_request_status DEFAULT 'pending'::instructor_request_status NOT NULL,
    admin_notes text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.instructor_student_relationships (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    instructor_id uuid NOT NULL,
    student_id uuid NOT NULL,
    can_view_notes boolean DEFAULT true,
    can_view_progress boolean DEFAULT true,
    can_view_payments boolean DEFAULT false,
    relationship_status text DEFAULT 'active'::text,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.lesson_pack_purchases (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    lesson_pack_id uuid NOT NULL,
    payment_id uuid,
    stripe_checkout_session_id text,
    remaining_lessons integer NOT NULL,
    purchased_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.lesson_pack_usage (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    lesson_pack_purchase_id uuid NOT NULL,
    private_lesson_request_id uuid,
    lessons_used integer DEFAULT 1 NOT NULL,
    used_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    class_id uuid,
    voided_at timestamp with time zone,
    voided_reason text
);

CREATE TABLE public.lesson_packs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    lesson_count integer NOT NULL,
    price numeric(10,2) NOT NULL,
    stripe_price_id text,
    stripe_product_id text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.lesson_reschedule_requests (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    proposed_dates text[] DEFAULT ARRAY[]::text[],
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.notes (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    author_id uuid NOT NULL,
    student_id uuid,
    class_id uuid,
    title text,
    content text NOT NULL,
    tags text[],
    visibility note_visibility DEFAULT 'private'::note_visibility NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    personal_class_id uuid
);

CREATE TABLE public.payment_events (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    payment_id uuid NOT NULL,
    event_type text NOT NULL,
    actor_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.payments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid,
    studio_id uuid,
    amount numeric(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
    stripe_payment_id text,
    transaction_date timestamp with time zone DEFAULT now(),
    confirmed_by_instructor_at timestamp with time zone,
    confirmed_by_studio_at timestamp with time zone,
    notes text,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.personal_classes (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    title text NOT NULL,
    instructor_name text,
    location text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    notes text,
    is_recurring boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.private_lesson_requests (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    requested_focus text,
    preferred_dates text[],
    additional_notes text,
    status text DEFAULT 'pending'::text,
    instructor_response text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    instructor_id uuid,
    scheduled_class_id uuid
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    phone text,
    full_name text NOT NULL,
    role user_role NOT NULL,
    avatar_url text,
    date_of_birth date,
    guardian_id uuid,
    consent_given boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    linked_profile_id uuid
);

CREATE TABLE public.promo_ai_budgets (
    owner_id uuid NOT NULL,
    monthly_cap_micros bigint NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_ai_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    kind text NOT NULL,
    model text NOT NULL,
    status text NOT NULL,
    input_tokens integer DEFAULT 0 NOT NULL,
    cached_input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    cost_micros bigint DEFAULT 0 NOT NULL,
    latency_ms integer,
    design_id uuid,
    asset_id uuid,
    error_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    parent_id uuid,
    status text DEFAULT 'ready'::text NOT NULL,
    original_path text NOT NULL,
    display_path text NOT NULL,
    thumb_path text NOT NULL,
    matte_path text,
    width integer NOT NULL,
    height integer NOT NULL,
    bytes bigint DEFAULT 0 NOT NULL,
    sha256 text NOT NULL,
    original_filename text,
    tags jsonb DEFAULT '{}'::jsonb NOT NULL,
    pose jsonb,
    tags_edited boolean DEFAULT false NOT NULL,
    tagged_at timestamp with time zone,
    derivation jsonb,
    favorite boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_brand_kits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    name text DEFAULT 'Studio brand'::text NOT NULL,
    tokens jsonb NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_design_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    design_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    revision integer NOT NULL,
    document jsonb NOT NULL,
    source text NOT NULL,
    instruction text,
    summary text,
    ai_call_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_designs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    title text DEFAULT 'Untitled promo'::text NOT NULL,
    template_version_id uuid NOT NULL,
    format text NOT NULL,
    group_id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    brief jsonb DEFAULT '{}'::jsonb NOT NULL,
    document jsonb NOT NULL,
    brand_snapshot jsonb NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    thumbnail_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_publications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    design_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    asset_id uuid,
    public_path text NOT NULL,
    public_url text NOT NULL,
    class_id uuid,
    previous_class_asset_id uuid,
    revision integer NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    unpublished_at timestamp with time zone
);

CREATE TABLE public.promo_template_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    version integer NOT NULL,
    definition jsonb NOT NULL,
    definition_format integer DEFAULT 1 NOT NULL,
    notes text,
    published_at timestamp with time zone,
    published_by uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.promo_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    current_version_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    instructor_id uuid NOT NULL,
    rating integer NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    show_name boolean DEFAULT false NOT NULL
);

CREATE TABLE public.students (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    profile_id uuid,
    guardian_id uuid,
    age_group text,
    skill_level text,
    goals text,
    medical_notes text,
    emergency_contact_name text,
    emergency_contact_phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    full_name text,
    email text,
    phone text
);

CREATE TABLE public.studio_inquiries (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    studio_name text NOT NULL,
    contact_name text NOT NULL,
    contact_email text NOT NULL,
    contact_phone text,
    message text,
    status text DEFAULT 'new'::text,
    created_at timestamp with time zone DEFAULT now(),
    studio_id uuid,
    is_responded boolean DEFAULT false,
    contact_method character varying(50),
    response_notes text,
    responded_at timestamp with time zone,
    gmail_thread_id text,
    last_email_message_id text,
    email_count integer DEFAULT 0,
    last_email_date timestamp with time zone,
    has_unread_reply boolean DEFAULT false
);

CREATE TABLE public.studios (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    address text,
    city text,
    state text,
    zip_code text,
    contact_email text,
    contact_phone text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.waiver_signatures (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    waiver_id uuid NOT NULL,
    signed_by_id uuid NOT NULL,
    signer_name text NOT NULL,
    signer_email text NOT NULL,
    signature_image_url text NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.waiver_templates (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    content_type character varying(20) DEFAULT 'rich_text'::character varying NOT NULL,
    content text,
    pdf_url text,
    pdf_filename text,
    created_by_id uuid NOT NULL,
    is_shared boolean DEFAULT false,
    waiver_type character varying(50) DEFAULT 'general'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.waivers (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    content text NOT NULL,
    waiver_type character varying(50) DEFAULT 'general'::character varying NOT NULL,
    issued_by_id uuid NOT NULL,
    issued_by_role character varying(50) NOT NULL,
    recipient_id uuid,
    recipient_type character varying(50) NOT NULL,
    private_lesson_id uuid,
    class_id uuid,
    signature_image_url text,
    signed_at timestamp with time zone,
    signed_by_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    declined_reason text,
    declined_at timestamp with time zone,
    template_id uuid,
    student_id uuid
);

-- Keys and checks

ALTER TABLE ONLY public.assets ADD CONSTRAINT assets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.class_purchases ADD CONSTRAINT class_purchases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.class_purchases ADD CONSTRAINT class_purchases_stripe_checkout_session_id_key UNIQUE (stripe_checkout_session_id);
ALTER TABLE ONLY public.class_purchases ADD CONSTRAINT class_purchases_workshop_option_check CHECK ((workshop_option = ANY (ARRAY['full'::text, 'day'::text])));
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.enrollments ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.enrollments ADD CONSTRAINT enrollments_student_id_class_id_key UNIQUE (student_id, class_id);
ALTER TABLE ONLY public.instructor_access_requests ADD CONSTRAINT instructor_access_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.instructor_student_relationships ADD CONSTRAINT instructor_student_relationships_instructor_id_student_id_key UNIQUE (instructor_id, student_id);
ALTER TABLE ONLY public.instructor_student_relationships ADD CONSTRAINT instructor_student_relationships_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.instructor_student_relationships ADD CONSTRAINT instructor_student_relationships_relationship_status_check CHECK ((relationship_status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])));
ALTER TABLE ONLY public.lesson_pack_purchases ADD CONSTRAINT lesson_pack_purchases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_pack_usage ADD CONSTRAINT lesson_pack_usage_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_packs ADD CONSTRAINT lesson_packs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_reschedule_requests ADD CONSTRAINT lesson_reschedule_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notes ADD CONSTRAINT notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payment_events ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.personal_classes ADD CONSTRAINT personal_classes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.private_lesson_requests ADD CONSTRAINT private_lesson_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles ADD CONSTRAINT prevent_self_linking CHECK ((id <> linked_profile_id));
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_ai_budgets ADD CONSTRAINT promo_ai_budgets_monthly_cap_micros_check CHECK ((monthly_cap_micros >= 0));
ALTER TABLE ONLY public.promo_ai_budgets ADD CONSTRAINT promo_ai_budgets_pkey PRIMARY KEY (owner_id);
ALTER TABLE ONLY public.promo_ai_calls ADD CONSTRAINT promo_ai_calls_cost_micros_check CHECK ((cost_micros >= 0));
ALTER TABLE ONLY public.promo_ai_calls ADD CONSTRAINT promo_ai_calls_kind_check CHECK ((kind = ANY (ARRAY['tag'::text, 'generate'::text, 'revise'::text, 'shorten'::text, 'photo_edit'::text])));
ALTER TABLE ONLY public.promo_ai_calls ADD CONSTRAINT promo_ai_calls_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_ai_calls ADD CONSTRAINT promo_ai_calls_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'invalid'::text, 'error'::text, 'capped'::text])));
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_bytes_check CHECK ((bytes >= 0));
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_height_check CHECK ((height > 0));
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_paths_in_owner_folder CHECK (((original_path ~~ ((owner_id)::text || '/%'::text)) AND (display_path ~~ ((owner_id)::text || '/%'::text)) AND (thumb_path ~~ ((owner_id)::text || '/%'::text)) AND ((matte_path IS NULL) OR (matte_path ~~ ((owner_id)::text || '/%'::text)))));
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_sha256_check CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text));
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_status_check CHECK ((status = ANY (ARRAY['ready'::text, 'pending_review'::text, 'rejected'::text])));
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_width_check CHECK ((width > 0));
ALTER TABLE ONLY public.promo_brand_kits ADD CONSTRAINT promo_brand_kits_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_design_revisions ADD CONSTRAINT promo_design_revisions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_design_revisions ADD CONSTRAINT promo_design_revisions_source_check CHECK ((source = ANY (ARRAY['generate'::text, 'ai_revise'::text, 'checkpoint'::text, 'restore'::text])));
ALTER TABLE ONLY public.promo_designs ADD CONSTRAINT promo_designs_format_check CHECK ((format = ANY (ARRAY['ig_post'::text, 'ig_story'::text, 'poster'::text])));
ALTER TABLE ONLY public.promo_designs ADD CONSTRAINT promo_designs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_designs ADD CONSTRAINT promo_designs_revision_check CHECK ((revision > 0));
ALTER TABLE ONLY public.promo_designs ADD CONSTRAINT promo_designs_title_check CHECK ((char_length(title) <= 200));
ALTER TABLE ONLY public.promo_publications ADD CONSTRAINT promo_publications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_template_versions ADD CONSTRAINT promo_template_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_template_versions ADD CONSTRAINT promo_template_versions_template_id_version_key UNIQUE (template_id, version);
ALTER TABLE ONLY public.promo_template_versions ADD CONSTRAINT promo_template_versions_version_check CHECK ((version > 0));
ALTER TABLE ONLY public.promo_templates ADD CONSTRAINT promo_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.promo_templates ADD CONSTRAINT promo_templates_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text));
ALTER TABLE ONLY public.promo_templates ADD CONSTRAINT promo_templates_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.promo_templates ADD CONSTRAINT promo_templates_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])));
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_student_id_instructor_id_key UNIQUE (student_id, instructor_id);
ALTER TABLE ONLY public.students ADD CONSTRAINT students_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.studio_inquiries ADD CONSTRAINT studio_inquiries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.studios ADD CONSTRAINT studios_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.waiver_signatures ADD CONSTRAINT waiver_signatures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.waiver_templates ADD CONSTRAINT waiver_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_recipient_check CHECK ((((recipient_id IS NOT NULL) AND (student_id IS NULL)) OR ((recipient_id IS NULL) AND (student_id IS NOT NULL)) OR ((recipient_id IS NOT NULL) AND (student_id IS NOT NULL))));

-- Foreign keys

ALTER TABLE ONLY public.assets ADD CONSTRAINT assets_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.class_purchases ADD CONSTRAINT class_purchases_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.class_purchases ADD CONSTRAINT class_purchases_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES profiles(id);
ALTER TABLE ONLY public.classes ADD CONSTRAINT classes_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES studios(id);
ALTER TABLE ONLY public.enrollments ADD CONSTRAINT enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.enrollments ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.instructor_access_requests ADD CONSTRAINT instructor_access_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id);
ALTER TABLE ONLY public.instructor_student_relationships ADD CONSTRAINT instructor_student_relationships_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE ONLY public.instructor_student_relationships ADD CONSTRAINT instructor_student_relationships_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.instructor_student_relationships ADD CONSTRAINT instructor_student_relationships_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_pack_purchases ADD CONSTRAINT lesson_pack_purchases_lesson_pack_id_fkey FOREIGN KEY (lesson_pack_id) REFERENCES lesson_packs(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.lesson_pack_purchases ADD CONSTRAINT lesson_pack_purchases_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.lesson_pack_purchases ADD CONSTRAINT lesson_pack_purchases_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_pack_usage ADD CONSTRAINT lesson_pack_usage_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.lesson_pack_usage ADD CONSTRAINT lesson_pack_usage_lesson_pack_purchase_id_fkey FOREIGN KEY (lesson_pack_purchase_id) REFERENCES lesson_pack_purchases(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_pack_usage ADD CONSTRAINT lesson_pack_usage_private_lesson_request_id_fkey FOREIGN KEY (private_lesson_request_id) REFERENCES private_lesson_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.lesson_reschedule_requests ADD CONSTRAINT lesson_reschedule_requests_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_reschedule_requests ADD CONSTRAINT lesson_reschedule_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.lesson_reschedule_requests ADD CONSTRAINT lesson_reschedule_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notes ADD CONSTRAINT notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id);
ALTER TABLE ONLY public.notes ADD CONSTRAINT notes_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.notes ADD CONSTRAINT notes_personal_class_id_fkey FOREIGN KEY (personal_class_id) REFERENCES personal_classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.notes ADD CONSTRAINT notes_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payment_events ADD CONSTRAINT payment_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id);
ALTER TABLE ONLY public.payment_events ADD CONSTRAINT payment_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payments ADD CONSTRAINT payments_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES studios(id);
ALTER TABLE ONLY public.personal_classes ADD CONSTRAINT personal_classes_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.private_lesson_requests ADD CONSTRAINT private_lesson_requests_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.private_lesson_requests ADD CONSTRAINT private_lesson_requests_scheduled_class_id_fkey FOREIGN KEY (scheduled_class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.private_lesson_requests ADD CONSTRAINT private_lesson_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES profiles(id);
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.profiles ADD CONSTRAINT profiles_linked_profile_id_fkey FOREIGN KEY (linked_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_ai_budgets ADD CONSTRAINT promo_ai_budgets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_ai_budgets ADD CONSTRAINT promo_ai_budgets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_ai_calls ADD CONSTRAINT promo_ai_calls_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES promo_assets(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_ai_calls ADD CONSTRAINT promo_ai_calls_design_id_fkey FOREIGN KEY (design_id) REFERENCES promo_designs(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_ai_calls ADD CONSTRAINT promo_ai_calls_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_assets ADD CONSTRAINT promo_assets_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES promo_assets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_brand_kits ADD CONSTRAINT promo_brand_kits_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_brand_kits ADD CONSTRAINT promo_brand_kits_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_design_revisions ADD CONSTRAINT promo_design_revisions_ai_call_id_fkey FOREIGN KEY (ai_call_id) REFERENCES promo_ai_calls(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_design_revisions ADD CONSTRAINT promo_design_revisions_design_id_fkey FOREIGN KEY (design_id) REFERENCES promo_designs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_design_revisions ADD CONSTRAINT promo_design_revisions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_designs ADD CONSTRAINT promo_designs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_designs ADD CONSTRAINT promo_designs_template_version_id_fkey FOREIGN KEY (template_version_id) REFERENCES promo_template_versions(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.promo_publications ADD CONSTRAINT promo_publications_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_publications ADD CONSTRAINT promo_publications_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_publications ADD CONSTRAINT promo_publications_design_id_fkey FOREIGN KEY (design_id) REFERENCES promo_designs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_publications ADD CONSTRAINT promo_publications_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.promo_publications ADD CONSTRAINT promo_publications_previous_class_asset_id_fkey FOREIGN KEY (previous_class_asset_id) REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_template_versions ADD CONSTRAINT promo_template_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_template_versions ADD CONSTRAINT promo_template_versions_published_by_fkey FOREIGN KEY (published_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_template_versions ADD CONSTRAINT promo_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES promo_templates(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.promo_templates ADD CONSTRAINT promo_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.promo_templates ADD CONSTRAINT promo_templates_current_version_fkey FOREIGN KEY (current_version_id) REFERENCES promo_template_versions(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.students ADD CONSTRAINT students_guardian_id_fkey FOREIGN KEY (guardian_id) REFERENCES profiles(id);
ALTER TABLE ONLY public.students ADD CONSTRAINT students_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.studio_inquiries ADD CONSTRAINT studio_inquiries_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.waiver_signatures ADD CONSTRAINT waiver_signatures_signed_by_id_fkey FOREIGN KEY (signed_by_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.waiver_signatures ADD CONSTRAINT waiver_signatures_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES waivers(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.waiver_templates ADD CONSTRAINT waiver_templates_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_issued_by_id_fkey FOREIGN KEY (issued_by_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_private_lesson_id_fkey FOREIGN KEY (private_lesson_id) REFERENCES private_lesson_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_signed_by_id_fkey FOREIGN KEY (signed_by_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.waivers ADD CONSTRAINT waivers_template_id_fkey FOREIGN KEY (template_id) REFERENCES waiver_templates(id) ON DELETE SET NULL;

-- Indexes

CREATE INDEX idx_assets_created_at ON public.assets USING btree (created_at DESC);
CREATE INDEX idx_assets_instructor_id ON public.assets USING btree (instructor_id);
CREATE INDEX class_purchases_class_id_idx ON public.class_purchases USING btree (class_id);
CREATE INDEX class_purchases_unlinked_idx ON public.class_purchases USING btree (class_id) WHERE (student_id IS NULL);
CREATE UNIQUE INDEX classes_share_slug_key ON public.classes USING btree (share_slug) WHERE (share_slug IS NOT NULL);
CREATE INDEX idx_classes_asset_id ON public.classes USING btree (asset_id);
CREATE INDEX idx_classes_instructor ON public.classes USING btree (instructor_id);
CREATE INDEX idx_classes_is_public ON public.classes USING btree (is_public);
CREATE INDEX idx_classes_series_id ON public.classes USING btree (series_id) WHERE (series_id IS NOT NULL);
CREATE INDEX idx_classes_start_time ON public.classes USING btree (start_time);
CREATE INDEX idx_classes_studio ON public.classes USING btree (studio_id);
CREATE INDEX idx_enrollments_class ON public.enrollments USING btree (class_id);
CREATE INDEX idx_enrollments_student ON public.enrollments USING btree (student_id);
CREATE UNIQUE INDEX instructor_access_requests_email_idx ON public.instructor_access_requests USING btree (email);
CREATE INDEX idx_instructor_student_relationships_instructor ON public.instructor_student_relationships USING btree (instructor_id);
CREATE INDEX idx_instructor_student_relationships_status ON public.instructor_student_relationships USING btree (relationship_status);
CREATE INDEX idx_instructor_student_relationships_student ON public.instructor_student_relationships USING btree (student_id);
CREATE INDEX idx_relationships_active_instructor ON public.instructor_student_relationships USING btree (instructor_id, relationship_status) WHERE (relationship_status = 'active'::text);
CREATE INDEX idx_relationships_active_student ON public.instructor_student_relationships USING btree (student_id, relationship_status) WHERE (relationship_status = 'active'::text);
CREATE INDEX idx_lesson_pack_purchases_student ON public.lesson_pack_purchases USING btree (student_id);
CREATE INDEX idx_lesson_pack_usage_active ON public.lesson_pack_usage USING btree (class_id) WHERE (voided_at IS NULL);
CREATE INDEX idx_lesson_pack_usage_class_id ON public.lesson_pack_usage USING btree (class_id) WHERE (class_id IS NOT NULL);
CREATE INDEX idx_lesson_pack_usage_purchase ON public.lesson_pack_usage USING btree (lesson_pack_purchase_id);
CREATE INDEX idx_lesson_reschedule_requests_class ON public.lesson_reschedule_requests USING btree (class_id);
CREATE INDEX idx_lesson_reschedule_requests_status ON public.lesson_reschedule_requests USING btree (status) WHERE (status = 'pending'::text);
CREATE INDEX idx_notes_author ON public.notes USING btree (author_id);
CREATE INDEX idx_notes_created_at ON public.notes USING btree (student_id, created_at DESC);
CREATE INDEX idx_notes_personal_class ON public.notes USING btree (personal_class_id);
CREATE INDEX idx_notes_student ON public.notes USING btree (student_id);
CREATE INDEX idx_payments_status ON public.payments USING btree (payment_status);
CREATE INDEX idx_payments_student ON public.payments USING btree (student_id);
CREATE INDEX idx_personal_classes_start_time ON public.personal_classes USING btree (start_time);
CREATE INDEX idx_personal_classes_student ON public.personal_classes USING btree (student_id);
CREATE INDEX idx_private_lesson_requests_instructor_id ON public.private_lesson_requests USING btree (instructor_id);
CREATE INDEX idx_private_lesson_requests_scheduled_class_id ON public.private_lesson_requests USING btree (scheduled_class_id);
CREATE INDEX idx_private_lesson_requests_scheduled_class_id_student ON public.private_lesson_requests USING btree (scheduled_class_id, student_id) WHERE (scheduled_class_id IS NOT NULL);
CREATE INDEX idx_profiles_guardian_id ON public.profiles USING btree (guardian_id);
CREATE INDEX idx_profiles_linked_profile_id ON public.profiles USING btree (linked_profile_id);
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX idx_promo_ai_calls_owner_created ON public.promo_ai_calls USING btree (owner_id, created_at DESC);
CREATE INDEX idx_promo_assets_owner_created ON public.promo_assets USING btree (owner_id, created_at DESC);
CREATE INDEX idx_promo_assets_parent ON public.promo_assets USING btree (parent_id) WHERE (parent_id IS NOT NULL);
CREATE UNIQUE INDEX promo_assets_owner_sha256_key ON public.promo_assets USING btree (owner_id, sha256) WHERE (parent_id IS NULL);
CREATE UNIQUE INDEX promo_brand_kits_one_studio_default ON public.promo_brand_kits USING btree (((owner_id IS NULL))) WHERE (owner_id IS NULL);
CREATE UNIQUE INDEX promo_brand_kits_owner_key ON public.promo_brand_kits USING btree (owner_id) WHERE (owner_id IS NOT NULL);
CREATE INDEX idx_promo_design_revisions_design ON public.promo_design_revisions USING btree (design_id, created_at DESC);
CREATE INDEX idx_promo_designs_group ON public.promo_designs USING btree (group_id);
CREATE INDEX idx_promo_designs_owner_updated ON public.promo_designs USING btree (owner_id, updated_at DESC);
CREATE UNIQUE INDEX promo_publications_one_live ON public.promo_publications USING btree (design_id) WHERE (unpublished_at IS NULL);
CREATE UNIQUE INDEX promo_template_versions_one_draft ON public.promo_template_versions USING btree (template_id) WHERE (published_at IS NULL);
CREATE INDEX idx_students_guardian_id ON public.students USING btree (guardian_id);
CREATE INDEX idx_studio_inquiries_is_responded ON public.studio_inquiries USING btree (is_responded);
CREATE INDEX idx_studio_inquiries_status_responded ON public.studio_inquiries USING btree (status, is_responded);
CREATE INDEX idx_studio_inquiries_studio ON public.studio_inquiries USING btree (studio_id);
CREATE INDEX idx_waiver_signatures_waiver ON public.waiver_signatures USING btree (waiver_id);
CREATE INDEX idx_waiver_templates_active ON public.waiver_templates USING btree (is_active);
CREATE INDEX idx_waiver_templates_created_by ON public.waiver_templates USING btree (created_by_id);
CREATE INDEX idx_waiver_templates_type ON public.waiver_templates USING btree (waiver_type);
CREATE INDEX idx_waivers_created_at ON public.waivers USING btree (created_at DESC);
CREATE INDEX idx_waivers_issued_by ON public.waivers USING btree (issued_by_id);
CREATE INDEX idx_waivers_private_lesson ON public.waivers USING btree (private_lesson_id);
CREATE INDEX idx_waivers_recipient ON public.waivers USING btree (recipient_id);
CREATE INDEX idx_waivers_status ON public.waivers USING btree (status);
CREATE INDEX idx_waivers_student ON public.waivers USING btree (student_id);
CREATE INDEX idx_waivers_template ON public.waivers USING btree (template_id);

-- Functions

CREATE OR REPLACE FUNCTION public.can_user_view_class(class_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
#variable_conflict use_variable
BEGIN
  -- The subject must be the caller. The only legitimate invocation passes
  -- auth.uid(); anything else is a direct RPC probe and gets nothing.
  IF user_id IS NULL OR user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM private_lesson_requests plr
    JOIN students s ON s.id = plr.student_id
    WHERE plr.scheduled_class_id = class_id
    AND (s.profile_id = user_id OR s.guardian_id = user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.class_id = class_id
    AND (s.profile_id = user_id OR s.guardian_id = user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.can_view_profile(p_target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_target_id = v_uid THEN
    RETURN TRUE;
  END IF;

  SELECT role::text INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IN ('instructor', 'admin') THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND guardian_id = p_target_id
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_target_id AND guardian_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE profile_id = v_uid AND guardian_id = p_target_id
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE profile_id = p_target_id AND guardian_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id = v_uid AND linked_profile_id = p_target_id)
       OR (id = p_target_id AND linked_profile_id = v_uid)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.check_circular_profile_link()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If setting a linked_profile_id, ensure the target isn't also linked back
  IF NEW.linked_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = NEW.linked_profile_id
      AND linked_profile_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular profile linking is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.create_instructor_relationship_on_enrollment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.instructor_student_relationships (
    instructor_id,
    student_id,
    created_by,
    relationship_status
  )
  SELECT
    c.instructor_id,
    NEW.student_id,
    auth.uid(),
    'active'
  FROM public.classes c
  WHERE c.id = NEW.class_id
  ON CONFLICT (instructor_id, student_id)
  DO UPDATE SET
    relationship_status = 'active',
    updated_at = NOW();

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_role TEXT;
  guardian_uuid UUID;
BEGIN
  -- Get role from metadata, default to 'dancer' if not provided.
  -- SECURITY: clamp self-service signups to non-privileged roles.
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dancer');
  IF user_role NOT IN ('dancer', 'guardian') THEN
    user_role := 'dancer';
  END IF;

  guardian_uuid := (NEW.raw_user_meta_data->>'guardian_id')::UUID;

  INSERT INTO public.profiles (id, email, phone, full_name, role, guardian_id, consent_given)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role::public.user_role,
    guardian_uuid,
    false
  );

  IF user_role = 'dancer' THEN
    INSERT INTO public.students (profile_id, guardian_id, is_active)
    VALUES (NEW.id, guardian_uuid, true);
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.promo_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = public.promo_owner_id()
      AND p.role = 'admin'
  )
$function$
;
CREATE OR REPLACE FUNCTION public.promo_is_instructor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = public.promo_owner_id()
      AND p.role IN ('instructor', 'admin')
  )
$function$
;
CREATE OR REPLACE FUNCTION public.promo_owner_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(p.linked_profile_id, p.id)
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
$function$
;
CREATE OR REPLACE FUNCTION public.promo_template_versions_freeze()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Deleting a profile sets created_by / published_by to NULL; that touches
  -- no content, so it passes.
  IF TG_OP = 'UPDATE'
     AND OLD.published_at IS NOT NULL
     AND (NEW.template_id, NEW.version, NEW.definition, NEW.definition_format, NEW.notes, NEW.published_at)
         IS NOT DISTINCT FROM
         (OLD.template_id, OLD.version, OLD.definition, OLD.definition_format, OLD.notes, OLD.published_at)
  THEN
    RETURN NEW;
  END IF;
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Template version % of template % is published and cannot change',
      OLD.version, OLD.template_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.linked_profile_id IS DISTINCT FROM OLD.linked_profile_id) THEN
    RAISE EXCEPTION 'Only an administrator can change a profile''s role or linked profile'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_instructor_student_relationships_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_waiver_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN (
    SELECT role::TEXT
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$function$
;

-- Views

CREATE VIEW public.promo_ai_monthly WITH (security_invoker=true) AS
 SELECT owner_id,
    date_trunc('month'::text, (created_at AT TIME ZONE 'America/New_York'::text))::date AS month,
    kind,
    count(*)::integer AS calls,
    COALESCE(sum(cost_micros), 0::numeric)::bigint AS cost_micros
   FROM promo_ai_calls
  GROUP BY owner_id, (date_trunc('month'::text, (created_at AT TIME ZONE 'America/New_York'::text))::date), kind;

CREATE VIEW public.public_profiles WITH (security_invoker=false, security_barrier=true) AS
 SELECT id,
    full_name,
    avatar_url,
    role
   FROM profiles;

-- Triggers

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER auto_create_instructor_relationship AFTER INSERT ON enrollments FOR EACH ROW EXECUTE FUNCTION create_instructor_relationship_on_enrollment();
CREATE TRIGGER update_instructor_access_requests_updated_at BEFORE UPDATE ON instructor_access_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instructor_student_relationships_updated_at BEFORE UPDATE ON instructor_student_relationships FOR EACH ROW EXECUTE FUNCTION update_instructor_student_relationships_updated_at();
CREATE TRIGGER update_lesson_pack_purchases_updated_at BEFORE UPDATE ON lesson_pack_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lesson_packs_updated_at BEFORE UPDATE ON lesson_packs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personal_classes_updated_at BEFORE UPDATE ON personal_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_private_lesson_requests_updated_at BEFORE UPDATE ON private_lesson_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER prevent_circular_linking BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION check_circular_profile_link();
CREATE TRIGGER protect_profile_privileges BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_privileges();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_ai_budgets_updated_at BEFORE UPDATE ON promo_ai_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_assets_updated_at BEFORE UPDATE ON promo_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_brand_kits_updated_at BEFORE UPDATE ON promo_brand_kits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_designs_updated_at BEFORE UPDATE ON promo_designs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER promo_template_versions_freeze BEFORE DELETE OR UPDATE ON promo_template_versions FOR EACH ROW EXECUTE FUNCTION promo_template_versions_freeze();
CREATE TRIGGER update_promo_template_versions_updated_at BEFORE UPDATE ON promo_template_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_templates_updated_at BEFORE UPDATE ON promo_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON studios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_waiver_templates_updated_at BEFORE UPDATE ON waiver_templates FOR EACH ROW EXECUTE FUNCTION update_waiver_templates_updated_at();

-- Row level security (enabled on every table)

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_pack_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_reschedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_lesson_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_ai_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_ai_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_design_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiver_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waivers ENABLE ROW LEVEL SECURITY;

-- Policies

CREATE POLICY "Authenticated users can view all assets" ON public.assets FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Instructors can delete their own assets" ON public.assets FOR DELETE TO public
  USING (((( SELECT auth.uid() AS uid) = instructor_id) OR (( SELECT auth.uid() AS uid) IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Instructors can insert their own assets" ON public.assets FOR INSERT TO public
  WITH CHECK (((( SELECT auth.uid() AS uid) = instructor_id) AND (( SELECT auth.uid() AS uid) IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.role = ANY (ARRAY['instructor'::user_role, 'admin'::user_role]))))));
CREATE POLICY "Instructors can update their own assets" ON public.assets FOR UPDATE TO public
  USING (((( SELECT auth.uid() AS uid) = instructor_id) OR (( SELECT auth.uid() AS uid) IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.role = 'admin'::user_role)))));
CREATE POLICY class_purchases_select_policy ON public.class_purchases FOR SELECT TO public
  USING (promo_is_instructor());
CREATE POLICY class_purchases_update_policy ON public.class_purchases FOR UPDATE TO public
  USING (promo_is_instructor())
  WITH CHECK (promo_is_instructor());
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Admins can view all classes" ON public.classes FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Students can view their classes" ON public.classes FOR SELECT TO public
  USING (can_user_view_class(id, auth.uid()));
CREATE POLICY classes_delete_policy ON public.classes FOR DELETE TO public
  USING (((instructor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY classes_insert_policy ON public.classes FOR INSERT TO public
  WITH CHECK ((((instructor_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY classes_select_policy ON public.classes FOR SELECT TO public
  USING (((is_public = true) OR (instructor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY classes_update_policy ON public.classes FOR UPDATE TO public
  USING (((instructor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY enrollments_delete_policy ON public.enrollments FOR DELETE TO public
  USING (((EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = enrollments.class_id) AND (classes.instructor_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY enrollments_insert_policy ON public.enrollments FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = enrollments.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = enrollments.class_id) AND (classes.instructor_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY enrollments_select_policy ON public.enrollments FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = enrollments.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = enrollments.class_id) AND (classes.instructor_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY enrollments_update_policy ON public.enrollments FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = enrollments.class_id) AND (classes.instructor_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY "Admins can delete instructor access requests" ON public.instructor_access_requests FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Admins can update instructor access requests" ON public.instructor_access_requests FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Admins can view instructor access requests" ON public.instructor_access_requests FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Anyone can submit instructor access request" ON public.instructor_access_requests FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY relationships_delete_policy ON public.instructor_student_relationships FOR DELETE TO public
  USING (((instructor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY relationships_insert_policy ON public.instructor_student_relationships FOR INSERT TO public
  WITH CHECK ((((instructor_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY relationships_select_policy ON public.instructor_student_relationships FOR SELECT TO public
  USING (((instructor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = instructor_student_relationships.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY relationships_update_policy ON public.instructor_student_relationships FOR UPDATE TO public
  USING (((instructor_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY "Students can create purchases" ON public.lesson_pack_purchases FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = lesson_pack_purchases.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Students can update their purchases" ON public.lesson_pack_purchases FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = lesson_pack_purchases.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY lesson_pack_purchases_select_policy ON public.lesson_pack_purchases FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = lesson_pack_purchases.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY lesson_pack_usage_insert_policy ON public.lesson_pack_usage FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM (lesson_pack_purchases lpp
     JOIN students s ON ((s.id = lpp.student_id)))
  WHERE ((lpp.id = lesson_pack_usage.lesson_pack_purchase_id) AND (s.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY lesson_pack_usage_select_policy ON public.lesson_pack_usage FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM (lesson_pack_purchases lpp
     JOIN students s ON ((s.id = lpp.student_id)))
  WHERE ((lpp.id = lesson_pack_usage.lesson_pack_purchase_id) AND (s.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY lesson_packs_select_policy ON public.lesson_packs FOR SELECT TO public
  USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY lesson_reschedule_requests_insert_policy ON public.lesson_reschedule_requests FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = lesson_reschedule_requests.student_id) AND (s.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['instructor'::user_role, 'admin'::user_role])))))));
CREATE POLICY lesson_reschedule_requests_select_policy ON public.lesson_reschedule_requests FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = lesson_reschedule_requests.student_id) AND (s.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['instructor'::user_role, 'admin'::user_role])))))));
CREATE POLICY lesson_reschedule_requests_update_policy ON public.lesson_reschedule_requests FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = ANY (ARRAY['instructor'::user_role, 'admin'::user_role]))))));
CREATE POLICY notes_delete_policy ON public.notes FOR DELETE TO public
  USING (((author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY notes_insert_policy ON public.notes FOR INSERT TO public
  WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = notes.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM instructor_student_relationships isr
  WHERE ((isr.instructor_id = ( SELECT auth.uid() AS uid)) AND (isr.student_id = notes.student_id) AND (isr.relationship_status = 'active'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))))));
CREATE POLICY notes_select_policy ON public.notes FOR SELECT TO public
  USING (((author_id = ( SELECT auth.uid() AS uid)) OR ((visibility = ANY (ARRAY['shared_with_student'::note_visibility, 'shared_with_guardian'::note_visibility, 'shared_with_instructor'::note_visibility])) AND (EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = notes.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid))))))) OR (EXISTS ( SELECT 1
   FROM instructor_student_relationships isr
  WHERE ((isr.instructor_id = ( SELECT auth.uid() AS uid)) AND (isr.student_id = notes.student_id) AND (isr.relationship_status = 'active'::text)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY notes_update_policy ON public.notes FOR UPDATE TO public
  USING (((author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY payment_events_insert_policy ON public.payment_events FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY payment_events_select_policy ON public.payment_events FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM (payments p
     JOIN students s ON ((s.id = p.student_id)))
  WHERE ((p.id = payment_events.payment_id) AND (s.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY "Students can view their payments" ON public.payments FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = payments.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Students can create their own personal classes" ON public.personal_classes FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = personal_classes.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Students can delete their own personal classes" ON public.personal_classes FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = personal_classes.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Students can update their own personal classes" ON public.personal_classes FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = personal_classes.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Students can view their own personal classes" ON public.personal_classes FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = personal_classes.student_id) AND ((students.profile_id = ( SELECT auth.uid() AS uid)) OR (students.guardian_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Admins can manage all lesson requests" ON public.private_lesson_requests FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Instructors can manage all requests" ON public.private_lesson_requests FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'instructor'::user_role)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'instructor'::user_role)))));
CREATE POLICY private_lesson_requests_delete_policy ON public.private_lesson_requests FOR DELETE TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY private_lesson_requests_insert_policy ON public.private_lesson_requests FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = private_lesson_requests.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY private_lesson_requests_select_policy ON public.private_lesson_requests FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = private_lesson_requests.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY private_lesson_requests_update_policy ON public.private_lesson_requests FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = private_lesson_requests.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO public
  USING ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY profiles_select_policy ON public.profiles FOR SELECT TO public
  USING (can_view_profile(id));
CREATE POLICY promo_ai_budgets_admin_write ON public.promo_ai_budgets FOR ALL TO authenticated
  USING (( SELECT promo_is_admin() AS promo_is_admin))
  WITH CHECK (( SELECT promo_is_admin() AS promo_is_admin));
CREATE POLICY promo_ai_budgets_select ON public.promo_ai_budgets FOR SELECT TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_ai_calls_select ON public.promo_ai_calls FOR SELECT TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_assets_delete ON public.promo_assets FOR DELETE TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_assets_insert ON public.promo_assets FOR INSERT TO authenticated
  WITH CHECK (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) AND ( SELECT promo_is_instructor() AS promo_is_instructor)));
CREATE POLICY promo_assets_select ON public.promo_assets FOR SELECT TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_assets_update ON public.promo_assets FOR UPDATE TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)))
  WITH CHECK (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_brand_kits_admin_write ON public.promo_brand_kits FOR ALL TO authenticated
  USING (( SELECT promo_is_admin() AS promo_is_admin))
  WITH CHECK (( SELECT promo_is_admin() AS promo_is_admin));
CREATE POLICY promo_brand_kits_select ON public.promo_brand_kits FOR SELECT TO authenticated
  USING (( SELECT promo_is_instructor() AS promo_is_instructor));
CREATE POLICY promo_design_revisions_delete ON public.promo_design_revisions FOR DELETE TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_design_revisions_insert ON public.promo_design_revisions FOR INSERT TO authenticated
  WITH CHECK (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) AND (EXISTS ( SELECT 1
   FROM promo_designs d
  WHERE ((d.id = promo_design_revisions.design_id) AND (d.owner_id = ( SELECT promo_owner_id() AS promo_owner_id)))))));
CREATE POLICY promo_design_revisions_select ON public.promo_design_revisions FOR SELECT TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_designs_delete ON public.promo_designs FOR DELETE TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_designs_insert ON public.promo_designs FOR INSERT TO authenticated
  WITH CHECK (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) AND ( SELECT promo_is_instructor() AS promo_is_instructor)));
CREATE POLICY promo_designs_select ON public.promo_designs FOR SELECT TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_designs_update ON public.promo_designs FOR UPDATE TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)))
  WITH CHECK (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_publications_select ON public.promo_publications FOR SELECT TO authenticated
  USING (((owner_id = ( SELECT promo_owner_id() AS promo_owner_id)) OR ( SELECT promo_is_admin() AS promo_is_admin)));
CREATE POLICY promo_template_versions_admin_write ON public.promo_template_versions FOR ALL TO authenticated
  USING (( SELECT promo_is_admin() AS promo_is_admin))
  WITH CHECK (( SELECT promo_is_admin() AS promo_is_admin));
CREATE POLICY promo_template_versions_select ON public.promo_template_versions FOR SELECT TO authenticated
  USING ((( SELECT promo_is_admin() AS promo_is_admin) OR ((published_at IS NOT NULL) AND ( SELECT promo_is_instructor() AS promo_is_instructor))));
CREATE POLICY promo_templates_admin_write ON public.promo_templates FOR ALL TO authenticated
  USING (( SELECT promo_is_admin() AS promo_is_admin))
  WITH CHECK (( SELECT promo_is_admin() AS promo_is_admin));
CREATE POLICY promo_templates_select ON public.promo_templates FOR SELECT TO authenticated
  USING (( SELECT promo_is_instructor() AS promo_is_instructor));
CREATE POLICY "Dancers can delete own reviews" ON public.reviews FOR DELETE TO public
  USING ((student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.profile_id = auth.uid()))));
CREATE POLICY "Dancers can insert own reviews" ON public.reviews FOR INSERT TO public
  WITH CHECK ((student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.profile_id = auth.uid()))));
CREATE POLICY "Dancers can update own reviews" ON public.reviews FOR UPDATE TO public
  USING ((student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.profile_id = auth.uid()))))
  WITH CHECK ((student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.profile_id = auth.uid()))));
CREATE POLICY "Dancers can view own reviews" ON public.reviews FOR SELECT TO public
  USING (((student_id IN ( SELECT s.id
   FROM students s
  WHERE (s.profile_id = auth.uid()))) OR (instructor_id = auth.uid()) OR (auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Admins can view all students" ON public.students FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY "Dancers can update their own student record" ON public.students FOR UPDATE TO public
  USING ((profile_id = auth.uid()))
  WITH CHECK ((profile_id = auth.uid()));
CREATE POLICY "Guardians can update their linked student records" ON public.students FOR UPDATE TO public
  USING ((guardian_id = auth.uid()))
  WITH CHECK ((guardian_id = auth.uid()));
CREATE POLICY students_delete_policy ON public.students FOR DELETE TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY students_insert_policy ON public.students FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY students_select_policy ON public.students FOR SELECT TO public
  USING (((profile_id = ( SELECT auth.uid() AS uid)) OR (guardian_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY students_update_policy ON public.students FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY studio_inquiries_delete_policy ON public.studio_inquiries FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY studio_inquiries_insert_policy ON public.studio_inquiries FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY studio_inquiries_select_policy ON public.studio_inquiries FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY studio_inquiries_update_policy ON public.studio_inquiries FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY studios_delete_policy ON public.studios FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))));
CREATE POLICY studios_insert_policy ON public.studios FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY studios_select_policy ON public.studios FOR SELECT TO public
  USING (true);
CREATE POLICY studios_update_policy ON public.studios FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY "Users can create waiver signatures" ON public.waiver_signatures FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM waivers
  WHERE ((waivers.id = waiver_signatures.waiver_id) AND (( SELECT auth.uid() AS uid) = waivers.recipient_id)))) AND (( SELECT auth.uid() AS uid) = signed_by_id)));
CREATE POLICY "Users can view waiver signatures with proper access" ON public.waiver_signatures FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM waivers
  WHERE ((waivers.id = waiver_signatures.waiver_id) AND ((( SELECT auth.uid() AS uid) = waivers.issued_by_id) OR (( SELECT auth.uid() AS uid) = waivers.recipient_id) OR (( SELECT auth.uid() AS uid) = waivers.signed_by_id) OR (EXISTS ( SELECT 1
           FROM profiles
          WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))) OR (EXISTS ( SELECT 1
           FROM (students
             JOIN profiles ON ((profiles.id = ( SELECT auth.uid() AS uid))))
          WHERE ((students.guardian_id = ( SELECT auth.uid() AS uid)) AND (students.profile_id = waivers.recipient_id)))))))));
CREATE POLICY waiver_templates_delete_policy ON public.waiver_templates FOR DELETE TO public
  USING (((created_by_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY waiver_templates_insert_policy ON public.waiver_templates FOR INSERT TO public
  WITH CHECK (((created_by_id = ( SELECT auth.uid() AS uid)) AND ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))))));
CREATE POLICY waiver_templates_select_policy ON public.waiver_templates FOR SELECT TO public
  USING (((created_by_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'instructor'::user_role)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY waiver_templates_update_policy ON public.waiver_templates FOR UPDATE TO public
  USING (((created_by_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role))))));
CREATE POLICY "Users can create waivers" ON public.waivers FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['instructor'::user_role, 'admin'::user_role]))))));
CREATE POLICY "Users can update waivers" ON public.waivers FOR UPDATE TO public
  USING (((issued_by_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))) OR (EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = waivers.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "Users can view waivers with proper access" ON public.waivers FOR SELECT TO public
  USING (((issued_by_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::user_role)))) OR (EXISTS ( SELECT 1
   FROM students
  WHERE ((students.id = waivers.student_id) AND (students.profile_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM instructor_student_relationships
  WHERE ((instructor_student_relationships.student_id = waivers.student_id) AND (instructor_student_relationships.instructor_id = ( SELECT auth.uid() AS uid)) AND (instructor_student_relationships.relationship_status = 'active'::text))))));

-- Grants
--
-- Supabase grants every new table, view and function in public to anon,
-- authenticated and service_role. These narrow that default.

REVOKE ALL ON public.public_profiles FROM anon, authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;

REVOKE ALL ON
  public.promo_ai_budgets, public.promo_ai_calls, public.promo_ai_monthly, public.promo_assets,
  public.promo_brand_kits, public.promo_design_revisions, public.promo_designs,
  public.promo_publications, public.promo_template_versions, public.promo_templates
  FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.promo_ai_calls, public.promo_publications FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.promo_owner_id(), public.promo_is_admin(), public.promo_is_instructor() FROM PUBLIC, anon;

-- Storage buckets

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('assets', 'assets', true, 10485760, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('headshots', 'headshots', true, 5242880, '{image/jpeg,image/png,image/webp,image/GIF}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('promo-private', 'promo-private', false, 52428800, '{image/jpeg,image/png}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('Public_Images', 'Public_Images', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('studio logos', 'studio logos', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('waiver-signatures', 'waiver-signatures', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- Storage policies (Supabase enables RLS on storage.objects)

CREATE POLICY "Allow authenticated users to read assets" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'assets'::text));
CREATE POLICY "Allow authenticated users to read headshots" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'headshots'::text));
CREATE POLICY "Allow instructors to delete their own assets" ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'assets'::text) AND (((auth.uid())::text = (storage.foldername(name))[1]) OR (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::user_role))));
CREATE POLICY "Allow instructors to update their own assets" ON storage.objects FOR UPDATE TO authenticated
  USING (((bucket_id = 'assets'::text) AND (((auth.uid())::text = (storage.foldername(name))[1]) OR (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::user_role))));
CREATE POLICY "Allow instructors to upload assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'assets'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]) AND (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['instructor'::user_role, 'admin'::user_role]))));
CREATE POLICY "Allow users to delete their own headshot" ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'headshots'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Allow users to update their own headshot" ON storage.objects FOR UPDATE TO authenticated
  USING (((bucket_id = 'headshots'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Allow users to upload their own headshot" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'headshots'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Public read access" ON storage.objects FOR SELECT TO public
  USING ((bucket_id = 'studio logos'::text));
CREATE POLICY "Users can upload waiver signatures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'waiver-signatures'::text) AND ((storage.foldername(name))[1] = ('waiver-'::text || (auth.uid())::text))));
CREATE POLICY promo_private_delete ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'promo-private'::text) AND (((storage.foldername(name))[1] = (( SELECT promo_owner_id() AS promo_owner_id))::text) OR ( SELECT promo_is_admin() AS promo_is_admin))));
CREATE POLICY promo_private_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'promo-private'::text) AND ((((storage.foldername(name))[1] = (( SELECT promo_owner_id() AS promo_owner_id))::text) AND ( SELECT promo_is_instructor() AS promo_is_instructor)) OR ( SELECT promo_is_admin() AS promo_is_admin))));
CREATE POLICY promo_private_select ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'promo-private'::text) AND (((storage.foldername(name))[1] = (( SELECT promo_owner_id() AS promo_owner_id))::text) OR ( SELECT promo_is_admin() AS promo_is_admin) OR (((storage.foldername(name))[1] = 'brand'::text) AND ( SELECT promo_is_instructor() AS promo_is_instructor)))));
CREATE POLICY promo_private_update ON storage.objects FOR UPDATE TO authenticated
  USING (((bucket_id = 'promo-private'::text) AND (((storage.foldername(name))[1] = (( SELECT promo_owner_id() AS promo_owner_id))::text) OR ( SELECT promo_is_admin() AS promo_is_admin))))
  WITH CHECK (((bucket_id = 'promo-private'::text) AND ((((storage.foldername(name))[1] = (( SELECT promo_owner_id() AS promo_owner_id))::text) AND ( SELECT promo_is_instructor() AS promo_is_instructor)) OR ( SELECT promo_is_admin() AS promo_is_admin))));

-- Comments

COMMENT ON TABLE public.class_purchases IS 'Paid Stripe checkouts on class sign-up links; student_id NULL = paid, not yet linked to a dancer';
COMMENT ON COLUMN public.classes.pricing_model IS 'Pricing model: per_person, per_class (flat rate), per_hour, or tiered';
COMMENT ON COLUMN public.classes.base_cost IS 'Base/flat cost for per_class model or base cost for tiered model';
COMMENT ON COLUMN public.classes.cost_per_person IS 'Cost per person for per_person pricing model';
COMMENT ON COLUMN public.classes.cost_per_hour IS 'Cost per hour for per_hour pricing model';
COMMENT ON COLUMN public.classes.tiered_base_students IS 'Number of students included in base cost for tiered pricing';
COMMENT ON COLUMN public.classes.tiered_additional_cost IS 'Cost per additional student beyond base count for tiered pricing';
COMMENT ON COLUMN public.classes.actual_attendance_count IS 'Manual override for actual number of students who attended the class. If null, use enrollment count instead.';
COMMENT ON COLUMN public.classes.external_signup_url IS 'External URL for class signup (e.g., Eventbrite, external booking system). When set, dancers are directed to this URL instead of internal enrollment.';
COMMENT ON COLUMN public.classes.is_public IS 'When true, class is visible to all dancers and guardians in their portal for enrollment. When false, class is only visible to instructor.';
COMMENT ON COLUMN public.classes.asset_id IS 'Optional promotional image or document for the class';
COMMENT ON COLUMN public.classes.series_id IS 'Shared by every day of a multi-day workshop or recurring class batch; NULL for standalone classes';
COMMENT ON COLUMN public.classes.workshop_price IS 'Per-person price for the whole multi-day workshop; NULL when only single days are sold';
COMMENT ON COLUMN public.classes.workshop_signup_url IS 'External payment/sign-up link for the whole workshop';
COMMENT ON COLUMN public.classes.workshop_full_only IS 'True when the workshop is sold as a full run only (no single-day drop-ins)';
COMMENT ON COLUMN public.classes.share_slug IS 'Readable slug for the public /classes/<slug> link; set once, never changed';
COMMENT ON COLUMN public.enrollments.workshop_pass IS 'True when the dancer enrolled in the whole workshop rather than a single day';
COMMENT ON TABLE public.instructor_access_requests IS 'Stores instructor signup requests pending manual approval';
COMMENT ON COLUMN public.lesson_pack_usage.class_id IS 'The class this credit was spent on; NULL if the class was deleted.';
COMMENT ON COLUMN public.lesson_pack_usage.voided_at IS 'Set when the credit is refunded back to the pack (cancellation, deletion, instructor reinstate).';
COMMENT ON COLUMN public.lesson_pack_usage.voided_reason IS 'Free-text reason for the void (e.g. cancelled_outside_24h, class_deleted, instructor_reinstated).';
COMMENT ON COLUMN public.private_lesson_requests.instructor_id IS 'The instructor this lesson request is directed to';
COMMENT ON COLUMN public.private_lesson_requests.scheduled_class_id IS 'Links to the class created from this lesson request';
COMMENT ON COLUMN public.profiles.linked_profile_id IS 'If set, this profile is linked to another primary profile. When user signs in with this account, system redirects all operations to the primary profile.';
COMMENT ON TABLE public.promo_assets IS 'Promo Studio photo library. Files live in the private promo-private bucket under {owner_id}/assets/{id}/.';
COMMENT ON VIEW public.public_profiles IS 'Non-sensitive directory view of profiles (id, full_name, avatar_url, role). Runs as owner and bypasses RLS on profiles by design; therefore SELECT-only, and granted to authenticated only. Never grant write verbs or anon access here - the view is auto-updatable and the owner has BYPASSRLS, so any write grant is a direct RLS bypass into profiles.';
COMMENT ON TABLE public.students IS 'Student roster. RLS policies optimized for performance using subqueries.';
COMMENT ON COLUMN public.students.full_name IS 'Direct storage for non-registered students. Null if profile_id is set.';
COMMENT ON COLUMN public.students.email IS 'Direct storage for non-registered students. Null if profile_id is set.';
COMMENT ON COLUMN public.students.phone IS 'Direct storage for non-registered students. Null if profile_id is set.';
COMMENT ON TABLE public.studios IS 'Studio location information. RLS policies optimized for performance using subqueries.';
COMMENT ON TABLE public.waiver_templates IS 'Reusable waiver templates. RLS policies optimized for performance using subqueries.';
COMMENT ON TABLE public.waivers IS 'Waiver instances. RLS policies optimized for performance using subqueries.';
COMMENT ON COLUMN public.waivers.recipient_id IS 'References auth.users. Use this when issuing to users with auth accounts. Either recipient_id or student_id (or both) must be set.';
COMMENT ON COLUMN public.waivers.student_id IS 'References student directly. Use this when issuing to students without auth accounts. Either recipient_id or student_id (or both) must be set.';
COMMENT ON FUNCTION public.can_user_view_class(uuid, uuid) IS 'RLS helper for classes: may the given user see the given class via an enrollment or private lesson request? SECURITY DEFINER to avoid recursing into RLS. The user_id argument must equal auth.uid() - the function refuses any other subject so it cannot be used as a membership oracle via /rest/v1/rpc/.';
COMMENT ON FUNCTION public.can_view_profile(uuid) IS 'Returns TRUE when the current auth.uid() may view the full PII of the target profile. Uses SECURITY DEFINER to avoid RLS recursion on profiles.';
COMMENT ON FUNCTION public.promo_is_admin() IS 'True when the caller''s primary profile is an admin.';
COMMENT ON FUNCTION public.promo_is_instructor() IS 'True when the caller''s primary profile is an instructor or admin.';
COMMENT ON FUNCTION public.promo_owner_id() IS 'Primary profile id for the caller (follows linked_profile_id). Promo Studio ownership key.';
COMMENT ON FUNCTION public.protect_profile_privileges() IS 'Blocks API users from changing profiles.role or profiles.linked_profile_id (migration 48).';
