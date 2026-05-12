-- =====================================================
-- STUDY'S — Migration 001: Schéma initial complet
-- =====================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =====================================================
-- TYPES & ENUMS
-- =====================================================

CREATE TYPE academic_level AS ENUM (
  'terminale',
  'bts_1',
  'bts_2',
  'licence_1',
  'licence_2',
  'licence_3',
  'master_1',
  'master_2',
  'doctorat'
);

CREATE TYPE post_type AS ENUM (
  'general',
  'exam_subject',
  'course_document',
  'event',
  'announcement',
  'conference',
  'soutenance'
);

CREATE TYPE media_type AS ENUM ('image', 'pdf', 'video');

CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');

CREATE TYPE notification_type AS ENUM (
  'like',
  'comment',
  'reply',
  'friend_request',
  'friend_accepted',
  'message',
  'mention',
  'post_share'
);

CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');

-- =====================================================
-- TABLE: profiles
-- Extension de auth.users de Supabase
-- =====================================================

CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username          TEXT UNIQUE NOT NULL,
  full_name         TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  avatar_url        TEXT,
  cover_url         TEXT,
  bio               TEXT,
  phone             TEXT,
  academic_level    academic_level,
  field_of_study    TEXT,           -- filière (saisie libre)
  institution       TEXT,           -- établissement (saisie libre)
  city              TEXT,
  website           TEXT,
  role              user_role DEFAULT 'user',
  is_public         BOOLEAN DEFAULT true,
  is_verified       BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  post_count        INTEGER DEFAULT 0,
  friend_count      INTEGER DEFAULT 0,
  last_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_institution ON profiles USING gin(institution gin_trgm_ops);
CREATE INDEX idx_profiles_field_of_study ON profiles USING gin(field_of_study gin_trgm_ops);
CREATE INDEX idx_profiles_academic_level ON profiles(academic_level);
CREATE INDEX idx_profiles_full_name ON profiles USING gin(full_name gin_trgm_ops);

-- =====================================================
-- TABLE: posts
-- =====================================================

CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content           TEXT,
  post_type         post_type DEFAULT 'general',

  -- Champs académiques (requis pour exam_subject et course_document)
  subject_name      TEXT,           -- matière
  professor_name    TEXT,           -- nom du professeur
  academic_level    academic_level, -- niveau concerné
  institution       TEXT,           -- établissement concerné
  exam_year         INTEGER,        -- année de l'examen

  -- Métadonnées événement
  event_date        TIMESTAMPTZ,
  event_location    TEXT,
  event_url         TEXT,

  -- Engagement
  like_count        INTEGER DEFAULT 0,
  comment_count     INTEGER DEFAULT 0,
  share_count       INTEGER DEFAULT 0,
  view_count        INTEGER DEFAULT 0,

  -- Modération
  moderation_status moderation_status DEFAULT 'approved',
  is_pinned         BOOLEAN DEFAULT false,
  is_deleted        BOOLEAN DEFAULT false,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_type ON posts(post_type);
CREATE INDEX idx_posts_academic_level ON posts(academic_level);
CREATE INDEX idx_posts_subject ON posts USING gin(subject_name gin_trgm_ops);
CREATE INDEX idx_posts_institution ON posts USING gin(institution gin_trgm_ops);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_content ON posts USING gin(content gin_trgm_ops);

-- =====================================================
-- TABLE: post_media
-- =====================================================

CREATE TABLE post_media (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type    media_type NOT NULL,
  url           TEXT NOT NULL,
  thumbnail_url TEXT,           -- aperçu pour PDF
  file_name     TEXT,
  file_size     INTEGER,        -- en bytes
  width         INTEGER,
  height        INTEGER,
  position      SMALLINT DEFAULT 0, -- ordre dans la grille
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_media_post ON post_media(post_id);

-- =====================================================
-- TABLE: post_likes
-- =====================================================

CREATE TABLE post_likes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);

-- =====================================================
-- TABLE: comments
-- =====================================================

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE, -- pour les réponses
  content     TEXT NOT NULL,
  like_count  INTEGER DEFAULT 0,
  is_deleted  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- =====================================================
-- TABLE: comment_likes
-- =====================================================

CREATE TABLE comment_likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- =====================================================
-- TABLE: friendships
-- =====================================================

