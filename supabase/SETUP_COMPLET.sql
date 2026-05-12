-- ============================================================
-- STUDY'S — Script SQL de configuration complète
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor
-- Supabase Dashboard > SQL Editor > New query > Coller > Run
-- ============================================================


-- ============================================================
-- PARTIE 1 : EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";


-- ============================================================
-- PARTIE 2 : TYPES ÉNUMÉRÉS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE academic_level AS ENUM (
    'terminale', 'bts_1', 'bts_2',
    'licence_1', 'licence_2', 'licence_3',
    'master_1', 'master_2', 'doctorat'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE post_type AS ENUM (
    'general', 'exam_subject', 'course_document',
    'event', 'announcement', 'conference', 'soutenance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('image', 'pdf', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'like', 'comment', 'reply',
    'friend_request', 'friend_accepted',
    'message', 'mention', 'post_share'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- PARTIE 3 : TABLES
-- ============================================================

-- ─── profiles ───────────────────────────────────────────────
-- Extension de auth.users — créée automatiquement à l'inscription
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  avatar_url      TEXT,
  cover_url       TEXT,
  bio             TEXT,
  phone           TEXT,
  academic_level  academic_level,
  field_of_study  TEXT,           -- Filière (saisie libre)
  institution     TEXT,           -- Établissement (saisie libre)
  city            TEXT,
  website         TEXT,
  role            user_role    NOT NULL DEFAULT 'user',
  is_public       BOOLEAN      NOT NULL DEFAULT true,
  is_verified     BOOLEAN      NOT NULL DEFAULT false,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  post_count      INTEGER      NOT NULL DEFAULT 0,
  friend_count    INTEGER      NOT NULL DEFAULT 0,
  last_seen_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username       ON profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_academic_level ON profiles (academic_level);
CREATE INDEX IF NOT EXISTS idx_profiles_institution    ON profiles USING gin (institution gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_field          ON profiles USING gin (field_of_study gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name      ON profiles USING gin (full_name gin_trgm_ops);


-- ─── posts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id         UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           TEXT,
  post_type         post_type    NOT NULL DEFAULT 'general',

  -- Champs académiques (obligatoires pour exam_subject / course_document)
  subject_name      TEXT,
  professor_name    TEXT,
  academic_level    academic_level,
  institution       TEXT,
  exam_year         INTEGER CHECK (exam_year IS NULL OR (exam_year >= 1990 AND exam_year <= 2100)),

  -- Champs événement
  event_date        TIMESTAMPTZ,
  event_location    TEXT,
  event_url         TEXT,

  -- Compteurs dénormalisés (maintenus par triggers)
  like_count        INTEGER      NOT NULL DEFAULT 0,
  comment_count     INTEGER      NOT NULL DEFAULT 0,
  share_count       INTEGER      NOT NULL DEFAULT 0,
  view_count        INTEGER      NOT NULL DEFAULT 0,

  -- Modération
  moderation_status moderation_status NOT NULL DEFAULT 'approved',
  is_pinned         BOOLEAN      NOT NULL DEFAULT false,
  is_deleted        BOOLEAN      NOT NULL DEFAULT false,

  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author         ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_type           ON posts (post_type);
CREATE INDEX IF NOT EXISTS idx_posts_academic_level ON posts (academic_level);
CREATE INDEX IF NOT EXISTS idx_posts_created        ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_moderation     ON posts (moderation_status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_posts_subject        ON posts USING gin (subject_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_institution    ON posts USING gin (institution gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_content        ON posts USING gin (content gin_trgm_ops);


-- ─── post_media ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_media (
  id            UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID       NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type    media_type NOT NULL,
  url           TEXT       NOT NULL,
  thumbnail_url TEXT,
  file_name     TEXT,
  file_size     INTEGER    CHECK (file_size IS NULL OR file_size > 0),
  width         INTEGER,
  height        INTEGER,
  position      SMALLINT   NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media (post_id, position);


-- ─── post_likes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes (user_id);


-- ─── comments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id   UUID        REFERENCES comments(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 2000),
  like_count  INTEGER     NOT NULL DEFAULT 0,
  is_deleted  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);


-- ─── comment_likes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_likes (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id  UUID        NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);


-- ─── friendships ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       friendship_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status);


-- ─── conversations ──────────────────────────────────────────
-- Messagerie : un seul enregistrement par paire d'utilisateurs
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_1, participant_2),
  CHECK (participant_1 <> participant_2)
);

CREATE INDEX IF NOT EXISTS idx_conversations_p1      ON conversations (participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_p2      ON conversations (participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_at ON conversations (last_message_at DESC NULLS LAST);


-- ─── messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT        NOT NULL CHECK (LENGTH(content) BETWEEN 1 AND 5000),
  media_url        TEXT,
  is_read          BOOLEAN     NOT NULL DEFAULT false,
  is_deleted       BOOLEAN     NOT NULL DEFAULT false,
  is_first_message BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender       ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread       ON messages (conversation_id) WHERE is_read = false;


-- ─── notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id     UUID              REFERENCES profiles(id) ON DELETE SET NULL,
  type          notification_type NOT NULL,
  title         TEXT              NOT NULL,
  body          TEXT,
  resource_type TEXT,
  resource_id   UUID,
  is_read       BOOLEAN           NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread    ON notifications (recipient_id) WHERE is_read = false;


-- ─── post_saves (signets) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS post_saves (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_saves_user ON post_saves (user_id, created_at DESC);


-- ─── user_interests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_interests (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest   TEXT        NOT NULL,
  score      FLOAT8      NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, interest)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests (user_id);


-- ─── post_reports (modération) ──────────────────────────────
CREATE TABLE IF NOT EXISTS post_reports (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT        NOT NULL,
  details     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  resolved_by UUID        REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, reporter_id)
);


-- ─── push_subscriptions (PWA) ───────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);


-- ============================================================
-- PARTIE 4 : FONCTIONS ET TRIGGERS
-- ============================================================

-- ─── updated_at automatique ─────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ─── Compteur like_count sur posts ──────────────────────────
CREATE OR REPLACE FUNCTION fn_update_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_post_like_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION fn_update_post_like_count();


-- ─── Compteur comment_count sur posts ───────────────────────
CREATE OR REPLACE FUNCTION fn_update_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_update_comment_count();


-- ─── Compteur friend_count sur profiles ─────────────────────
CREATE OR REPLACE FUNCTION fn_update_friend_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    UPDATE profiles SET friend_count = friend_count + 1
    WHERE id IN (NEW.requester_id, NEW.addressee_id);

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
      UPDATE profiles SET friend_count = friend_count + 1
      WHERE id IN (NEW.requester_id, NEW.addressee_id);
    ELSIF NEW.status <> 'accepted' AND OLD.status = 'accepted' THEN
      UPDATE profiles SET friend_count = GREATEST(friend_count - 1, 0)
      WHERE id IN (NEW.requester_id, NEW.addressee_id);
    END IF;

  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    UPDATE profiles SET friend_count = GREATEST(friend_count - 1, 0)
    WHERE id IN (OLD.requester_id, OLD.addressee_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_friend_count
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW EXECUTE FUNCTION fn_update_friend_count();


-- ─── Compteur post_count sur profiles ───────────────────────
CREATE OR REPLACE FUNCTION fn_update_post_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_post_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION fn_update_post_count();


-- ─── Création automatique du profil à l'inscription ─────────
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Génère un username unique depuis l'email
  v_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  IF LENGTH(v_username) < 3 THEN v_username := 'user' || v_username; END IF;

  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_username) LOOP
    v_username := v_username || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  END LOOP;

  INSERT INTO profiles (
    id, username, full_name, first_name, last_name,
    academic_level, field_of_study, institution
  ) VALUES (
    NEW.id,
    v_username,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Utilisateur'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), ''),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'academic_level' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'academic_level')::academic_level
      ELSE NULL
    END,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'field_of_study'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'institution'), '')
  );

  RETURN NEW;
END;
$$;

-- Supprimer et recréer le trigger pour éviter les doublons
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();


-- ─── Moteur de recommandation du fil d'actualité ────────────
CREATE OR REPLACE FUNCTION get_recommended_feed(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 20,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE (post_id UUID, relevance_score FLOAT8)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_level       academic_level;
  v_field       TEXT;
  v_institution TEXT;
BEGIN
  SELECT academic_level, field_of_study, institution
  INTO v_level, v_field, v_institution
  FROM profiles WHERE id = p_user_id;

  RETURN QUERY
  WITH friend_ids AS (
    SELECT
      CASE WHEN requester_id = p_user_id THEN addressee_id ELSE requester_id END AS fid
    FROM friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status = 'accepted'
  ),
  scored AS (
    SELECT
      p.id AS pid,
      (
        -- Ami : +35 pts
        CASE WHEN p.author_id IN (SELECT fid FROM friend_ids) THEN 35.0::FLOAT8 ELSE 0.0 END
        -- Même établissement : +25 pts
        + CASE WHEN p.institution = v_institution AND v_institution IS NOT NULL
               THEN 25.0::FLOAT8 ELSE 0.0 END
        -- Même filière (similarité texte) : +10 pts
        + CASE WHEN v_field IS NOT NULL
                AND similarity(COALESCE(p.institution,''), v_field) > 0.3
               THEN 10.0::FLOAT8 ELSE 0.0 END
        -- Même niveau académique : +15 pts
        + CASE WHEN p.academic_level = v_level AND v_level IS NOT NULL
               THEN 15.0::FLOAT8 ELSE 0.0 END
        -- Engagement : max +20 pts
        + LEAST(
            p.like_count::FLOAT8 * 0.5
            + p.comment_count::FLOAT8 * 1.5
            + p.view_count::FLOAT8 * 0.1,
            20.0
          )
        -- Fraîcheur : -2 pts par jour écoulé
        - EXTRACT(EPOCH FROM (NOW() - p.created_at))::FLOAT8 / 86400.0 * 2.0
      )::FLOAT8 AS score
    FROM posts p
    WHERE p.is_deleted = false
      AND p.moderation_status = 'approved'
      AND p.author_id <> p_user_id
  )
  SELECT pid, score
  FROM scored
  ORDER BY score DESC, pid
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


-- ─── Suggestions d'amis ─────────────────────────────────────
CREATE OR REPLACE FUNCTION get_friend_suggestions(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 10
)
RETURNS TABLE (suggested_id UUID, common_friends INTEGER, match_score FLOAT8)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH my_friends AS (
    SELECT CASE WHEN requester_id = p_user_id THEN addressee_id ELSE requester_id END AS fid
    FROM friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id) AND status = 'accepted'
  ),
  my_profile AS (
    SELECT academic_level, field_of_study, institution
    FROM profiles WHERE id = p_user_id
  ),
  candidates AS (
    SELECT DISTINCT
      p.id,
      COUNT(DISTINCT mf.fid)::INTEGER                              AS cc,
      (
        COUNT(DISTINCT mf.fid)::FLOAT8 * 20.0
        + CASE WHEN p.institution = mp.institution
                AND mp.institution IS NOT NULL THEN 30.0::FLOAT8 ELSE 0.0 END
        + CASE WHEN p.field_of_study = mp.field_of_study
                AND mp.field_of_study IS NOT NULL THEN 25.0::FLOAT8 ELSE 0.0 END
        + CASE WHEN p.academic_level = mp.academic_level
                AND mp.academic_level IS NOT NULL THEN 15.0::FLOAT8 ELSE 0.0 END
      )::FLOAT8 AS ms
    FROM profiles p
    CROSS JOIN my_profile mp
    LEFT JOIN (
      SELECT
        CASE WHEN f.requester_id = mf2.fid THEN f.addressee_id ELSE f.requester_id END AS candidate
      FROM friendships f
      JOIN my_friends mf2 ON mf2.fid IN (f.requester_id, f.addressee_id)
      WHERE f.status = 'accepted'
    ) fof ON fof.candidate = p.id
    LEFT JOIN my_friends mf ON mf.fid = p.id
    WHERE p.id <> p_user_id
      AND mf.fid IS NULL
      AND p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE (requester_id = p_user_id AND addressee_id = p.id)
           OR (requester_id = p.id AND addressee_id = p_user_id)
      )
    GROUP BY p.id, mp.institution, mp.field_of_study, mp.academic_level
  )
  SELECT id, cc, ms
  FROM candidates
  WHERE ms > 0
  ORDER BY ms DESC
  LIMIT p_limit;
END;
$$;


-- ============================================================
-- PARTIE 5 : ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;


-- ─── Fonctions helper RLS ───────────────────────────────────
CREATE OR REPLACE FUNCTION fn_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
$$;

CREATE OR REPLACE FUNCTION fn_are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = user_a AND addressee_id = user_b)
        OR
        (requester_id = user_b AND addressee_id = user_a)
      )
  );
