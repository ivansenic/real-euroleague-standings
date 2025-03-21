import Footer from "@/components/Footer.jsx";
import Navigation from "@/components/Navigation.jsx";
import Standings from "@/components/Standings.jsx";
import { Viewport } from "next";
import Image from "next/image.js";
import { generateEuroleagueStandingsFormXml } from "../standings.js";

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

export default async function Home() {
  // consts
  const data = await fetch("https://api-live.euroleague.net/v1/results", {
    next: { revalidate: 5 * 60 },
  });
  const xml = await data.text();
  const { standings, teams } = generateEuroleagueStandingsFormXml(xml);
  const games = standings
    .map((team) => team.wins + team.losses)
    .reduce((a, b) => Math.max(a, b), 0);

  // state
  return (
    <div className="overflow-auto min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main>
        <Navigation />
        <div className="w-full flex gap-2 items-center mb-4">
          <div className="relative w-12 h-12">
            <Image src="/euroleague.png" alt="Euroleague" fill />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              Real Euroleague Standings 2024/25
            </h1>
            <p className="max-w-4xl text-sm text-gray-300">
              Includes known tiebreakers and results after {games} games.
            </p>
          </div>
        </div>
        <Standings
          standings={standings}
          teams={teams}
          playOffPosition={6}
          playInPosition={10}
        />
      </main>
      <Footer />
    </div>
  );
}
