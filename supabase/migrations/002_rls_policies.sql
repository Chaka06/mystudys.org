-- =====================================================
-- STUDY'S — Migration 002: Row Level Security (RLS)
-- =====================================================

-- Activation RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND ((requester_id = user_a AND addressee_id = user_b)
        OR (requester_id = user_b AND addressee_id = user_a))
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Lecture: profils publics visibles par tous, profils privés uniquement par soi + amis
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    is_public = true
    OR id = auth.uid()
    OR are_friends(id, auth.uid())
    OR is_admin()
  );

-- Mise à jour: uniquement son propre profil
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insertion: géré via trigger (handle_new_user), bloqué en direct
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- =====================================================
-- POSTS POLICIES
-- =====================================================

-- Lecture: posts non supprimés et approuvés
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    is_deleted = false
    AND (moderation_status = 'approved' OR author_id = auth.uid() OR is_admin())
  );

-- Création: uniquement utilisateurs connectés
CREATE POLICY "posts_insert" ON posts FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Mise à jour: auteur ou admin
CREATE POLICY "posts_update" ON posts FOR UPDATE
  USING (author_id = auth.uid() OR is_admin())
  WITH CHECK (author_id = auth.uid() OR is_admin());

-- Suppression: auteur ou admin (soft delete)
CREATE POLICY "posts_delete" ON posts FOR DELETE
  USING (author_id = auth.uid() OR is_admin());

-- =====================================================
-- POST_MEDIA POLICIES
-- =====================================================

CREATE POLICY "post_media_select" ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
        AND posts.is_deleted = false
    )
  );

CREATE POLICY "post_media_insert" ON post_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
        AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "post_media_delete" ON post_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
        AND (posts.author_id = auth.uid() OR is_admin())
    )
  );

-- =====================================================
-- LIKES POLICIES
-- =====================================================

CREATE POLICY "likes_select" ON post_likes FOR SELECT USING (true);

CREATE POLICY "likes_insert" ON post_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "likes_delete" ON post_likes FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- COMMENTS POLICIES
-- =====================================================

CREATE POLICY "comments_select" ON comments FOR SELECT
  USING (is_deleted = false OR author_id = auth.uid() OR is_admin());

CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments_update" ON comments FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments_delete" ON comments FOR DELETE
  USING (author_id = auth.uid() OR is_admin());

-- =====================================================
-- COMMENT_LIKES POLICIES
-- =====================================================

CREATE POLICY "comment_likes_select" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_insert" ON comment_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "comment_likes_delete" ON comment_likes FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- FRIENDSHIPS POLICIES
-- =====================================================

CREATE POLICY "friendships_select" ON friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid() OR is_admin());

CREATE POLICY "friendships_insert" ON friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "friendships_update" ON friendships FOR UPDATE
  USING (addressee_id = auth.uid() OR requester_id = auth.uid() OR is_admin());

CREATE POLICY "friendships_delete" ON friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid() OR is_admin());

-- =====================================================
-- CONVERSATIONS POLICIES
-- =====================================================

CREATE POLICY "conversations_select" ON conversations FOR SELECT
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "conversations_insert" ON conversations FOR INSERT
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "conversations_update" ON conversations FOR UPDATE
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- =====================================================
-- MESSAGES POLICIES
-- =====================================================

CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING (sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (true); -- géré côté serveur via service_role

-- =====================================================
-- POST_SAVES POLICIES
-- =====================================================

CREATE POLICY "saves_select" ON post_saves FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "saves_insert" ON post_saves FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "saves_delete" ON post_saves FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- USER_INTERESTS POLICIES
-- =====================================================

CREATE POLICY "interests_all" ON user_interests FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- POST_REPORTS POLICIES
-- =====================================================

CREATE POLICY "reports_insert" ON post_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_select" ON post_reports FOR SELECT USING (reporter_id = auth.uid() OR is_admin());

-- =====================================================
-- PUSH_SUBSCRIPTIONS POLICIES
-- =====================================================

CREATE POLICY "push_subs_all" ON push_subscriptions FOR ALL USING (user_id = auth.uid());