$$;


-- ─── Policies : profiles ────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    is_public = true
    OR id = auth.uid()
    OR fn_are_friends(id, auth.uid())
    OR fn_is_admin()
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid() OR fn_is_admin())
  WITH CHECK (id = auth.uid() OR fn_is_admin());


-- ─── Policies : posts ───────────────────────────────────────
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (
    is_deleted = false
    AND (moderation_status = 'approved' OR author_id = auth.uid() OR fn_is_admin())
  );

DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "posts_update" ON posts;
CREATE POLICY "posts_update" ON posts
  FOR UPDATE
  USING  (author_id = auth.uid() OR fn_is_admin())
  WITH CHECK (author_id = auth.uid() OR fn_is_admin());

DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (author_id = auth.uid() OR fn_is_admin());


-- ─── Policies : post_media ──────────────────────────────────
DROP POLICY IF EXISTS "post_media_select" ON post_media;
CREATE POLICY "post_media_select" ON post_media
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_media.post_id AND posts.is_deleted = false)
  );

DROP POLICY IF EXISTS "post_media_insert" ON post_media;
CREATE POLICY "post_media_insert" ON post_media
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_media.post_id AND posts.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "post_media_delete" ON post_media;
CREATE POLICY "post_media_delete" ON post_media
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_media.post_id
            AND (posts.author_id = auth.uid() OR fn_is_admin()))
  );


