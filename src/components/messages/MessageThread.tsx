"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, ArrowLeft, Check, CheckCheck,
  FileText, X, Paperclip, Download, Phone, Video
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { LinkPreviewCard, extractFirstUrl } from "@/components/ui/LinkPreviewCard";
import { PdfThumbnail } from "@/components/ui/PdfThumbnail";
import { useMessages } from "@/hooks/useMessages";
import { useAuthStore } from "@/stores/authStore";
import { formatMessageTime, getInitials, cn } from "@/lib/utils";
import type { Conversation } from "@/types/database.types";
import { toast } from "sonner";

interface Props { conversation: Conversation; }

type UploadState = "idle" | "uploading" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
const isPdfUrl   = (url: string) => /\.pdf(\?|$)/i.test(url);

const _today = new Date().toDateString();
const _yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); })();

function formatDate(iso: string) {
  const d = new Date(iso);
  const ds = d.toDateString();
  if (ds === _today) return "Aujourd'hui";
  if (ds === _yesterday) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function MessageThread({ conversation }: Props) {
  const { profile } = useAuthStore();
  const { messages, loading, sendMessage } = useMessages(conversation.id, profile?.id ?? "");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const other = conversation.other_participant;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast.error("Fichier trop volumineux (max 50 MB)"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!allowed.includes(file.type)) { toast.error("Type de fichier non autorisé"); return; }
    setPendingFile(file);
    setPendingPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const cancelFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setUploadState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!content.trim() && !pendingFile) || sending) return;
    setSending(true);

    let mediaUrl: string | undefined;

    if (pendingFile) {
      setUploadState("uploading");
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("folder", "messages");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        setUploadState("error");
        toast.error("Erreur lors de l'envoi du fichier");
        setSending(false);
        return;
      }
      const data = await res.json();
      mediaUrl = data.url;
      setUploadState("idle");
    }

    // Si PDF sans texte : on met le nom original comme contenu pour l'affichage
    const msgContent = content.trim() || (pendingFile && !pendingFile.type.startsWith("image/") ? pendingFile.name : "");

    await sendMessage(msgContent, mediaUrl);
    setContent("");
    cancelFile();
    setSending(false);
    inputRef.current?.focus();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#F0F2F5] dark:bg-background">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-background border-b border-border/60 shadow-sm shrink-0">
        <Button variant="ghost" size="icon-sm" asChild className="lg:hidden -ml-1">
          <Link href="/messages"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>

        <Link href={`/profile/${other?.username}`} className="flex items-center gap-3 group flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11 ring-2 ring-brand-orange/20 group-hover:ring-brand-orange/50 transition-all">
              <AvatarImage src={other?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-orange text-white font-semibold">
                {getInitials(other?.full_name ?? "U")}
              </AvatarFallback>
            </Avatar>
            {conversation.is_active && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm group-hover:text-brand-orange transition-colors truncate leading-tight">
              {other?.full_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {conversation.is_active
                ? <span className="text-green-600 font-medium">En ligne</span>
                : other?.last_seen_at
                  ? `Vu ${formatMessageTime(other.last_seen_at)}`
                  : `@${other?.username}`}
            </p>
          </div>
        </Link>
      </div>

      {/* ── Zone messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">

        {/* Bandeau premier message */}
        {!conversation.is_active && (
          <div className="flex justify-center mb-4">
            <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-2xl px-4 py-3 text-center text-sm max-w-xs">
              <p className="font-semibold text-brand-orange text-xs mb-0.5">Première demande de message</p>
              <p className="text-xs text-muted-foreground">
                Cette conversation s'activera lorsque {other?.first_name} répondra.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("flex items-end gap-2", i % 2 === 0 ? "justify-end" : "")}>
                {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
                <Skeleton className={cn("rounded-2xl", i % 2 === 0 ? "h-10 w-44" : "h-12 w-56")} />
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <Avatar className="h-20 w-20">
              <AvatarImage src={other?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-orange text-white text-2xl">
                {getInitials(other?.full_name ?? "U")}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold text-base">{other?.full_name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Démarrez la conversation avec {other?.first_name} !
              </p>
            </div>
          </div>
        )}

        {!loading && messages.filter(Boolean).map((msg, i, arr) => {
          const isMine     = msg.sender_id === profile?.id;
          const prev       = arr[i - 1];
          const next       = arr[i + 1];
          const isFirst    = !prev || prev.sender_id !== msg.sender_id;
          const isLast     = !next || next.sender_id !== msg.sender_id;
          const showDate   = !prev || !isSameDay(prev.created_at, msg.created_at);
          const showAvatar = !isMine && isLast;

          const hasMedia     = !!msg.media_url;
          const mediaIsImage = hasMedia && isImageUrl(msg.media_url!);
          const mediaIsPdf   = hasMedia && isPdfUrl(msg.media_url!);

          // Pour les PDFs, le nom du fichier est dans msg.content (on l'y a mis lors de l'envoi)
          // Pour les messages texte, msg.content est le texte
          const isContentFilename = hasMedia && mediaIsPdf && !!msg.content && !msg.content.includes("http");
          const displayContent    = (!mediaIsPdf) ? msg.content : "";

          const msgUrl = displayContent ? extractFirstUrl(displayContent) : null;

          return (
            <div key={msg.id}>
              {/* Séparateur de date */}
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="bg-white dark:bg-muted shadow-sm text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-full border border-border/40">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
              )}

              {/* Message row */}
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "flex items-end gap-2 mb-0.5",
                  isMine ? "justify-end" : "justify-start",
                  isLast ? "mb-2" : ""
                )}
              >
                {/* Avatar expéditeur (affiché une fois sous le groupe) */}
                {!isMine && (
                  <div className="w-8 h-8 shrink-0 mb-0.5">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.sender?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-muted font-semibold">
                          {getInitials(msg.sender?.full_name ?? "U")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                {/* Bulle(s) */}
                <div className={cn("flex flex-col gap-0.5 max-w-[72%] sm:max-w-[60%]", isMine ? "items-end" : "items-start")}>

                  {/* Nom expéditeur (visible uniquement sur le premier message du groupe, côté "autre") */}
                  {!isMine && isFirst && msg.sender?.full_name && (
                    <p className="text-[11px] font-semibold text-brand-orange ml-1 mb-0.5">
                      {msg.sender.full_name}
                    </p>
                  )}

                  {/* Image */}
                  {hasMedia && mediaIsImage && (
                    <div
                      onClick={() => setLightboxUrl(msg.media_url!)}
                      className={cn(
                        "overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow",
                        isMine
                          ? "rounded-2xl rounded-br-sm"
                          : "rounded-2xl rounded-bl-sm"
                      )}
                    >
                      <img
                        src={msg.media_url!}
                        alt="Image"
                        className="max-w-full max-h-72 object-cover block hover:brightness-95 transition-[filter]"
                      />
                    </div>
                  )}

                  {/* PDF */}
                  {hasMedia && mediaIsPdf && (
                    <a
                      href={msg.media_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "block w-64 rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all group",
                        isMine
                          ? "border-brand-orange/30 rounded-br-sm"
                          : "border-border/60 rounded-bl-sm"
                      )}
                    >
                      {/* Vraie prévisualisation page 1 */}
                      <PdfThumbnail url={msg.media_url!} height={140} />
                      {/* Pied de carte */}
                      <div className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 border-t",
                        isMine
                          ? "bg-brand-orange/5 border-brand-orange/20"
                          : "bg-white dark:bg-muted border-border/40"
                      )}>
                        <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {/* Nom original stocké dans msg.content, sinon nom générique */}
                            {msg.content && !msg.content.startsWith("http")
                              ? msg.content.replace(/\.[^/.]+$/, "")
                              : "Document PDF"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">PDF · Ouvrir</p>
                        </div>
                        <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  )}

                  {/* Texte */}
                  {displayContent && (
                    <div
                      className={cn(
                        "px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                        isMine
                          ? cn(
                            "bg-brand-orange text-white",
                            isFirst ? "rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm"
                              : isLast ? "rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-sm"
                              : "rounded-l-2xl rounded-tr-sm rounded-br-sm"
                          )
                          : cn(
                            "bg-white dark:bg-card text-foreground",
                            isFirst ? "rounded-tl-2xl rounded-tr-2xl rounded-bl-sm rounded-br-2xl"
                              : isLast ? "rounded-tl-sm rounded-tr-2xl rounded-bl-sm rounded-br-2xl"
                              : "rounded-r-2xl rounded-tl-sm rounded-bl-sm"
                          )
                      )}
                      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {displayContent}
                    </div>
                  )}

                  {/* Aperçu lien */}
                  {msgUrl && (
                    <div className="w-full max-w-xs">
                      <LinkPreviewCard url={msgUrl} compact />
                    </div>
                  )}

                  {/* Heure + statut lu */}
                  {isLast && (
                    <div className={cn("flex items-center gap-1 px-1", isMine ? "justify-end" : "justify-start")}>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(msg.created_at)}
                      </span>
                      {isMine && (
                        msg.is_read
                          ? <CheckCheck className="h-3.5 w-3.5 text-brand-orange" />
                          : <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Zone de saisie ── */}
      <div className="shrink-0 bg-background border-t border-border/60 px-3 py-3 space-y-2">

        {/* Aperçu fichier en attente */}
        <AnimatePresence>
          {pendingFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 bg-muted/60 rounded-2xl px-3 py-2.5 border border-border/60"
            >
              {pendingPreview ? (
                <img src={pendingPreview} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-red-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pendingFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(pendingFile.size / 1024).toFixed(0)} KB
                  {uploadState === "uploading" && (
                    <span className="text-brand-orange"> · Envoi en cours…</span>
                  )}
                </p>
              </div>
              <button
                onClick={cancelFile}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Barre de saisie */}
        <div className="flex items-end gap-2">
          {/* Pièce jointe */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-muted-foreground hover:text-brand-orange hover:bg-brand-orange/10 rounded-2xl transition-colors shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Textarea auto-resize */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Écrire un message…"
              rows={1}
              className="w-full resize-none bg-muted/50 rounded-2xl px-4 py-2.5 text-sm outline-none border border-transparent focus:border-brand-orange/30 transition-colors placeholder:text-muted-foreground/60 leading-relaxed"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
          </div>

          {/* Envoyer */}
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !pendingFile) || sending}
            className={cn(
              "p-2.5 rounded-2xl shrink-0 transition-all",
              (!content.trim() && !pendingFile) || sending
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-brand-orange hover:bg-orange-600 text-white shadow-sm shadow-orange-200 hover:shadow-md active:scale-95"
            )}
          >
            <Send className={cn("h-5 w-5", sending && "animate-pulse")} />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <ImageLightbox images={[lightboxUrl]} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}
