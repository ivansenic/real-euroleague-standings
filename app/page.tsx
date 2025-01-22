import generateStandingsFormXml from "../standings.js";
import Standings from "@/components/Standings.jsx";

export default async function Home() {
  // consts
  const data = await fetch("https://api-live.euroleague.net/v1/results", {
    next: { revalidate: 60 * 60 },
  });
  const xml = await data.text();
  const { standings, teams } = generateStandingsFormXml(xml);
  const games = standings
    .map((team) => team.wins + team.losses)
    .reduce((a, b) => Math.max(a, b), 0);

  // state
  return (
    <div className="overflow-scroll items-center justify-items-center min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="w-full">
          <h1 className="text-base font-semibold text-white">
            Real Euroleague Standings 2024/25
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-gray-300">
            Includes known tiebreakers and results after {games} games.
          </p>
        </div>
        <Standings standings={standings} teams={teams} />
      </main>
      <footer className="pt-6 row-start-3 flex gap-6 flex-wrap items-center justify-center text-gray-500">
        <p>
          Made in Dorćol. Zvezda je život, sve drugo su sitnice! 🔴 ⚪ 🔴 ⚪
        </p>
      </footer>
    </div>
  );
}