-- ─── Policies : post_likes ──────────────────────────────────
DROP POLICY IF EXISTS "post_likes_select" ON post_likes;
CREATE POLICY "post_likes_select" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_likes_insert" ON post_likes;
CREATE POLICY "post_likes_insert" ON post_likes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_likes_delete" ON post_likes;
CREATE POLICY "post_likes_delete" ON post_likes FOR DELETE USING (user_id = auth.uid());


-- ─── Policies : comments ────────────────────────────────────
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (is_deleted = false OR author_id = auth.uid() OR fn_is_admin());

DROP POLICY IF EXISTS "comments_insert" ON comments;
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "comments_update" ON comments;
CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (author_id = auth.uid() OR fn_is_admin());


-- ─── Policies : comment_likes ───────────────────────────────
DROP POLICY IF EXISTS "comment_likes_select" ON comment_likes;
CREATE POLICY "comment_likes_select" ON comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "comment_likes_insert" ON comment_likes;
CREATE POLICY "comment_likes_insert" ON comment_likes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comment_likes_delete" ON comment_likes;
CREATE POLICY "comment_likes_delete" ON comment_likes FOR DELETE USING (user_id = auth.uid());


-- ─── Policies : friendships ─────────────────────────────────
DROP POLICY IF EXISTS "friendships_select" ON friendships;
CREATE POLICY "friendships_select" ON friendships
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid() OR fn_is_admin());

