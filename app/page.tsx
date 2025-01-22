import classNames from "classnames";
import standings from "../standings.js";

export default function Home() {
  const games = standings[0].wins + standings[0].losses;
  return (
    <div className="items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div>
          <h1 className="text-base font-semibold text-white">
            Real Euroleague Standings 2024/25
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-gray-300">
            Includes knows tiebreakers and results after {games} games.
          </p>
        </div>
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
              >
                #
              </th>
              <th
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0"
              >
                Team
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                title="Total Wins"
              >
                Wins
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                title="Total Losses"
              >
                Losses
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                title="Winning Percentage"
              >
                PCT
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                title="Total Score Difference"
              >
                +/-
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                title="Tie-breaker Wins"
              >
                TB Wins
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                title="Tie-breaker Losses"
              >
                TB Losses
              </th>
              <th
                scope="col"
                className="px-3 py-3.5 text-left text-sm font-semibold text-white"
                title="Tie-breaker Score Difference"
              >
                TB +/-
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {standings.map((team, index) => {
              const tiebreakers = team.h2hWins + team.h2hLosses > 0;
              return (
                <tr
                  key={team.code}
                  className={classNames(
                    index < 6 && "bg-green-800",
                    index >= 6 && index < 10 && "bg-yellow-700"
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {index + 1}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0">
                    {team.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {team.wins}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {team.losses}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {(team.wins / (team.wins + team.losses)).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {team.scoreDiff}
                  </td>
                  <td className={classNames("whitespace-nowrap px-3 py-4 text-sm text-gray-300")}>
                    {tiebreakers ? team.h2hWins : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {tiebreakers ? team.h2hLosses : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                    {tiebreakers ? team.h2hScoreDiff : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
      <footer className="pt-6 row-start-3 flex gap-6 flex-wrap items-center justify-center text-gray-500">
        <p>
          Made by Ivan Senic and Chat GPT. Zvezda je život, sve drugo su
          sitnice! 🔴 ⚪ 🔴 ⚪
        </p>
      </footer>
    </div>
  );
}
