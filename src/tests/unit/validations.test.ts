import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, otpSchema } from "@/lib/validations/auth";
import { createPostSchema as postSchema } from "@/lib/validations/post";

// ─── registerSchema ─────────────────────────────────────────────────────────

const validRegister = {
  first_name: "Issiaka",
  last_name: "Diarrassouba",
  email: "issiaka@uvci.edu.ci",
  phone: "+225 07 00 00 00 00",
  academic_level: "licence_1" as const,
  field_of_study: "Informatique",
  institution: "UVCI",
  password: "Secret123",
  confirm_password: "Secret123",
};

describe("registerSchema", () => {
  it("accepte un formulaire valide", () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it("rejette un prénom trop court (< 2 caractères)", () => {
    const r = registerSchema.safeParse({ ...validRegister, first_name: "A" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toContain("first_name");
  });

  it("rejette un nom trop court (< 2 caractères)", () => {
    const r = registerSchema.safeParse({ ...validRegister, last_name: "D" });
    expect(r.success).toBe(false);
  });

  it("rejette un email invalide", () => {
    const r = registerSchema.safeParse({ ...validRegister, email: "pas-un-email" });
    expect(r.success).toBe(false);
  });

  it("rejette un email vide", () => {
    const r = registerSchema.safeParse({ ...validRegister, email: "" });
    expect(r.success).toBe(false);
  });

  it("rejette un téléphone invalide (trop court)", () => {
    const r = registerSchema.safeParse({ ...validRegister, phone: "123" });
    expect(r.success).toBe(false);
  });

  it("rejette un téléphone avec des lettres", () => {
    const r = registerSchema.safeParse({ ...validRegister, phone: "abcdefgh" });
    expect(r.success).toBe(false);
  });

  it("accepte un téléphone ivoirien sans préfixe", () => {
    const r = registerSchema.safeParse({ ...validRegister, phone: "0700000000" });
    expect(r.success).toBe(true);
  });

  it("rejette un niveau académique inconnu", () => {
    const r = registerSchema.safeParse({ ...validRegister, academic_level: "master_9" as any });
    expect(r.success).toBe(false);
  });

  it("rejette un mot de passe sans majuscule", () => {
    const r = registerSchema.safeParse({ ...validRegister, password: "secret123", confirm_password: "secret123" });
    expect(r.success).toBe(false);
  });

  it("rejette un mot de passe sans chiffre", () => {
    const r = registerSchema.safeParse({ ...validRegister, password: "SecretABC", confirm_password: "SecretABC" });
    expect(r.success).toBe(false);
  });

  it("rejette un mot de passe trop court (< 8 caractères)", () => {
    const r = registerSchema.safeParse({ ...validRegister, password: "Sec1", confirm_password: "Sec1" });
    expect(r.success).toBe(false);
  });

  it("rejette des mots de passe différents", () => {
    const r = registerSchema.safeParse({ ...validRegister, confirm_password: "Autre123" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toContain("confirm_password");
  });

  it("rejette une filière trop courte", () => {
    const r = registerSchema.safeParse({ ...validRegister, field_of_study: "A" });
    expect(r.success).toBe(false);
  });

  it("rejette un établissement trop court", () => {
    const r = registerSchema.safeParse({ ...validRegister, institution: "U" });
    expect(r.success).toBe(false);
  });

  it("accepte tous les niveaux académiques valides", () => {
    const levels = ["terminale", "bts_1", "bts_2", "licence_1", "licence_2", "licence_3", "master_1", "master_2", "doctorat"] as const;
    for (const level of levels) {
      const r = registerSchema.safeParse({ ...validRegister, academic_level: level });
      expect(r.success, `Niveau ${level} devrait être valide`).toBe(true);
    }
  });
});

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepte des identifiants valides", () => {
    const r = loginSchema.safeParse({ email: "user@test.com", password: "monmdp" });
    expect(r.success).toBe(true);
  });

  it("rejette un mot de passe vide", () => {
    const r = loginSchema.safeParse({ email: "user@test.com", password: "" });
    expect(r.success).toBe(false);
  });

  it("rejette un email invalide", () => {
    const r = loginSchema.safeParse({ email: "invalide", password: "monmdp" });
    expect(r.success).toBe(false);
  });

  it("rejette des champs manquants", () => {
    const r = loginSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

// ─── otpSchema ──────────────────────────────────────────────────────────────

describe("otpSchema", () => {
  it("accepte un OTP valide à 6 chiffres", () => {
    const r = otpSchema.safeParse({ otp: "123456", email: "user@test.com" });
    expect(r.success).toBe(true);
  });

  it("rejette un OTP de 5 chiffres", () => {
    const r = otpSchema.safeParse({ otp: "12345", email: "user@test.com" });
    expect(r.success).toBe(false);
  });

  it("rejette un OTP de 7 chiffres", () => {
    const r = otpSchema.safeParse({ otp: "1234567", email: "user@test.com" });
    expect(r.success).toBe(false);
  });

  it("rejette un OTP vide", () => {
    const r = otpSchema.safeParse({ otp: "", email: "user@test.com" });
    expect(r.success).toBe(false);
  });

  it("nécessite un email valide", () => {
    const r = otpSchema.safeParse({ otp: "123456", email: "pas-un-email" });
    expect(r.success).toBe(false);
  });
});

// ─── postSchema (si disponible) ─────────────────────────────────────────────

describe("postSchema", () => {
  it("accepte un post général avec contenu", () => {
    const r = postSchema.safeParse({ content: "Bonjour tout le monde !", post_type: "general" });
    expect(r.success).toBe(true);
  });

  it("accepte un post sans contenu (media géré côté frontend)", () => {
    const r = postSchema.safeParse({ content: "", post_type: "general" });
    // Le schema refine permet le contenu vide (media validé frontend)
    expect(r.success).toBe(true);
  });

  it("accepte un post académique avec champs requis", () => {
    const r = postSchema.safeParse({
      content: "Sujet de maths 2023",
      post_type: "exam_subject",
      subject_name: "Mathématiques",
      professor_name: "Prof. Konan",
      academic_level: "licence_1",
    });
    expect(r.success).toBe(true);
  });

  it("rejette un sujet d'examen sans matière ni professeur", () => {
    const r = postSchema.safeParse({
      content: "Un document",
      post_type: "exam_subject",
    });
    expect(r.success).toBe(false);
  });

  it("rejette un post type inconnu", () => {
    const r = postSchema.safeParse({ content: "test", post_type: "invalid_type" });
    expect(r.success).toBe(false);
  });

  it("rejette un contenu trop long (> 5000 caractères)", () => {
    const r = postSchema.safeParse({ content: "A".repeat(5001), post_type: "general" });
    expect(r.success).toBe(false);
  });
});
