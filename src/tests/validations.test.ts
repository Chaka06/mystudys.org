import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validations/auth";

describe("registerSchema", () => {
  const valid = {
    first_name: "Issiaka",
    last_name: "Diarrassouba",
    email: "issiaka@gmail.com",
    phone: "+225 07 00 00 00 00",
    academic_level: "licence_1" as const,
    field_of_study: "Informatique",
    institution: "UVCI",
    password: "Secret123",
    confirm_password: "Secret123",
  };

  it("accepte un formulaire valide", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un prénom trop court", () => {
    const r = registerSchema.safeParse({ ...valid, first_name: "A" });
    expect(r.success).toBe(false);
  });

  it("rejette un email invalide", () => {
    const r = registerSchema.safeParse({ ...valid, email: "pas-un-email" });
    expect(r.success).toBe(false);
  });

  it("rejette un mot de passe sans majuscule", () => {
    const r = registerSchema.safeParse({ ...valid, password: "secret123", confirm_password: "secret123" });
    expect(r.success).toBe(false);
  });

  it("rejette un mot de passe sans chiffre", () => {
    const r = registerSchema.safeParse({ ...valid, password: "SecretABC", confirm_password: "SecretABC" });
    expect(r.success).toBe(false);
  });

  it("rejette des mots de passe différents", () => {
    const r = registerSchema.safeParse({ ...valid, confirm_password: "Autre123" });
    expect(r.success).toBe(false);
  });

  it("rejette un téléphone invalide", () => {
    const r = registerSchema.safeParse({ ...valid, phone: "abc" });
    expect(r.success).toBe(false);
  });

  it("rejette un niveau académique invalide", () => {
    const r = registerSchema.safeParse({ ...valid, academic_level: "master_9" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepte email + mot de passe valides", () => {
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
});
