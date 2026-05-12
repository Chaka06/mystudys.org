"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon, FileText, Calendar, Megaphone,
  X, BookOpen, GraduationCap
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { createPostAction, savePostMediaAction } from "@/app/actions/posts";
import { getInitials, cn } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, type PostType, type AcademicLevel } from "@/types/database.types";
import { toast } from "sonner";

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "general",         label: "Publication",      icon: Megaphone,     color: "text-gray-500" },
  { value: "exam_subject",    label: "Sujet d'examen",   icon: BookOpen,      color: "text-orange-500" },
  { value: "course_document", label: "Cours",            icon: FileText,      color: "text-green-600" },
  { value: "event",           label: "Événement",        icon: Calendar,      color: "text-blue-500" },
  { value: "announcement",    label: "Annonce",          icon: Megaphone,     color: "text-purple-500" },
];

interface CreatePostProps {
  userId: string;
  onPostCreated?: () => void;
}

export function CreatePost({ userId, onPostCreated }: CreatePostProps) {
  const { profile } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [postType, setPostType] = useState<PostType>("general");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel | "">("");
  const [examYear, setExamYear] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsAcademic = ["exam_subject", "course_document"].includes(postType);
  const needsEvent = ["event", "conference", "soutenance"].includes(postType);

  const onDrop = useCallback((accepted: File[]) => {
    // Séparer images et PDFs
    const incomingImgs = accepted.filter((f) => f.type.startsWith("image/"));
    const incomingPdfs = accepted.filter((f) => f.type === "application/pdf");

    const existingImgs = files.filter((f) => f.type.startsWith("image/"));
    const existingPdfs = files.filter((f) => f.type === "application/pdf");

    if (existingPdfs.length + incomingPdfs.length > 1) {
      toast.error("Un seul PDF autorisé par publication");
      return;
    }
    if (existingImgs.length + incomingImgs.length > 5) {
      toast.error(`Maximum 5 images (${5 - existingImgs.length} restante${5 - existingImgs.length > 1 ? "s" : ""})`);
      // Prendre uniquement ce qui reste possible
      const remaining = 5 - existingImgs.length;
      if (remaining <= 0) return;
      const limited = incomingImgs.slice(0, remaining);
      const newFiles = [...files, ...limited, ...incomingPdfs];
      setFiles(newFiles);
      setPreviews(newFiles.map((f) => f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
      return;
    }

    const newFiles = [...files, ...incomingImgs, ...incomingPdfs];
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [], "application/pdf": [".pdf"] }, noClick: true,
  });

  const removeFile = (i: number) => {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const reset = () => {
    setContent(""); setFiles([]); setPreviews([]);
    setSubjectName(""); setProfessorName(""); setAcademicLevel("");
    setExamYear(""); setEventDate(""); setEventLocation("");
    setPostType("general"); setExpanded(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) {
      toast.error("Ajoutez du texte ou un fichier"); return;
    }
    if (needsAcademic && (!subjectName.trim() || !professorName.trim() || !academicLevel)) {
      toast.error("Matière, professeur et niveau académique sont requis"); return;
    }

    setSubmitting(true);
    try {
      const result = await createPostAction({
        content: content.trim() || null,
        post_type: postType,
        subject_name: subjectName.trim() || null,
        professor_name: professorName.trim() || null,
        academic_level: (academicLevel as AcademicLevel) || null,
        exam_year: examYear ? parseInt(examYear) : null,
        event_date: eventDate || null,
        event_location: eventLocation.trim() || null,
        institution: profile?.institution ?? null,
      });

      if (result.error) throw new Error(result.error);
      const postId = result.postId!;

      // Upload des fichiers via /api/upload (session serveur)
      if (files.length > 0) {
        const mediaRecords: { post_id: string; media_type: "image" | "pdf"; url: string; file_name: string; file_size: number; position: number }[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fd = new FormData();
          fd.append("file", file);
          fd.append("folder", `posts/${postId}`);

          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (res.ok) {
            const { url } = await res.json();
            mediaRecords.push({
              post_id: postId,
              media_type: file.type === "application/pdf" ? "pdf" : "image",
              url,
              file_name: file.name,
              file_size: file.size,
              position: i,
            });
          }
        }

        if (mediaRecords.length > 0) {
          await savePostMediaAction(mediaRecords);
        }
      }

      toast.success("Publication créée !");
      reset();
      onPostCreated?.();
    } catch (err: unknown) {
      console.error(err);
      toast.error("Erreur lors de la publication. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden bg-white border border-gray-100">
      {/* Aperçu compact */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-orange-500 text-white text-sm">
              {profile ? getInitials(profile.full_name) : "?"}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setExpanded(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-400 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
          >
            Quoi de neuf, {profile?.first_name || "étudiant"} ?
          </button>
        </div>

        {/* Boutons rapides */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {POST_TYPES.slice(0, 4).map((type) => (
            <button key={type.value}
              onClick={() => { setPostType(type.value); setExpanded(true); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all",
                postType === type.value && expanded
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-gray-50 border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 text-gray-600"
              )}
            >
              <type.icon className={cn("h-3.5 w-3.5", postType === type.value && expanded ? "text-white" : type.color)} />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire étendu */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-4 space-y-3" {...getRootProps()}>
              <input {...getInputProps()} />

              {/* Sélecteur de type */}
              <div className="flex gap-2 flex-wrap">
                {POST_TYPES.map((type) => (
                  <button key={type.value} onClick={() => setPostType(type.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                      postType === type.value
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-gray-50 border-gray-100 hover:border-gray-200 text-gray-600"
                    )}>
                    <type.icon className={cn("h-3.5 w-3.5", postType === type.value ? "text-white" : type.color)} />
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Champs académiques */}
              {needsAcademic && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <p className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" /> Informations académiques requises *
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="Matière *" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="h-9 text-sm bg-white" />
                    <Input placeholder="Nom du professeur *" value={professorName} onChange={(e) => setProfessorName(e.target.value)} className="h-9 text-sm bg-white" />
                    <Select value={academicLevel} onValueChange={(v) => setAcademicLevel(v as AcademicLevel)}>
                      <SelectTrigger className="h-9 text-sm bg-white"><SelectValue placeholder="Niveau académique *" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACADEMIC_LEVEL_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {postType === "exam_subject" && (
                      <Input placeholder="Année (ex: 2024)" value={examYear} onChange={(e) => setExamYear(e.target.value)} type="number" min="1990" max="2030" className="h-9 text-sm bg-white" />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Champs événement */}
              {needsEvent && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600">Détails de l'événement</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="h-9 text-sm bg-white" />
                    <Input placeholder="Lieu" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="h-9 text-sm bg-white" />
                  </div>
                </motion.div>
              )}

              {/* Textarea */}
              <Textarea
                placeholder={`${postType === "exam_subject" ? "Décrivez ce sujet d'examen..." : postType === "event" ? "Décrivez cet événement..." : "Écrivez votre publication..."}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] text-sm resize-none bg-gray-50 border-gray-100"
                maxLength={5000}
              />
              {content.length > 4000 && (
                <p className="text-xs text-gray-400 text-right">{content.length}/5000</p>
              )}

              {/* Aperçu fichiers */}
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((file, i) => (
                    <div key={i} className="relative group h-20 w-20 rounded-xl border border-gray-100 overflow-hidden bg-gray-50">
                      {file.type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-1 p-1">
                          <FileText className="h-6 w-6 text-red-500" />
                          <span className="text-[9px] text-gray-400 text-center truncate w-full px-1">{file.name}</span>
                        </div>
                      )}
                      <button onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-gray-800/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isDragActive && (
                <div className="border-2 border-dashed border-orange-300 rounded-xl p-6 text-center bg-orange-50">
                  <p className="text-sm text-orange-500 font-medium">Déposez vos fichiers ici</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1 items-center">
                  {/* Bouton images — multiple natif pour iOS et Android */}
                  <label
                    className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-xs font-medium text-green-700"
                    title={`Ajouter des images (${5 - files.filter(f => f.type.startsWith("image/")).length} restante${5 - files.filter(f => f.type.startsWith("image/")).length > 1 ? "s" : ""})`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                      className="hidden"
                      disabled={files.filter(f => f.type.startsWith("image/")).length >= 5}
                      onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
                      onChange={(e) => e.target.files && e.target.files.length > 0 && onDrop(Array.from(e.target.files))}
                    />
                    <ImageIcon className="h-4 w-4" />
                    Images {files.filter(f => f.type.startsWith("image/")).length > 0 && (
                      <span className="text-green-600">({files.filter(f => f.type.startsWith("image/")).length}/5)</span>
                    )}
                  </label>

                  {/* Bouton PDF */}
                  <label
                    className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-xs font-medium text-red-600"
                    title="Ajouter un PDF (1 seul par publication)"
                  >
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={files.some(f => f.type === "application/pdf")}
                      onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
                      onChange={(e) => e.target.files && e.target.files.length > 0 && onDrop(Array.from(e.target.files))}
                    />
                    <FileText className="h-4 w-4" />
                    PDF
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={reset} className="text-gray-500">Annuler</Button>
                  <Button size="sm" onClick={handleSubmit} loading={submitting}
                    disabled={!content.trim() && files.length === 0}
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-200">
                    Publier
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
