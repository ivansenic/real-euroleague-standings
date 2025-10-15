"use client";

import { TeamBox } from "@/components/TeamBox.jsx";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { applyTieBreak } from "@/standings";
import { teamCodeToAbbreviation } from "@/utils/utils";
import { Field, Label, Switch } from "@headlessui/react";
import classNames from "classnames";
import Image from "next/image";
import React, { Suspense, useCallback, useState } from "react";

const formatScoreDiff = (n) => {
  if (n > 0) {
    return `+${n}`;
  }
  return n;
};

const getTieBreakerDetails = (teamCode, standings, teams) => {
  const team = teams.find((team) => team.code === teamCode);
  const result = [];
  Object.keys(team.h2h).forEach((oppCode) => {
    const opp = standings.find((t) => t.code === oppCode);
    if (opp.wins == team.wins && opp.losses == team.losses) {
      result.push({ code: oppCode, name: opp.name, ...team.h2h[oppCode] });
    }
  });

  return result;
};

const getPredictionDetails = (teamCodes, standings, teams) => {
  const results = [];

  teamCodes.forEach((teamCode) => {
    const team = teams.find((team) => team.code === teamCode);
    let result = {
      code: teamCode,
      name: team.name,
      ptsFor: 0,
      ptsAgainst: 0,
      wins: 0,
      losses: 0,
      h2h: team.h2h,
    };

    Object.keys(team.h2h).forEach((oppCode) => {
      if (teamCodes.includes(oppCode)) {
        const opp = standings.find((t) => t.code === oppCode);
        result = {
          ...result,
          ptsFor: result.ptsFor + team.h2h[oppCode].ptsFor,
          ptsAgainst: result.ptsAgainst + team.h2h[oppCode].ptsAgainst,
          wins: result.wins + team.h2h[oppCode].wins,
          losses: result.losses + team.h2h[oppCode].losses,
        };
      }
    });

    results.push(result);
  });

  results.sort((a, b) => {
    const aTotal = a.wins + a.losses;
    const aPercent = aTotal > 0 ? a.wins / aTotal : 0;
    const bTotal = b.wins + b.losses;
    const bPercent = bTotal > 0 ? b.wins / bTotal : 0;

    // if percentages are different, favor teams with smaller number of games played
    if (bPercent !== aPercent) {
      return bPercent - aPercent;
    } else {
      return aTotal - bTotal;
    }
  });

  let teamsMap = {};
  results.forEach((team) => {
    teamsMap[team.code] = team;
  });

  let finalStandings = [];
  let idx = 0;
  while (idx < results.length) {
    let block = [results[idx]];
    let j = idx + 1;
    while (
      j < results.length &&
      results[j].wins === results[idx].wins &&
      results[j].losses === results[idx].losses
    ) {
      block.push(results[j]);
      j++;
    }
    if (block.length > 1) {
      const tieBroken = applyTieBreak(teamsMap, block);
      finalStandings.push(...tieBroken);
    } else {
      finalStandings.push(block[0]);
    }
    idx = j;
  }

  return finalStandings;
};

