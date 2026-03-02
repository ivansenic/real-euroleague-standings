import Footer from "@/components/Footer.jsx";
import Navigation from "@/components/Navigation.jsx";
import StandingsCalculator from "@/components/StandingsCalculator.jsx";
import { Metadata, Viewport } from "next";
import Image from "next/image.js";
import {
  generateEuroleagueStandingsFormXml,
  parseScheduleGames,
} from "../../../standings.js";

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

export const metadata: Metadata = {
  title: "EuroLeague 2025/26 Final Rounds Calculator",
  description: "Calculator for the EuroLeague 2025/26 final rounds.",
  keywords: ["euroleague", "basketball", "standings", "table", "calculator"],
  openGraph: {
    title: "EuroLeague 2025/26 Final Rounds Calculator",
    description: "Calculator for the EuroLeague 2025/26 final rounds.",
    images: [
      {
        url: "https://euroleague-standings.com/images/open-graph.png",
      },
    ],
  },
};

const LAST_ROUNDS = 8;

export default async function Home() {
  const [resultsResponse, scheduleResponse] = await Promise.all([
    fetch("https://api-live.euroleague.net/v1/results?seasoncode=E2025", {
      next: { revalidate: 5 * 60 },
    }),
    fetch("https://api-live.euroleague.net/v1/schedules?seasonCode=E2025", {
      next: { revalidate: 5 * 60 },
    }),
  ]);

  const resultsXml = await resultsResponse.text();
  const { teams } = generateEuroleagueStandingsFormXml(resultsXml);

  const scheduleXml = await scheduleResponse.text();
  const allScheduleGames = parseScheduleGames(scheduleXml);

  // Find all gamedays and take the last N
  const allGamedays = [
    ...new Set(allScheduleGames.map((g) => g.gameday)),
  ].sort((a, b) => a - b);
  const lastGamedays = allGamedays.slice(-LAST_ROUNDS);

  // Filter to unplayed games in the last N gamedays, drop empty rounds
  const remainingGames = allScheduleGames
    .filter((g) => lastGamedays.includes(g.gameday) && !g.played)
    .sort((a, b) => a.gameday - b.gameday || a.gameNumber - b.gameNumber);

  return (
    <div className="overflow-auto min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main>
        <Navigation />
        <div className="w-full flex gap-2 items-center mb-4">
          <div className="relative w-12 h-12">
            <Image src="/images/euroleague.png" alt="Euroleague" fill />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              EuroLeague 2025/26 Final Rounds Calculator
            </h1>
            <p className="max-w-4xl text-sm text-gray-300">
              Calculator for the final standings with tiebreakers.
            </p>
          </div>
        </div>
        <StandingsCalculator
          games={remainingGames}
          teams={teams}
          playOffPosition={6}
          playInPosition={10}
        />
      </main>
      <Footer />
    </div>
  );
}
