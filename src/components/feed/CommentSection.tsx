"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Heart } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkPreviewCard, extractFirstUrl } from "@/components/ui/LinkPreviewCard";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { Comment } from "@/types/database.types";

export function CommentSection({ postId, onCommentAdded }: { postId: string; onCommentAdded?: () => void }) {
  const { profile } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/comments?postId=${postId}`)
      .then((r) => r.json())
      .then(({ comments }) => {
        if (active) { setComments(comments ?? []); setLoading(false); }
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !content.trim() || submitting) return;
    setSubmitting(true);

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, content: content.trim(), parent_id: replyTo?.id ?? null }),
    });

    if (res.ok) {
      const { comment } = await res.json();
      setComments((prev) => [...prev, comment as Comment]);
      setContent("");
      setReplyTo(null);
      onCommentAdded?.();
    }
    setSubmitting(false);
  };

  return (
    <div className="p-4 space-y-3">
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-16 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun commentaire. Soyez le premier !
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onReply={setReplyTo} />
            ))
          )}
        </div>
      )}

      {profile && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{getInitials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {replyTo && (
              <div className="text-xs text-brand-orange mb-1 flex items-center gap-1">
                <span>Répondre à {replyTo.author?.full_name}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground">×</button>
              </div>
            )}
            <Input
              placeholder="Écrire un commentaire…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="pr-10 bg-muted/50 border-0 h-9 text-sm"
              rightIcon={
                <button type="submit" disabled={!content.trim() || submitting}
                  className="text-brand-orange disabled:opacity-30 hover:opacity-70 transition-opacity">
                  <Send className="h-4 w-4" />
                </button>
              }
            />
          </div>
        </form>
      )}
    </div>
  );
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: (c: Comment) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={comment.author?.avatar_url ?? undefined} />
        <AvatarFallback className="text-[10px]">{getInitials(comment.author?.full_name ?? "U")}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="bg-muted/50 rounded-xl px-3 py-2 inline-block max-w-full">
          <p className="text-xs font-semibold">{comment.author?.full_name}</p>
          <p className="text-sm mt-0.5">{comment.content}</p>
          {(() => { const url = extractFirstUrl(comment.content); return url ? <LinkPreviewCard url={url} compact /> : null; })()}
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
          <button onClick={() => onReply(comment)} className="text-[10px] text-muted-foreground hover:text-brand-orange font-medium">
            Répondre
          </button>
          {comment.like_count > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Heart className="h-2.5 w-2.5 fill-red-500 text-red-500" /> {comment.like_count}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
