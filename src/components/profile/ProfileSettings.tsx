"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, User, BookOpen, Building2, MapPin, Globe, Phone, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { getInitials } from "@/lib/utils";
import { ACADEMIC_LEVEL_LABELS, type Profile, type AcademicLevel } from "@/types/database.types";
import { updateProfileAction, getUploadUrlAction } from "@/app/actions/profile";
import { toast } from "sonner";

const settingsSchema = z.object({
  first_name: z.string().min(2, "Prénom requis (min 2 caractères)"),
  last_name: z.string().min(2, "Nom requis (min 2 caractères)"),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
  academic_level: z.string().optional(),
  field_of_study: z.string().optional(),
  institution: z.string().optional(),
  city: z.string().optional(),
  website: z.union([z.string().url("URL invalide (ex: https://monsite.com)"), z.literal(""), z.undefined()]),
  is_public: z.boolean(),
});

type SettingsInput = z.infer<typeof settingsSchema>;

export function ProfileSettings({ profile }: { profile: Profile }) {
  const { setProfile } = useAuthStore();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
      academic_level: profile.academic_level ?? "",
      field_of_study: profile.field_of_study ?? "",
      institution: profile.institution ?? "",
      city: profile.city ?? "",
      website: profile.website ?? "",
      is_public: profile.is_public,
    },
  });

  const watchedLevel = watch("academic_level");
  const watchedPublic = watch("is_public");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop lourde (max 5MB)"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop lourde (max 10MB)"); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: SettingsInput) => {
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      let coverUrl = profile.cover_url;

      // Upload via URL signée (générée serveur — pas de problème de session browser)
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const signed = await getUploadUrlAction("avatars", `avatar.${ext}`, avatarFile.type);
        if (signed.error) {
          toast.error(`Avatar : ${signed.error}`);
        } else {
          const res = await fetch(signed.signedUrl!, {
            method: "PUT",
            body: avatarFile,
            headers: { "Content-Type": avatarFile.type },
          });
          if (res.ok) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${signed.path}?t=${Date.now()}`;
          } else {
            toast.error(`Erreur upload avatar (${res.status})`);
          }
        }
      }

      if (coverFile) {
        const ext = coverFile.name.split(".").pop() ?? "jpg";
        const signed = await getUploadUrlAction("studys-uploads", `cover.${ext}`, coverFile.type);
        if (signed.error) {
          toast.error(`Couverture : ${signed.error}`);
        } else {
          const res = await fetch(signed.signedUrl!, {
            method: "PUT",
            body: coverFile,
            headers: { "Content-Type": coverFile.type },
          });
          if (res.ok) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            coverUrl = `${supabaseUrl}/storage/v1/object/public/studys-uploads/${signed.path}?t=${Date.now()}`;
          } else {
            toast.error(`Erreur upload couverture (${res.status})`);
          }
        }
      }

      // Mise à jour du profil via Server Action (session serveur garantie)
      const result = await updateProfileAction({
        first_name: data.first_name,
        last_name: data.last_name,
        bio: data.bio,
        phone: data.phone,
        academic_level: data.academic_level,
        field_of_study: data.field_of_study,
        institution: data.institution,
        city: data.city,
        website: data.website,
        is_public: data.is_public,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      });

      if (result.error) {
        toast.error(`Erreur : ${result.error}`);
      } else {
        setProfile(result.data as Profile);
        toast.success("Profil mis à jour !");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(`Erreur : ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      <h1 className="text-xl font-bold">Paramètres du profil</h1>

      <form className="space-y-4">
        {/* Cover + Avatar */}
        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="text-base">Photos du profil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Cover photo */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Photo de couverture</p>
              <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-r from-brand-orange/30 to-brand-green/30">
                {(coverPreview ?? profile.cover_url) && (
                  <img
                    src={coverPreview ?? profile.cover_url ?? undefined}
                    alt="Couverture"
                    className="w-full h-full object-cover"
                  />
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                  <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                    <Camera className="h-3.5 w-3.5" />
                    Changer la couverture
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                </label>
                {!coverPreview && !profile.cover_url && (
                  <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                    <div className="flex items-center gap-2 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full">
                      <Camera className="h-3.5 w-3.5" />
                      Ajouter une photo de couverture
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 10MB</p>
            </div>

            {/* Avatar */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Photo de profil</p>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 ring-4 ring-border">
                    <AvatarImage src={avatarPreview ?? profile.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xl">{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-brand-orange flex items-center justify-center cursor-pointer hover:bg-brand-orange-dark transition-colors shadow-md">
                    <Camera className="h-3.5 w-3.5 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · Max 5MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Infos personnelles */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Informations personnelles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input {...register("first_name")} placeholder="Prénom" error={errors.first_name?.message} />
              <Input {...register("last_name")} placeholder="Nom" error={errors.last_name?.message} />
            </div>
            <Textarea {...register("bio")} placeholder="Bio (décrivez-vous en quelques mots…)" className="resize-none" />
            <Input {...register("phone")} placeholder="Téléphone" leftIcon={<Phone className="h-4 w-4" />} />
            <Input {...register("city")} placeholder="Ville" leftIcon={<MapPin className="h-4 w-4" />} />
            <Input {...register("website")} placeholder="Site web" leftIcon={<Globe className="h-4 w-4" />} type="url" />
          </CardContent>
        </Card>

        {/* Parcours académique */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Parcours académique</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={watchedLevel || "none"}
              onValueChange={(v) => setValue("academic_level", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Niveau académique" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non précisé</SelectItem>
                {Object.entries(ACADEMIC_LEVEL_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input {...register("field_of_study")} placeholder="Filière (ex: Informatique, Droit…)" leftIcon={<BookOpen className="h-4 w-4" />} />
            <Input {...register("institution")} placeholder="Établissement (ex: UVCI, INPHB…)" leftIcon={<Building2 className="h-4 w-4" />} />
          </CardContent>
        </Card>

        {/* Confidentialité */}
        <Card>
          <CardContent className="flex items-center justify-between pt-5">
            <div>
              <p className="font-medium text-sm">Profil public</p>
              <p className="text-xs text-muted-foreground">Visible par tous les utilisateurs</p>
            </div>
            <button
              type="button"
              onClick={() => setValue("is_public", !watchedPublic, { shouldDirty: true })}
              className={`relative h-6 w-11 rounded-full transition-colors ${watchedPublic ? "bg-brand-green" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${watchedPublic ? "translate-x-5" : ""}`} />
            </button>
          </CardContent>
        </Card>

        <Button
          type="button"
          className="w-full"
          size="lg"
          loading={saving}
          onClick={handleSubmit(onSubmit, (errors) => {
            toast.error(`Champ(s) invalide(s) : ${Object.keys(errors).join(", ")}`);
          })}
        >
          <Save className="h-4 w-4" />
          Sauvegarder les modifications
        </Button>
      </form>
    </div>
  );
}