DROP POLICY IF EXISTS "friendships_insert" ON friendships;
CREATE POLICY "friendships_insert" ON friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "friendships_update" ON friendships;
CREATE POLICY "friendships_update" ON friendships
  FOR UPDATE USING (addressee_id = auth.uid() OR requester_id = auth.uid() OR fn_is_admin());

DROP POLICY IF EXISTS "friendships_delete" ON friendships;
CREATE POLICY "friendships_delete" ON friendships
  FOR DELETE USING (requester_id = auth.uid() OR addressee_id = auth.uid() OR fn_is_admin());


-- ─── Policies : conversations ───────────────────────────────
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (participant_1 = auth.uid() OR participant_2 = auth.uid());


-- ─── Policies : messages ────────────────────────────────────
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );


-- ─── Policies : notifications ───────────────────────────────
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true); -- Géré côté serveur (service_role)


-- ─── Policies : post_saves ──────────────────────────────────
DROP POLICY IF EXISTS "post_saves_select" ON post_saves;
CREATE POLICY "post_saves_select" ON post_saves FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "post_saves_insert" ON post_saves;
CREATE POLICY "post_saves_insert" ON post_saves FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_saves_delete" ON post_saves;
CREATE POLICY "post_saves_delete" ON post_saves FOR DELETE USING (user_id = auth.uid());


