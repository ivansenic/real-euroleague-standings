import Footer from "@/components/Footer.jsx";
import Navigation from "@/components/Navigation.jsx";
import Standings from "@/components/Standings.jsx";
import { Viewport } from "next";
import Image from "next/image.js";
import Link from "next/link";
import { generateEuroleagueStandingsFormXml } from "../standings.js";

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

export default async function Home() {
  // consts
  const data = await fetch(
    "https://api-live.euroleague.net/v1/results?seasoncode=E2025",
    {
      next: { revalidate: 5 * 60 },
    }
  );
  const xml = await data.text();
  const { standings, teams } = generateEuroleagueStandingsFormXml(xml);
  const games = standings
    .map((team) => team.wins + team.losses)
    .reduce((a, b) => Math.max(a, b), 0);

  // state
  return (
    <>
      <div className="flex items-center gap-x-6 bg-gray-900 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
        <p className="text-sm/6 text-white">
          <Link href="/euroleague/2025-26-final-rounds-calculator">
            <strong className="font-semibold">Final Rounds Calculator</strong>
            <svg
              viewBox="0 0 2 2"
              aria-hidden="true"
              className="mx-2 inline size-0.5 fill-current"
            >
              <circle r={1} cx={1} cy={1} />
            </svg>
            Select the final rounds outcomes and check the final standings.
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </p>

      </div>
      <div className="overflow-auto min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
        <main className="min-h-screen">
          <Navigation />
          <div className="w-full flex gap-2 items-center mb-4">
            <div className="relative w-12 h-12">
              <Image src="/images/euroleague.png" alt="Euroleague" fill />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                Real EuroLeague Standings 2025/26
              </h1>
              {games > 0 && (
                <p className="max-w-4xl text-sm text-gray-300">
                  Includes known tiebreakers and results after {games} games.
                </p>
              )}
            </div>
          </div>
          {games === 0 && (
            <p className="text-gray-300 w-full text-center p-40">
              No games played yet. Check back later for standings.
            </p>
          )}
          {games > 0 && (
            <Standings
              standings={standings}
              teams={teams}
              playOffPosition={6}
              playInPosition={10}
            />
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
