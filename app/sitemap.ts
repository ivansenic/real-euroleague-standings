import { SITE_URL } from "@/lib/season.js";
import { TEAMS } from "@/lib/teams.js";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/eurocup",
    "/euroleague/2025-26-final-rounds-calculator",
    "/euroleague/2024-25-last-round-calculator",
    ...Object.values(TEAMS).map(({ slug }) => `/teams/${slug}`),
  ];
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
