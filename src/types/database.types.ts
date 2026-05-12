export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AcademicLevel =
  | "terminale"
  | "bts_1"
  | "bts_2"
  | "licence_1"
  | "licence_2"
  | "licence_3"
  | "master_1"
  | "master_2"
  | "doctorat";

export type PostType =
  | "general"
  | "exam_subject"
  | "course_document"
  | "event"
  | "announcement"
  | "conference"
  | "soutenance";

export type MediaType = "image" | "pdf" | "video";
export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type NotificationType =
  | "like"
  | "comment"
  | "reply"
  | "friend_request"
  | "friend_accepted"
  | "message"
  | "mention"
  | "post_share";
export type UserRole = "user" | "moderator" | "admin";
export type ModerationStatus = "pending" | "approved" | "rejected" | "flagged";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  phone: string | null;
  academic_level: AcademicLevel | null;
  field_of_study: string | null;
  institution: string | null;
  city: string | null;
  website: string | null;
  role: UserRole;
  is_public: boolean;
  is_verified: boolean;
  is_active: boolean;
  post_count: number;
  friend_count: number;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  post_type: PostType;
  subject_name: string | null;
  professor_name: string | null;
  academic_level: AcademicLevel | null;
  institution: string | null;
  exam_year: number | null;
  event_date: string | null;
  event_location: string | null;
  event_url: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  moderation_status: ModerationStatus;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Relations jointes
  author?: Profile;
  media?: PostMedia[];
  liked_by_user?: boolean;
  saved_by_user?: boolean;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  file_name: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  position: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  replies?: Comment[];
  liked_by_user?: boolean;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  other_participant?: Profile;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  is_read: boolean;
  is_deleted: boolean;
  is_first_message: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}

export const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = {
  terminale: "Terminale",
  bts_1: "BTS 1",
  bts_2: "BTS 2",
  licence_1: "Licence 1 (L1)",
  licence_2: "Licence 2 (L2)",
  licence_3: "Licence 3 (L3)",
  master_1: "Master 1 (M1)",
  master_2: "Master 2 (M2)",
  doctorat: "Doctorat",
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  general: "Publication générale",
  exam_subject: "Sujet d'examen",
  course_document: "Document de cours",
  event: "Événement",
  announcement: "Annonce",
  conference: "Conférence",
  soutenance: "Soutenance",
};
