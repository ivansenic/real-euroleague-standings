"use client";

import { useBreakpoint } from "@/hooks/useBreakpoint";
import { createStandings } from "@/standings";
import { Suspense, useCallback, useMemo, useState } from "react";
import Standings from "./Standings.jsx";
import { TeamBox } from "./TeamBox.jsx";
import { XMarkIcon } from "@heroicons/react/20/solid";

const StandingsCalculator = ({
  games,
  teams,
  playOffPosition,
  playInPosition,
}) => {
  // handle small screen
  const isSmallScreen = useBreakpoint("sm");
  const isLargeScreen = useBreakpoint("lg");

  const [selections, setSelections] = useState([]);

  const resetAll = useCallback(() => {
    setSelections([]);
  }, [setSelections]);

  const onSelectionChange = useCallback(
    (selectedValue, index) => {
      const updatedSelections = selections.filter((s) => s.index !== index);
      if (selectedValue === "NA") {
        setSelections(updatedSelections);
      } else {
        setSelections([...updatedSelections, { index, selectedValue }]);
      }
    },
    [selections, setSelections]
  );

  const updatesMemo = useMemo(() => {
    // update all teams
    const updatedTeams = teams.map((team) => {
      return {
        ...team,
      };
    });

    selections.forEach((selection) => {
      const { index, selectedValue } = selection;
      const game = games[index];
      const homeTeam = updatedTeams.find((t) => t.code === game.homeCode);
      const awayTeam = updatedTeams.find((t) => t.code === game.awayCode);

      if (selectedValue === "H") {
        homeTeam.wins += 1;
        homeTeam.h2h[awayTeam.code].wins += 1;
        awayTeam.losses += 1;
        awayTeam.h2h[homeTeam.code].losses += 1;
      } else if (selectedValue === "A") {
        awayTeam.wins += 1;
        awayTeam.h2h[homeTeam.code].wins += 1;
        homeTeam.losses += 1;
        homeTeam.h2h[awayTeam.code].losses += 1;
      }
    });

    let teamsMap = {};
    updatedTeams.forEach((team) => {
      teamsMap[team.code] = team;
    });

    return createStandings(teamsMap);
  }, [selections]);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-700 px-4 py-5 sm:p-6 my-8">
        <div className="divide-y divide-gray-800">
          <>
            {games.map((game, index) => {
              const selection = selections.find((s) => s.index === index);
              return (
                <div className="flex py-3 justify-center gap-2" key={index}>
                  <TeamBox
                    code={game.homeCode}
                    showIcon
                    enabled
                    selected={selection?.selectedValue === "H"}
                    onSelected={() =>
                      onSelectionChange(
                        selection?.selectedValue === "H" ? "NA" : "H",
                        index
                      )
                    }
                  />
                  <select
                    className="block text-center rounded-md bg-white/5 px-3 py-1.5 text-sm text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      onSelectionChange(selectedValue, index);
                    }}
                    value={selection?.selectedValue || "NA"}
                  >
                    <option value="NA">Select outcome</option>
                    <option value="H">Home Win</option>
                    <option value="A">Away Win</option>
                  </select>
                  <TeamBox
                    code={game.awayCode}
                    showIcon
                    enabled
                    selected={selection?.selectedValue === "A"}
                    onSelected={() =>
                      onSelectionChange(
                        selection?.selectedValue === "A" ? "NA" : "A",
                        index
                      )
                    }
                  />
                </div>
              );
            })}
          </>
        </div>
        <div className="flex py-3 justify-center gap-2">
          <button
            className="text-sm font-semibold text-gray-400 hover:text-white"
            onClick={resetAll}
          >
            <XMarkIcon className="h-4 w-4 inline-block mr-1" />
            <span>Reset selections</span>
          </button>
        </div>
      </div>
      <Standings
        standings={updatesMemo.standings}
        teams={updatesMemo.teams}
        playOffPosition={playOffPosition}
        playInPosition={playInPosition}
        disableMiniStandings={true}
      />
    </>
  );
};

const StandingsCalculatorWithSuspense = (props) => {
  return (
    <Suspense>
      <StandingsCalculator {...props} />
    </Suspense>
  );
};

export default StandingsCalculatorWithSuspense;