CREATE TABLE friendships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      friendship_status DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK(requester_id <> addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- =====================================================
-- TABLE: conversations
-- =====================================================

CREATE TABLE conversations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message   TEXT,
  last_message_at TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT false, -- devient true quand les 2 ont échangé
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2),
  CHECK(participant_1 <> participant_2)
);

CREATE INDEX idx_conversations_p1 ON conversations(participant_1);
CREATE INDEX idx_conversations_p2 ON conversations(participant_2);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC NULLS LAST);

-- =====================================================
-- TABLE: messages
-- =====================================================

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL,
  media_url        TEXT,
  is_read          BOOLEAN DEFAULT false,
  is_deleted       BOOLEAN DEFAULT false,
  is_first_message BOOLEAN DEFAULT false, -- premier message (avant acceptation)
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id) WHERE is_read = false;

-- =====================================================
-- TABLE: notifications
-- =====================================================

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type              notification_type NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  resource_type     TEXT,   -- 'post', 'comment', 'message', etc.
  resource_id       UUID,
  is_read           BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE is_read = false;

-- =====================================================
-- TABLE: post_saves (bookmarks)
-- =====================================================

CREATE TABLE post_saves (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_saves_user ON post_saves(user_id);

-- =====================================================
-- TABLE: user_interests
-- Centre d'intérêt pour le système de recommandation
-- =====================================================

CREATE TABLE user_interests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest   TEXT NOT NULL,
  score      FLOAT DEFAULT 1.0, -- score de pertinence (mis à jour automatiquement)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

CREATE INDEX idx_user_interests_user ON user_interests(user_id);

-- =====================================================
-- TABLE: post_reports (modération)
-- =====================================================

CREATE TABLE post_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id      UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  details      TEXT,
  status       TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  resolved_by  UUID REFERENCES profiles(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);

-- =====================================================
-- TABLE: push_subscriptions (notifications push PWA)
-- =====================================================

CREATE TABLE push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger updated_at sur profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger updated_at sur posts
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger updated_at sur comments
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger updated_at sur friendships
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- COMPTEURS DÉNORMALISÉS (performances)
-- =====================================================

-- like_count sur posts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_like_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- comment_count sur posts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_comment_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- friend_count sur profiles
CREATE OR REPLACE FUNCTION update_friend_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    UPDATE profiles SET friend_count = friend_count + 1 WHERE id IN (NEW.requester_id, NEW.addressee_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE profiles SET friend_count = friend_count + 1 WHERE id IN (NEW.requester_id, NEW.addressee_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status != 'accepted' AND OLD.status = 'accepted' THEN
    UPDATE profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id IN (NEW.requester_id, NEW.addressee_id);
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    UPDATE profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id IN (OLD.requester_id, OLD.addressee_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_friend_count();

-- post_count sur profiles
CREATE OR REPLACE FUNCTION update_profile_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET post_count = post_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_post_count_trigger
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_profile_post_count();

-- =====================================================
-- FONCTION: Créer un profil automatiquement à l'inscription
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  -- Génère un username depuis l'email
  generated_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  -- Rend le username unique si nécessaire
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = generated_username) LOOP
    generated_username := generated_username || FLOOR(RANDOM() * 9999)::TEXT;
  END LOOP;

  INSERT INTO profiles (
    id,
    username,
    full_name,
    first_name,
    last_name,
    academic_level,
    field_of_study,
    institution
  ) VALUES (
    NEW.id,
    generated_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    (NEW.raw_user_meta_data->>'academic_level')::academic_level,
    NEW.raw_user_meta_data->>'field_of_study',
    NEW.raw_user_meta_data->>'institution'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- FONCTION: Moteur de recommandation de posts
-- =====================================================

CREATE OR REPLACE FUNCTION get_recommended_feed(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 20,
  p_offset  INTEGER DEFAULT 0
)
RETURNS TABLE(
  post_id         UUID,
  relevance_score FLOAT
) AS $$
DECLARE
  v_level     academic_level;
  v_field     TEXT;
  v_institution TEXT;
BEGIN
  -- Récupère le profil utilisateur
  SELECT academic_level, field_of_study, institution
  INTO v_level, v_field, v_institution
  FROM profiles WHERE id = p_user_id;

  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE WHEN requester_id = p_user_id THEN addressee_id ELSE requester_id END AS friend_id
    FROM friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status = 'accepted'
  ),
  scored_posts AS (
    SELECT
      p.id,
      (
        -- Boost si l'auteur est un ami (35 points)
        CASE WHEN p.author_id IN (SELECT friend_id FROM friend_ids) THEN 35.0 ELSE 0.0 END
        -- Boost même établissement (25 points)
        + CASE WHEN p.institution = v_institution AND v_institution IS NOT NULL THEN 25.0 ELSE 0.0 END
        -- Boost même filière (20 points)
        + CASE WHEN p.institution = v_field AND v_field IS NOT NULL THEN 20.0
               WHEN similarity(COALESCE(p.institution, ''), COALESCE(v_field, '')) > 0.3 THEN 10.0
               ELSE 0.0 END
        -- Boost même niveau académique (15 points)
        + CASE WHEN p.academic_level = v_level AND v_level IS NOT NULL THEN 15.0 ELSE 0.0 END
        -- Score d'engagement (max 20 points)
        + LEAST(p.like_count * 0.5 + p.comment_count * 1.5 + p.view_count * 0.1, 20.0)
        -- Pénalité temporelle (posts récents favorisés)
        - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0 * 2.0
        -- Boost si l'utilisateur a aimé du contenu similaire
        + CASE WHEN EXISTS (
            SELECT 1 FROM post_likes pl
            JOIN posts pp ON pp.id = pl.post_id
            WHERE pl.user_id = p_user_id
              AND pp.post_type = p.post_type
            LIMIT 1
          ) THEN 10.0 ELSE 0.0 END
      ) AS score
    FROM posts p
    WHERE p.is_deleted = false
      AND p.moderation_status = 'approved'
      AND p.author_id != p_user_id
      -- Exclure les posts déjà vus (optionnel: utiliser une table post_views)
  )
  SELECT post_id AS post_id, score AS relevance_score
  FROM scored_posts
  ORDER BY score DESC, post_id
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- FONCTION: Suggestions d'amis
-- =====================================================

CREATE OR REPLACE FUNCTION get_friend_suggestions(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 10
)
RETURNS TABLE(
  suggested_id    UUID,
  common_friends  INTEGER,
  match_score     FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH my_friends AS (
    SELECT CASE WHEN requester_id = p_user_id THEN addressee_id ELSE requester_id END AS fid
    FROM friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status = 'accepted'
  ),
  my_profile AS (
    SELECT academic_level, field_of_study, institution FROM profiles WHERE id = p_user_id
  ),
  candidates AS (
    SELECT DISTINCT
      p.id,
      COUNT(DISTINCT mf.fid) AS common_count,
      (
        COUNT(DISTINCT mf.fid) * 20.0
        + CASE WHEN p.institution = mp.institution AND mp.institution IS NOT NULL THEN 30.0 ELSE 0.0 END
        + CASE WHEN p.field_of_study = mp.field_of_study AND mp.field_of_study IS NOT NULL THEN 25.0 ELSE 0.0 END
        + CASE WHEN p.academic_level = mp.academic_level AND mp.academic_level IS NOT NULL THEN 15.0 ELSE 0.0 END
      ) AS mscore
    FROM profiles p
    CROSS JOIN my_profile mp
    LEFT JOIN (
      SELECT CASE WHEN f.requester_id = mf2.fid THEN f.addressee_id ELSE f.requester_id END AS candidate
      FROM friendships f
      JOIN my_friends mf2 ON mf2.fid IN (f.requester_id, f.addressee_id)
      WHERE f.status = 'accepted'
    ) fof ON fof.candidate = p.id
    LEFT JOIN my_friends mf ON mf.fid = p.id
    WHERE p.id != p_user_id
      AND mf.fid IS NULL  -- pas déjà ami
      AND p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE (requester_id = p_user_id AND addressee_id = p.id)
           OR (requester_id = p.id AND addressee_id = p_user_id)
      )
    GROUP BY p.id, mp.institution, mp.field_of_study, mp.academic_level
  )
  SELECT id, common_count::INTEGER, mscore
  FROM candidates
  WHERE mscore > 0
  ORDER BY mscore DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
