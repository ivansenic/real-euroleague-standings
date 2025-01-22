'use client'

import classNames from "classnames";
import React, { useState } from "react";

const formatScoreDiff = (n) => {
  if (n > 0) {
    return `+${n}`;
  }
  return n;
};

const getTieBreakerDetails = (teamCode, standings, teams) => {
  const team = teams.find((team) => team.code === teamCode);
  const result = [];
  Object.keys(team.h2h).forEach(oppCode => {
    const opp = standings.find(t => t.code === oppCode);
    if (opp.wins == team.wins && opp.losses == team.losses) {
      result.push({code: oppCode, name: opp.name, ...team.h2h[oppCode]});
    }
  });

  return result;
}

const Standings = ({ standings, teams }) => {
  const [expandedTeam, setExpandedTeam] = useState(undefined);
  return (
    <table className="min-w-full table-auto divide-y divide-gray-700">
      <thead>
        <tr>
          <th
            scope="col"
            className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white"
          >
            #
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-semibold text-white"
          >
            Team
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-semibold text-white"
            title="Total Wins"
          >
            W
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-semibold text-white"
            title="Total Losses"
          >
            L
          </th>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
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
          <>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
              title="Tie-breaker Wins"
            >
              TBW
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
              title="Tie-breaker Losses"
            >
              TBL
            </th>
            <th
              scope="col"
              className="px-3 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
              title="Tie-breaker Score Difference"
            >
              TB +/-
            </th>
          </>
          <th
            scope="col"
            className="px-3 py-3.5 text-left text-sm font-semibold text-white table-cell sm:hidden"
            title="Tie-breaker"
          >
            TB
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800">
        {standings.map((team, index) => {
          const tiebreakers = team.h2hWins + team.h2hLosses > 0;
          return (
            <React.Fragment key={team.code}>
            <tr
              key={`${team.code}-standings`}
              className={classNames(
                index < 6 && "bg-green-800",
                index >= 6 && index < 10 && "bg-yellow-700"
              )}
            >
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                {index + 1}
              </td>
              <td
                className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white"
                title={team.name}
              >
                <span className="block sm:hidden">{team.code}</span>
                <span className="hidden sm:block">{team.name}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                {team.wins}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                {team.losses}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300  hidden sm:table-cell">
                {(team.wins / (team.wins + team.losses)).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                {formatScoreDiff(team.scoreDiff)}
              </td>
              <>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell">
                  {tiebreakers ? team.h2hWins : "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell">
                  {tiebreakers ? team.h2hLosses : "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 hidden sm:table-cell">
                  {tiebreakers ? formatScoreDiff(team.h2hScoreDiff) : "-"}
                </td>
              </>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300 table-cell sm:hidden">
                {tiebreakers
                  ? `${team.h2hWins}-${team.h2hLosses} (${formatScoreDiff(
                      team.h2hScoreDiff
                    )})`
                  : "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                <button
                  disabled={!tiebreakers}
                  type="button"
                  className={classNames(
                    "rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-white/20 disabled:opacity-50, disabled:cursor-not-allowed",
                    team.code === expandedTeam && "ring ring-white ring-opacity-50 ring-offset-1",
                  )}
                  onClick={() => {
                    if (team.code === expandedTeam) {
                      setExpandedTeam();
                    } else {
                      setExpandedTeam(team.code);
                    }
                  }}
                >
                  {team.code === expandedTeam ? "-" : "+"}
                </button>
              </td>
            </tr>
            {team.code === expandedTeam && (
              <tr className="bg-gray-800" key={`${team.code}-details`}>
                <td className="hidden sm:table-cell"></td>
                <td colSpan="9" className="px-3 py-4 text-sm w-max-content">
                  <table className="table-auto sm:w-auto">
                    <thead>
                      <tr>
                        <th scope="col" className="px-3 py-2 text-sm font-semibold text-white text-left">
                          Tie-Break Opponent
                        </th>
                        <th scope="col" className="px-3 py-2 text-sm font-semibold text-white text-left">
                          W
                        </th>
                        <th scope="col" className="px-3 py-2 text-sm font-semibold text-white text-left">
                          L
                        </th>
                        <th scope="col" className="px-3 py-2 text-sm font-semibold text-white text-left">
                          +/-
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTieBreakerDetails(team.code, standings, teams).map(
                        (opp) => {
                          return (
                            <tr key={`${opp.code}-h2h`}>
                              <td className="px-3 py-2 text-sm text-gray-300">
                                {opp.name}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-300">
                                {opp.wins}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-300">
                                {opp.losses}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-300">
                                {formatScoreDiff(
                                 opp.ptsFor - opp.ptsAgainst
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>

                </td>
              </tr>
              
            )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

export default Standings;