-- ─── Policies : user_interests ──────────────────────────────
DROP POLICY IF EXISTS "user_interests_all" ON user_interests;
CREATE POLICY "user_interests_all" ON user_interests FOR ALL USING (user_id = auth.uid());


-- ─── Policies : post_reports ────────────────────────────────
DROP POLICY IF EXISTS "post_reports_insert" ON post_reports;
CREATE POLICY "post_reports_insert" ON post_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "post_reports_select" ON post_reports;
CREATE POLICY "post_reports_select" ON post_reports
  FOR SELECT USING (reporter_id = auth.uid() OR fn_is_admin());


-- ─── Policies : push_subscriptions ─────────────────────────
DROP POLICY IF EXISTS "push_subscriptions_all" ON push_subscriptions;
CREATE POLICY "push_subscriptions_all" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());


-- ============================================================
-- PARTIE 6 : STORAGE — BUCKETS ET POLICIES
-- ============================================================

-- Créer les buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'studys-uploads',
    'studys-uploads',
    true,
    52428800,  -- 50 Mo max
    ARRAY[
      'image/jpeg', 'image/jpg', 'image/png',
      'image/webp', 'image/gif', 'application/pdf'
    ]
  ),
  (
    'avatars',
    'avatars',
    true,
    5242880,   -- 5 Mo max
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public           = EXCLUDED.public,
  file_size_limit  = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ─── Policies storage : studys-uploads ──────────────────────
DROP POLICY IF EXISTS "uploads_select_public"  ON storage.objects;
DROP POLICY IF EXISTS "uploads_insert_auth"    ON storage.objects;
DROP POLICY IF EXISTS "uploads_update_auth"    ON storage.objects;
DROP POLICY IF EXISTS "uploads_delete_auth"    ON storage.objects;

CREATE POLICY "uploads_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'studys-uploads');

CREATE POLICY "uploads_insert_auth" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'studys-uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "uploads_update_auth" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'studys-uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "uploads_delete_auth" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'studys-uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );


-- ─── Policies storage : avatars ─────────────────────────────
DROP POLICY IF EXISTS "avatars_select_public"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_auth"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_auth"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_auth"    ON storage.objects;

CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_auth" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_update_auth" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_delete_auth" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );


-- ============================================================
-- PARTIE 7 : REALTIME — Activer les tables nécessaires
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;


-- ============================================================
-- FIN DU SCRIPT
-- Vérification finale
-- ============================================================

SELECT
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS colonnes
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