const Standings = ({
  standings,
  teams,
  playOffPosition,
  playInPosition,
  disableMiniStandings,
}) => {
  const [expandedTeam, setExpandedTeam] = useState();

  // handle expanded team
  const setExpandedTeamCallback = useCallback(
    (code) => {
      if (code) {
        setExpandedTeam(code);
      } else {
        setExpandedTeam(undefined);
      }
    },
    [setExpandedTeam]
  );

  // handle predication mode
  const [predictionModeTeams, setPredictionModeTeams] = useState();
  const predictionModeEnabled = predictionModeTeams !== undefined;

  // prediction functions
  const togglePredictionMode = useCallback(() => {
    if (predictionModeEnabled) {
      setPredictionModeTeams(undefined);
    } else {
      setPredictionModeTeams([]);
    }
  }, [predictionModeEnabled, setPredictionModeTeams]);

  const toggleTeamPrediction = useCallback(
    (code) => {
      if (predictionModeTeams.includes(code)) {
        setPredictionModeTeams(predictionModeTeams.filter((c) => c !== code));
      } else {
        setPredictionModeTeams([...predictionModeTeams, code]);
      }
    },
    [predictionModeTeams, setPredictionModeTeams]
  );

  const enterTeamsPredictionMode = useCallback(
    (codes) => {
      setPredictionModeTeams(codes);
    },
    [setPredictionModeTeams]
  );

  // handle small screen
  const isSmallScreen = useBreakpoint("sm");
  const isLargeScreen = useBreakpoint("lg");

  return (
    <>
      {!disableMiniStandings && (
        <div className="overflow-hidden rounded-lg border border-gray-700 px-4 py-5 sm:p-6 my-8">
          <div className="flex flex-col-reverse lg:flex-row w-full gap-4 lg:gap-8">
            <div className="grow flex flex-row gap-2 justify-between overflow-auto py-2 lg:py-0">
              {standings.map((team) => {
                return (
                  <TeamBox
                    key={team.code}
                    code={team.code}
                    showIcon={isLargeScreen}
                    enabled={predictionModeEnabled}
                    selected={predictionModeTeams?.includes(team.code)}
                    onSelected={() => toggleTeamPrediction(team.code)}
                  />
                );
              })}
            </div>
            <Field className="flex items-center">
              <Switch
                checked={predictionModeEnabled}
                onChange={togglePredictionMode}
                className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-700 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 data-[checked]:bg-gray-700"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none inline-block size-5 transform rounded-full bg-white opacity-50 shadow ring-0 transition duration-200 ease-in-out group-data-[checked]:translate-x-5 group-data-[checked]:opacity-100"
                />
              </Switch>
              <Label as="span" className="ml-3 text-sm">
                <span className="font-medium text-gray-300">
                  Mini standings
                </span>
              </Label>
            </Field>
          </div>
          {predictionModeEnabled && (
            <div className="w-full mt-4 flex">
              {predictionModeTeams?.length > 1 && (
                <SmallTable
                  title="Tie-break mini standings"
                  details={getPredictionDetails(
                    predictionModeTeams,
                    standings,
                    teams
                  )}
                />
              )}
              {predictionModeTeams.length <= 1 && (
                <p className="text-sm">
                  Select at least 2 teams to view the current tie-break mini
                  standings.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <table className="min-w-full table-auto divide-y divide-gray-700">
        <thead>
          <tr>
            <th
              scope="col"
              className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white"
            ></th>
            <th
              scope="col"
              className="px-2 py-3.5 text-left text-sm font-semibold text-white"
            >
              Team
            </th>
            <th
              scope="col"
              className="px-2 py-3.5 text-left text-sm font-semibold text-white"
              title="Total Wins"
            >
              W
            </th>
            <th
              scope="col"
              className="px-2 py-3.5 text-left text-sm font-semibold text-white"
              title="Total Losses"
            >
              L
            </th>
            <th
              scope="col"
              className="px-2 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
              title="Winning Percentage"
            >
              PCT
            </th>
            <th
              scope="col"
              className="px-2 py-3.5 text-left text-sm font-semibold text-white"
              title="Total Score Difference"
            >
              +/-
            </th>
            <>
              <th
                scope="col"
                className="px-2 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
                title="Tie-breaker Wins"
              >
                TBW
              </th>
              <th
                scope="col"
                className="px-2 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
                title="Tie-breaker Losses"
              >
                TBL
              </th>
              <th
                scope="col"
                className="px-2 py-3.5 text-left text-sm font-semibold text-white hidden sm:table-cell"
                title="Tie-breaker Score Difference"
              >
                TB +/-
              </th>
            </>
            <th
              scope="col"
              className="px-2 py-3.5 text-left text-sm font-semibold text-white table-cell sm:hidden"
              title="Tie-breaker"
            >
              TB
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {standings.map((team, index) => {
            const tiebreakers = team.h2hWins + team.h2hLosses > 0;
            const playOff =
              playOffPosition !== undefined && index < playOffPosition;
            const playIn =
              !playOff &&
              playInPosition !== undefined &&
              index < playInPosition;
            const tieBreakerDetails = getTieBreakerDetails(
              team.code,
              standings,
              teams
            );
            return (
              <React.Fragment key={team.code}>
                <tr key={`${team.code}-standings`}>
                  <td className="whitespace-nowrap px-2 py-3 text-sm text-gray-300">
                    <div
                      className={classNames(
                        "rounded-full p-1 w-8 h-8 text-center content-center font-medium",
                        playOff && "bg-green-700",
                        playIn && index < 10 && "bg-yellow-600"
                      )}
                    >
                      {index + 1}
                    </div>
                  </td>
                  <td
                    className="whitespace-nowrap py-3 pl-4 pr-3 text-sm font-medium text-white"
                    title={team.name}
                  >
                    <div className="flex gap-2 items-center align-middle">
                      <span className="relative size-8 border-2 border-white rounded-full bg-white overflow-hidden">
                        <Image
                          src={`/images/team-logos/${team.code}.webp`}
                          fill
                          alt={teamCodeToAbbreviation(team.code)}
                        />
                      </span>
                      <span className="block sm:hidden">
                        {teamCodeToAbbreviation(team.code)}
                      </span>
                      <span className="hidden sm:block">{team.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300">
                    {team.wins}
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300">
                    {team.losses}
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300  hidden sm:table-cell">
                    {(team.wins / (team.wins + team.losses)).toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300">
                    {formatScoreDiff(team.scoreDiff)}
                  </td>
                  <>
                    <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300 hidden sm:table-cell">
                      {tiebreakers ? team.h2hWins : "-"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300 hidden sm:table-cell">
                      {tiebreakers ? team.h2hLosses : "-"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300 hidden sm:table-cell">
                      {tiebreakers ? formatScoreDiff(team.h2hScoreDiff) : "-"}
                    </td>
                  </>
                  <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300 table-cell sm:hidden">
                    {tiebreakers
                      ? `${team.h2hWins}-${team.h2hLosses} (${formatScoreDiff(
                          team.h2hScoreDiff
                        )})`
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-4 text-sm text-gray-300">
                    {tiebreakers && (
                      <button
                        type="button"
                        className={classNames(
                          "rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-white/20 disabled:opacity-50, disabled:cursor-not-allowed",
                          team.code === expandedTeam &&
                            "ring ring-white ring-opacity-50 ring-offset-1"
                        )}
                        onClick={() => {
                          if (team.code === expandedTeam) {
                            setExpandedTeamCallback();
                          } else {
                            setExpandedTeamCallback(team.code);
                          }
                        }}
                      >
                        {isSmallScreen
                          ? "Tie-Breakers"
                          : team.code === expandedTeam
                          ? "-"
                          : "+"}
                      </button>
                    )}
                  </td>
                </tr>
                {team.code === expandedTeam && tiebreakers && (
                  <tr className="bg-white/5" key={`${team.code}-details`}>
                    <td className="hidden sm:table-cell"></td>
                    <td colSpan="9" className="px-2 py-4 text-sm w-max-content">
                      <SmallTable
                        title="Tie-break opponent"
                        details={tieBreakerDetails}
                      />
                      {!disableMiniStandings && (
                        <button
                          type="button"
                          className="mt-2 mx-3 rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-white/20 disabled:opacity-50, disabled:cursor-not-allowed"
                          onClick={() =>
                            enterTeamsPredictionMode([
                              team.code,
                              ...tieBreakerDetails.map((t) => t.code),
                            ])
                          }
                        >
                          View in mini standings mode
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

const SmallTable = (props) => {
  const { details, title, ...rest } = props;
  return (
    <table className="table-auto w-full sm:w-auto" {...rest}>
      <thead>
        <tr>
          <th
            scope="col"
            className="px-3 py-2 text-sm font-semibold text-white text-left"
          >
            {title}
          </th>
          <th
            scope="col"
            className="px-3 py-2 text-sm font-semibold text-white text-left"
          >
            W
          </th>
          <th
            scope="col"
            className="px-3 py-2 text-sm font-semibold text-white text-left"
          >
            L
          </th>
          <th
            scope="col"
            className="px-3 py-2 text-sm font-semibold text-white text-left"
          >
            +/-
          </th>
        </tr>
      </thead>
      <tbody>
        {details.map((opp) => {
          return (
            <tr key={`${opp.code}-h2h`}>
              <td className="px-3 py-2 text-sm text-gray-300">{opp.name}</td>
              <td className="px-3 py-2 text-sm text-gray-300">{opp.wins}</td>
              <td className="px-3 py-2 text-sm text-gray-300">{opp.losses}</td>
              <td className="px-3 py-2 text-sm text-gray-300">
                {formatScoreDiff(opp.ptsFor - opp.ptsAgainst)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const StandingsWithSuspense = (props) => {
  return (
    <Suspense>
      <Standings {...props} />
    </Suspense>
  );
};

export default StandingsWithSuspense;
