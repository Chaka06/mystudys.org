"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  FileText, Calendar, MapPin, ExternalLink, GraduationCap,
  Trash2, Flag, BookOpen
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { LinkPreviewCard, extractFirstUrl } from "@/components/ui/LinkPreviewCard";
import { PdfThumbnail } from "@/components/ui/PdfThumbnail";
import { formatRelativeTime, getInitials, cn } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, POST_TYPE_LABELS, type Post } from "@/types/database.types";
import { useAuthStore } from "@/stores/authStore";
import { toggleLikeAction, toggleSaveAction, deletePostAction, reportPostAction } from "@/app/actions/interactions";
import { toast } from "sonner";
import { CommentSection } from "./CommentSection";

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  onUnsave?: (postId: string) => void;
}

const POST_TYPE_COLORS: Record<string, string> = {
  exam_subject: "bg-brand-orange/10 text-brand-orange",
  course_document: "bg-brand-green/10 text-brand-green",
  event: "bg-blue-500/10 text-blue-600",
  announcement: "bg-purple-500/10 text-purple-600",
  conference: "bg-indigo-500/10 text-indigo-600",
  soutenance: "bg-pink-500/10 text-pink-600",
  general: "bg-muted text-muted-foreground",
};

export function PostCard({ post, onDelete, onUnsave }: PostCardProps) {
  const { profile } = useAuthStore();
  const [liked, setLiked] = useState(post.liked_by_user ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [saved, setSaved] = useState(post.saved_by_user ?? false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const isOwner = profile?.id === post.author_id;
  const images = post.media?.filter((m) => m.media_type === "image") ?? [];
  const pdf = post.media?.find((m) => m.media_type === "pdf");

  const handleLike = async () => {
    if (!profile || isLiking) return;
    setIsLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    await toggleLikeAction(post.id, liked);
    setIsLiking(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    const newSaved = !saved;
    setSaved(newSaved);
    await toggleSaveAction(post.id, saved);
    if (newSaved) {
      toast.success("Publication enregistrée");
    } else {
      onUnsave?.(post.id);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    const result = await deletePostAction(post.id);
    if (result.error) {
      toast.error("Impossible de supprimer : " + result.error);
    } else {
      onDelete?.(post.id);
      toast.success("Publication supprimée");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: "STUDY'S", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <Link href={`/profile/${post.author?.username}`} className="flex items-center gap-3 group">
            <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-brand-orange/30 transition-all">
              <AvatarImage src={post.author?.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(post.author?.full_name ?? "U")}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm hover:text-brand-orange transition-colors">
                  {post.author?.full_name}
                </span>
                {post.author?.is_verified && (
                  <span className="text-brand-orange text-xs">✓</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{formatRelativeTime(post.created_at)}</span>
                {post.author?.institution && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[120px]">{post.author.institution}</span>
                  </>
                )}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {post.post_type !== "general" && (
              <Badge className={cn("text-xs", POST_TYPE_COLORS[post.post_type])}>
                {POST_TYPE_LABELS[post.post_type]}
              </Badge>
            )}
            <div className="relative">
              <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(!menuOpen)}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-8 z-50 w-44 rounded-xl border bg-popover shadow-lg p-1"
                    >
                      {isOwner && (
                        <button
                          onClick={() => { setMenuOpen(false); handleDelete(); }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          setMenuOpen(false);
                          if (!window.confirm("Signaler cette publication comme inappropriée ?")) return;
                          const r = await reportPostAction(post.id, "Contenu inapproprié");
                          toast[r.error ? "error" : "success"](r.error ? "Erreur lors du signalement" : "Publication signalée, merci !");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Flag className="h-4 w-4" /> Signaler
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Academic metadata */}
        {(post.subject_name || post.professor_name || post.academic_level) && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-brand-orange/5 border border-brand-orange/20">
            <div className="flex flex-wrap gap-2 text-xs">
              {post.subject_name && (
                <span className="flex items-center gap-1 font-medium text-brand-orange">
                  <BookOpen className="h-3 w-3" /> {post.subject_name}
                </span>
              )}
              {post.professor_name && (
                <span className="text-muted-foreground">Pr. {post.professor_name}</span>
              )}
              {post.academic_level && (
                <Badge variant="soft" className="text-[10px] py-0">
                  {ACADEMIC_LEVEL_LABELS[post.academic_level]}
                </Badge>
              )}
              {post.exam_year && (
                <span className="text-muted-foreground">{post.exam_year}</span>
              )}
            </div>
          </div>
        )}

        {/* Event metadata */}
        {post.post_type === "event" && post.event_date && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-blue-600">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(post.event_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {post.event_location && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {post.event_location}
              </div>
            )}
            {post.event_url && (
              <a href={post.event_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-orange hover:underline">
                <ExternalLink className="h-3 w-3" /> Voir les détails
              </a>
            )}
          </div>
        )}

        {/* Text content + link preview */}
        {post.content && (
          <div className="px-4 pb-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
            {(() => {
              const url = extractFirstUrl(post.content);
              return url ? <LinkPreviewCard url={url} /> : null;
            })()}
          </div>
        )}

        {/* PDF Preview — style LinkedIn */}
        {pdf && <PdfPreviewCard pdf={pdf} />}

        {/* Image Grid */}
        {images.length > 0 && <ImageGrid images={images} />}

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors",
                liked
                  ? "text-red-500 bg-red-50 dark:bg-red-950/20"
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              <span>{likeCount > 0 && likeCount}</span>
            </motion.button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:text-brand-orange hover:bg-brand-orange/10 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount > 0 && commentCount}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-muted-foreground hover:text-brand-green hover:bg-brand-green/10 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSave}
            className={cn(
              "p-1.5 rounded-xl transition-colors",
              saved
                ? "text-brand-orange"
                : "text-muted-foreground hover:text-brand-orange"
            )}
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
          </motion.button>
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/60"
            >
              <CommentSection
                postId={post.id}
                onCommentAdded={() => setCommentCount((c) => c + 1)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function ImageGrid({ images }: { images: { url: string }[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const count = images.length;
  if (count === 0) return null;

  const urls = images.map((i) => i.url);
  const open = (i: number) => setLightboxIndex(i);

  const imgClass = "w-full h-full object-cover cursor-pointer hover:brightness-90 transition-[filter] duration-150";

  return (
    <>
      {count === 1 && (
        <div className="w-full mb-0.5 overflow-hidden max-h-96" onClick={() => open(0)}>
          <img src={urls[0]} alt="Publication" className="w-full max-h-96 object-cover cursor-pointer hover:brightness-90 transition-[filter]" />
        </div>
      )}

      {count === 2 && (
        <div className="grid grid-cols-2 gap-0.5 mb-0.5 h-56">
          {urls.map((url, i) => (
            <div key={i} className="overflow-hidden" onClick={() => open(i)}>
              <img src={url} alt={`Image ${i + 1}`} className={imgClass} />
            </div>
          ))}
        </div>
      )}

      {count === 3 && (
        <div className="grid grid-cols-2 gap-0.5 mb-0.5 h-64">
          <div className="overflow-hidden row-span-2" onClick={() => open(0)}>
            <img src={urls[0]} alt="Image 1" className={imgClass} />
          </div>
          <div className="overflow-hidden" onClick={() => open(1)}>
            <img src={urls[1]} alt="Image 2" className={imgClass} />
          </div>
          <div className="overflow-hidden" onClick={() => open(2)}>
            <img src={urls[2]} alt="Image 3" className={imgClass} />
          </div>
        </div>
      )}

      {count >= 4 && (
        <div className="grid grid-cols-2 gap-0.5 mb-0.5 h-56">
          {urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative overflow-hidden" onClick={() => open(i)}>
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className={`${imgClass} ${i === 3 && count > 4 ? "brightness-50" : ""}`}
              />
              {i === 3 && count > 4 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-3xl font-bold drop-shadow-lg">+{count - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <ImageLightbox
          images={urls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

// ─── Aperçu PDF style LinkedIn ────────────────────────────────────────────────

interface PdfPreviewCardProps {
  pdf: { url: string; file_name?: string | null; file_size?: number | null };
}

function PdfPreviewCard({ pdf }: PdfPreviewCardProps) {
  const name     = pdf.file_name ?? "Document PDF";
  const baseName = name.replace(/\.[^/.]+$/, "");
  const sizeMB   = pdf.file_size ? (pdf.file_size / 1024 / 1024).toFixed(1) : null;

  return (
    <a
      href={pdf.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-4 mb-3 block rounded-xl border border-border/60 overflow-hidden hover:border-brand-orange/50 hover:shadow-lg transition-all group"
    >
      {/* Vraie prévisualisation page 1 du PDF */}
      <PdfThumbnail url={pdf.url} height={200} />

      {/* Pied de carte */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-background border-t border-border/40">
        <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate group-hover:text-brand-orange transition-colors">
            {baseName}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF{sizeMB ? ` · ${sizeMB} MB` : ""}
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-brand-orange shrink-0 transition-colors" />
      </div>
    </a>
  );
}
