import type { Metadata } from "next";
import { SearchResults } from "@/components/search/SearchResults";

export const metadata: Metadata = {
  title: "Recherche",
  description: "Recherchez des cours, sujets d'examens, documents académiques et profils d'étudiants sur STUDY'S.",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ q?: string; type?: string; level?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, type, level } = await searchParams;

  return (
    <SearchResults
      query={q ?? ""}
      initialType={type}
      initialLevel={level}
    />
  );
}
