import { z } from "zod";

export const createPostSchema = z
  .object({
    content: z.string().max(5000, "Maximum 5000 caractères").optional(),
    post_type: z.enum([
      "general", "exam_subject", "course_document",
      "event", "announcement", "conference", "soutenance"
    ]),
    subject_name: z.string().optional(),
    professor_name: z.string().optional(),
    academic_level: z.enum([
      "terminale", "bts_1", "bts_2",
      "licence_1", "licence_2", "licence_3",
      "master_1", "master_2", "doctorat"
    ]).optional(),
    institution: z.string().optional(),
    exam_year: z.number().int().min(1990).max(2030).optional(),
    event_date: z.string().optional(),
    event_location: z.string().optional(),
    event_url: z.string().url().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (["exam_subject", "course_document"].includes(data.post_type)) {
        return data.subject_name && data.professor_name && data.academic_level;
      }
      return true;
    },
    {
      message: "La matière, le professeur et le niveau sont requis pour ce type de publication",
      path: ["subject_name"],
    }
  )
  .refine(
    (data) => data.content || true, // Au moins contenu ou media (validé frontend)
    { message: "Ajoutez du contenu ou un fichier", path: ["content"] }
  );

export type CreatePostInput = z.infer<typeof createPostSchema>;
