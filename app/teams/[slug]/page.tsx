import Footer from "@/components/Footer.jsx";
import KnownTiebreakers from "@/components/KnownTiebreakers.jsx";
import Navigation from "@/components/Navigation.jsx";
import TeamGames from "@/components/TeamGames.jsx";
import { TeamLogo } from "@/components/TeamLogo.jsx";
import { fetchPolymarketOdds, POLYMARKET_CONFIG } from "@/lib/polymarket.js";
import {
  COMPETITIONS,
  resultsUrl,
  scheduleUrl,
  SEASON_LABEL,
  SITE_URL,
} from "@/lib/season.js";
import {
  fetchFeed,
  findCompetition,
  getTeamPageData,
  ordinal,
} from "@/lib/team-page.js";
import { slugToCode, TEAMS, teamDisplayName } from "@/lib/teams.js";
import { parseScheduleGames } from "@/standings.js";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

export const revalidate = 300;
export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.values(TEAMS).map(({ slug }) => ({ slug }));
}

// cached per request, shared by generateMetadata and the page
const loadTeam = cache(async (slug: string) => {
  const code = slugToCode(slug);
  if (!code) {
    return null;
  }
  const [euroleagueXml, eurocupXml] = await Promise.all([
    fetchFeed(scheduleUrl(COMPETITIONS.euroleague.seasonCode)),
    fetchFeed(scheduleUrl(COMPETITIONS.eurocup.seasonCode)),
  ]);
  const scheduleByCompetition = {
    euroleague: parseScheduleGames(euroleagueXml),
    eurocup: parseScheduleGames(eurocupXml),
  };
  const key = findCompetition(code, scheduleByCompetition) as
    | keyof typeof COMPETITIONS
    | null;
  if (!key) {
    return null;
  }
  const competition = COMPETITIONS[key];
  const config = POLYMARKET_CONFIG[key];
  const [resultsXml, odds] = await Promise.all([
    fetchFeed(resultsUrl(competition.seasonCode)),
    fetchPolymarketOdds(config),
  ]);
  const data = getTeamPageData({
    code,
    competition: key,
    scheduleGames: scheduleByCompetition[key],
    resultsXml,
    odds,
    config,
    ref: process.env.NEXT_PUBLIC_POLYMARKET_REF ?? "",
  });
  return { code, slug, name: teamDisplayName(code), competition, ...data };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const team = await loadTeam(slug);
  if (!team) {
    return {};
  }
  const { name, competition, standing } = team;
  const title = `${name} – ${competition.name} ${SEASON_LABEL} Results, Schedule & Tiebreakers`;
  const record = standing
    ? ` ${standing.wins}-${standing.losses}, ${ordinal(standing.position)} in ${
        standing.group ? `group ${standing.group}` : "the standings"
      }.`
    : "";
  const description = `${name} in the ${competition.name} ${SEASON_LABEL}.${record} Latest results, upcoming games and known head-to-head tiebreakers.`;
  const url = `${SITE_URL}/teams/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: `${SITE_URL}/images/open-graph.png` }],
    },
  };
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const team = await loadTeam(slug);
  if (!team) {
    notFound();
  }
  const { competition, standing } = team;

  return (
    <div className="overflow-auto min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="min-h-screen">
        <Navigation />
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
            <TeamLogo code={team.code} size={56} className="shrink-0" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-white">{team.name}</h1>
            <p className="text-sm text-gray-300">
              <Link
                href={competition.standingsPath}
                className="hover:underline"
              >
                {competition.name} {SEASON_LABEL}
              </Link>
              {standing?.group && ` · Group ${standing.group}`}
              {standing &&
                ` · ${ordinal(standing.position)} · ${standing.wins}-${standing.losses}`}
            </p>
          </div>
        </div>
        <TeamGames
          code={team.code}
          last={team.last}
          next={team.next}
          accentClass={competition.accentClass}
          accentBadgeClass={competition.accentBadgeClass}
        />
        <KnownTiebreakers
          positive={team.tiebreakers.positive}
          negative={team.tiebreakers.negative}
        />
        <Link
          href={competition.standingsPath}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← {competition.name} standings
        </Link>
      </main>
      <Footer />
    </div>
  );
}
