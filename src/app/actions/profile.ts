"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: {
  first_name: string;
  last_name: string;
  bio?: string;
  phone?: string;
  academic_level?: string;
  field_of_study?: string;
  institution?: string;
  city?: string;
  website?: string;
  is_public: boolean;
  avatar_url?: string | null;
  cover_url?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...formData,
      full_name: `${formData.first_name} ${formData.last_name}`,
      bio: formData.bio || null,
      phone: formData.phone || null,
      academic_level: formData.academic_level || null,
      field_of_study: formData.field_of_study || null,
      institution: formData.institution || null,
      city: formData.city || null,
      website: formData.website || null,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/profile/settings");
  revalidatePath(`/profile/${data.username}`);
  return { data };
}

export async function getUploadUrlAction(bucket: string, path: string, contentType: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(`${user.id}/${path}`);

  if (error) return { error: error.message };
  return { signedUrl: data.signedUrl, token: data.token, path: `${user.id}/${path}` };
}
