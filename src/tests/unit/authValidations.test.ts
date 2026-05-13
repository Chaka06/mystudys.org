import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validations/auth";

describe("registerSchema", () => {
  const valid = {
    first_name: "Issiaka",
    last_name: "Diarrassouba",
    email: "issiaka@mystudys.org",
    phone: "+2250799298420",
    academic_level: "licence_1" as const,
    field_of_study: "Informatique",
    institution: "UVCI",
    password: "Motdepasse1",
    confirm_password: "Motdepasse1",
  };

  it("valide un profil complet et correct", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un prénom trop court (< 2 chars)", () => {
    const result = registerSchema.safeParse({ ...valid, first_name: "I" });
    expect(result.success).toBe(false);
  });

  it("rejette un email invalide", () => {
    const result = registerSchema.safeParse({ ...valid, email: "notanemail" });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe sans majuscule", () => {
    const result = registerSchema.safeParse({ ...valid, password: "motdepasse1", confirm_password: "motdepasse1" });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe sans chiffre", () => {
    const result = registerSchema.safeParse({ ...valid, password: "MotDePasse", confirm_password: "MotDePasse" });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe trop court (< 8 chars)", () => {
    const result = registerSchema.safeParse({ ...valid, password: "Abc1", confirm_password: "Abc1" });
    expect(result.success).toBe(false);
  });

  it("rejette quand les mots de passe ne correspondent pas", () => {
    const result = registerSchema.safeParse({ ...valid, confirm_password: "Autrechose1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("confirm_password");
    }
  });

  it("rejette un niveau académique invalide", () => {
    const result = registerSchema.safeParse({ ...valid, academic_level: "invalid_level" as any });
    expect(result.success).toBe(false);
  });

  it("rejette un numéro de téléphone invalide", () => {
    const result = registerSchema.safeParse({ ...valid, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("accepte tous les niveaux académiques valides", () => {
    const levels = ["terminale", "bts_1", "bts_2", "licence_1", "licence_2", "licence_3", "master_1", "master_2", "doctorat"];
    levels.forEach((level) => {
      const result = registerSchema.safeParse({ ...valid, academic_level: level });
      expect(result.success).toBe(true);
    });
  });
});

describe("loginSchema", () => {
  it("valide des identifiants corrects", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "anypassword" });
    expect(result.success).toBe(true);
  });

  it("rejette un email vide", () => {
    const result = loginSchema.safeParse({ email: "", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe vide", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejette un email malformé", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "password" });
    expect(result.success).toBe(false);
  });
});
