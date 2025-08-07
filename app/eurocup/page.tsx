import Footer from "@/components/Footer.jsx";
import Navigation from "@/components/Navigation.jsx";
import Standings from "@/components/Standings.jsx";
import { Metadata, Viewport } from "next";
import Image from "next/image.js";
import { generateEurocupStandingsFormXml } from "../../standings.js";

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

export const metadata: Metadata = {
  title: "EuroCup Standings 2025/26",
  description: "Includes known EuroCup 2025/26 tiebreakers in the standings.",
  keywords: ["eurocup", "basketball", "standings", "table"],
  openGraph: {
    title: "Real EuroCup Standings",
    description: "Includes known EuroCup 2025/26 tiebreakers in the standings.",
    images: [
      {
        url: "https://euroleague-standings.com/images/open-graph.png",
      },
    ],
  },
};

export default async function Home() {
  // consts
  const data = await fetch(
    "https://api-live.euroleague.net/v1/results?seasoncode=U2025",
    {
      next: { revalidate: 5 * 60 },
    }
  );
  const xml = await data.text();
  const { standings: standingsA, teams: teamsA } =
    generateEurocupStandingsFormXml(xml, "A");
  const { standings: standingsB, teams: teamsB } =
    generateEurocupStandingsFormXml(xml, "B");

  const gamesA = standingsA
    .map((team) => team.wins + team.losses)
    .reduce((a, b) => Math.max(a, b), 0);

  const gamesB = standingsB
    .map((team) => team.wins + team.losses)
    .reduce((a, b) => Math.max(a, b), 0);

  const games = Math.max(gamesA, gamesB);

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
              Real EuroCup Standings 2025/26
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
        {gamesA > 0 && (
          <>
            <div className="pt-4">
              <h1 className="font-medium">Group A</h1>
              <Standings
                standings={standingsA}
                teams={teamsA}
                playOffPosition={2}
                playInPosition={6}
              />
            </div>
            <div className="pt-4">
              <h1 className="font-medium">Group B</h1>
              <Standings
                standings={standingsB}
                teams={teamsB}
                playOffPosition={2}
                playInPosition={6}
              />
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
