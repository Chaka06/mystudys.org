import { z } from "zod";

export const registerSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  last_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z
    .string()
    .min(8, "Numéro de téléphone invalide")
    .regex(/^(\+?225)?[0-9\s]+$/, "Format invalide (ex: +225 07 00 00 00 00)"),
  academic_level: z.enum([
    "terminale", "bts_1", "bts_2",
    "licence_1", "licence_2", "licence_3",
    "master_1", "master_2", "doctorat"
  ], { errorMap: () => ({ message: "Sélectionnez un niveau académique" }) }),
  field_of_study: z.string().min(2, "La filière doit contenir au moins 2 caractères"),
  institution: z.string().min(2, "L'établissement doit contenir au moins 2 caractères"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Doit contenir au moins une majuscule")
    .regex(/[0-9]/, "Doit contenir au moins un chiffre"),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"],
});

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const otpSchema = z.object({
  otp: z.string().length(6, "Le code OTP doit contenir 6 chiffres"),
  email: z.string().email(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
