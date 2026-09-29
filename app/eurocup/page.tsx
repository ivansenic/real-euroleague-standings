import Footer from "@/components/Footer.jsx";
import Navigation from "@/components/Navigation.jsx";
import ScheduleWidget from "@/components/ScheduleWidget.jsx";
import Standings from "@/components/Standings.jsx";
import { fetchPolymarketOdds, POLYMARKET_CONFIG } from "@/lib/polymarket.js";
import { getScheduleWidgetProps } from "@/lib/schedule-widget.js";
import {
  COMPETITIONS,
  EUROCUP_GROUPS,
  FEED_REVALIDATE,
  resultsUrl,
  scheduleUrl,
} from "@/lib/season.js";
import { Metadata, Viewport } from "next";
import Image from "next/image.js";
import {
  generateEurocupStandingsFormXml,
  parseScheduleGames,
} from "../../standings.js";

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

export const metadata: Metadata = {
  title: "EuroCup Standings 2026/27",
  description: "Includes known EuroCup 2026/27 tiebreakers in the standings.",
  keywords: ["eurocup", "basketball", "standings", "table"],
  openGraph: {
    title: "Real EuroCup Standings",
    description: "Includes known EuroCup 2026/27 tiebreakers in the standings.",
    images: [
      {
        url: "https://euroleague-standings.com/images/open-graph.png",
      },
    ],
  },
};

export default async function Home() {
  // consts
  const polymarketConfig = POLYMARKET_CONFIG.eurocup;
  const [resultsResponse, scheduleResponse, odds] = await Promise.all([
    fetch(resultsUrl(COMPETITIONS.eurocup.seasonCode), {
      next: { revalidate: FEED_REVALIDATE },
    }),
    fetch(scheduleUrl(COMPETITIONS.eurocup.seasonCode), {
      next: { revalidate: FEED_REVALIDATE },
    }),
    fetchPolymarketOdds(polymarketConfig),
  ]);
  const xml = await resultsResponse.text();
  const scheduleXml = await scheduleResponse.text();
  const scheduleGames = parseScheduleGames(scheduleXml);
  const allRemainingGames = scheduleGames
    .filter((g) => !g.played)
    .sort((a, b) => a.gameday - b.gameday || a.gameNumber - b.gameNumber);

  const groups = EUROCUP_GROUPS.map((name) => {
    const { standings, teams } = generateEurocupStandingsFormXml(
      xml,
      name,
      COMPETITIONS.eurocup.seasonCode
    );
    // Split remaining games by group based on team codes in each group
    const codes = new Set(teams.map((t) => t.code));
    const remainingGames = allRemainingGames.filter(
      (g) => codes.has(g.homeCode) && codes.has(g.awayCode)
    );
    const games = standings
      .map((team) => team.wins + team.losses)
      .reduce((a, b) => Math.max(a, b), 0);
    return { name, standings, teams, remainingGames, games };
  });

  const games = Math.max(...groups.map((g) => g.games));

  const scheduleWidgetProps = await getScheduleWidgetProps({
    scheduleGames,
    resultsXml: xml,
    config: polymarketConfig,
    odds,
  });

  // state
  return (
    <div className="overflow-auto min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="min-h-screen">
        <Navigation />
        <div className="w-full flex gap-2 items-center mb-4">
          <div className="relative w-12 h-12">
            <Image src="/images/eurocup.png" alt="Euroleague" fill />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              Real EuroCup Standings 2026/27
            </h1>
            {games > 0 && (
              <p className="max-w-4xl text-sm text-gray-300">
                Includes known tiebreakers and results after {games} games.
              </p>
            )}
          </div>
        </div>
        <ScheduleWidget
          {...scheduleWidgetProps}
          accentClass="text-indigo-400"
          accentBadgeClass="bg-indigo-400/15 text-indigo-400"
        />
        {games === 0 && (
          <p className="text-gray-300 w-full text-center p-40">
            No games played yet. Check back later for standings.
          </p>
        )}
        {games > 0 && (
          <>
            {groups.map((group) => (
              <div key={group.name} className="pt-4">
                <h1 className="font-medium">Group {group.name}</h1>
                <Standings
                  standings={group.standings}
                  teams={group.teams}
                  playOffPosition={4}
                  remainingGames={group.remainingGames}
                />
              </div>
            ))}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
