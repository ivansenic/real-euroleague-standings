import Footer from "@/components/Footer.jsx";
import Navigation from "@/components/Navigation.jsx";
import StandingsCalculator from "@/components/StandingsCalculator.jsx";
import { Viewport } from "next";
import Image from "next/image.js";
import { generateEuroleagueStandingsFormXml } from "../../../standings.js";

export const viewport: Viewport = {
  themeColor: "black",
  initialScale: 1.0,
  width: "device-width",
};

export const metadata: Metadata = {
  title: "EuroLeague 2024/25 Last Round Calculator",
  description: "Calculator for the EuroLeague 2024/25 last round.",
  keywords: ["euroleague", "basketball", "standings", "table", "calculator"],
  openGraph: {
    title: "EuroLeague 2024/25 Last Round Calculator",
    description: "Calculator for the EuroLeague 2024/25 last round.",
    images: [
      {
        url: "https://euroleague-standings.com/open-graph.png",
      },
    ],
  },
};

const lastRoundGames = [
  {
    homeCode: "MUN",
    awayCode: "ULK",
  },
  {
    homeCode: "ASV",
    awayCode: "MCO",
  },
  {
    homeCode: "OLY",
    awayCode: "TEL",
  },
  {
    homeCode: "MIL",
    awayCode: "BAS",
  },
  {
    homeCode: "PAR",
    awayCode: "MAD",
  },
  {
    homeCode: "PRS",
    awayCode: "BER",
  },
  {
    homeCode: "IST",
    awayCode: "ZAL",
  },
  {
    homeCode: "PAN",
    awayCode: "RED",
  },
  {
    homeCode: "BAR",
    awayCode: "VIR",
  },
];

export default async function Home() {
  // consts
  const data = await fetch("https://api-live.euroleague.net/v1/results", {
    next: { revalidate: 5 * 60 },
  });
  const xml = await data.text();
  const { teams } = generateEuroleagueStandingsFormXml(xml);

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
              EuroLeague 2024/25 Last Round Calculator
            </h1>
            <p className="max-w-4xl text-sm text-gray-300">
              Calculator for the final standings with tiebreakers.
            </p>
          </div>
        </div>
        <StandingsCalculator
          lastRoundGames={lastRoundGames}
          teams={teams}
          playOffPosition={6}
          playInPosition={10}
          disableMiniStandings={true}
        />
      </main>
      <Footer />
    </div>
  );
}
