"use client";

import { useBreakpoint } from "@/hooks/useBreakpoint";
import { createStandings } from "@/standings";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { Suspense, useCallback, useMemo, useState } from "react";
import Standings from "./Standings.jsx";
import { TeamBox } from "./TeamBox.jsx";

const INITIALLY_EXPANDED_ROUNDS = 1;

const GameRow = ({ game, index, position, columns, selection, onSelectionChange }) => {
  const row = Math.floor(position / columns);
  return (
    <div className={`flex py-3 justify-center gap-2 rounded ${row % 2 !== 0 ? "bg-white/5" : ""}`}>
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
          onSelectionChange(e.target.value, index);
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
};

const StandingsCalculator = ({
  games,
  teams,
  playOffPosition,
  playInPosition,
}) => {
  // handle small screen
  const isSmallScreen = useBreakpoint("sm");
  const isLargeScreen = useBreakpoint("lg");
  const isXlScreen = useBreakpoint("xl");
  const columns = isXlScreen ? 2 : 1;

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

  // Group games by gameday if available
  const hasGamedays = games.length > 0 && games[0].gameday !== undefined;
  const groupedGames = useMemo(() => {
    if (!hasGamedays) return null;

    const gamedayMap = new Map();

    games.forEach((game, index) => {
      if (!gamedayMap.has(game.gameday)) {
        gamedayMap.set(game.gameday, []);
      }
      gamedayMap.get(game.gameday).push({ game, index });
    });

    const sortedGamedays = [...gamedayMap.keys()].sort((a, b) => a - b);
    return sortedGamedays.map((gameday) => ({
      gameday,
      entries: gamedayMap.get(gameday),
    }));
  }, [games, hasGamedays]);

  // Expand the round closest to the current date
  const [openRounds, setOpenRounds] = useState(() => {
    if (!hasGamedays || !groupedGames) return new Set();
    const now = new Date();
    let closestGameday = groupedGames[0]?.gameday;
    let closestDiff = Infinity;
    for (const group of groupedGames) {
      const dateStr = group.entries[0]?.game?.date;
      if (!dateStr) continue;
      const diff = Math.abs(new Date(dateStr).getTime() - now.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestGameday = group.gameday;
      }
    }
    return new Set([closestGameday]);
  });

  const toggleRound = useCallback((gameday) => {
    setOpenRounds((prev) => {
      const next = new Set(prev);
      if (next.has(gameday)) {
        next.delete(gameday);
      } else {
        next.add(gameday);
      }
      return next;
    });
  }, []);

  const renderGameRows = (gameEntries) => {
    return gameEntries.map(({ game, index }, position) => {
      const selection = selections.find((s) => s.index === index);
      return (
        <GameRow
          key={index}
          game={game}
          index={index}
          position={position}
          columns={columns}
          selection={selection}
          onSelectionChange={onSelectionChange}
        />
      );
    });
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-700 px-4 py-5 sm:p-6 my-8">
        {games.length === 0 && (
          <p className="text-sm md:text-base">
            All games have been finalized, no calculation possible anymore.
          </p>
        )}
        {games.length > 0 && (
          <>
            {groupedGames ? (
              <div>
                {groupedGames.map((group) => (
                  <RoundGroup
                    key={group.gameday}
                    gameday={group.gameday}
                    entries={group.entries}
                    isOpen={openRounds.has(group.gameday)}
                    onToggle={() => toggleRound(group.gameday)}
                    renderGameRows={renderGameRows}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4">
                {games.map((game, index) => {
                  const selection = selections.find((s) => s.index === index);
                  return (
                    <GameRow
                      key={index}
                      game={game}
                      index={index}
                      position={index}
                      columns={columns}
                      selection={selection}
                      onSelectionChange={onSelectionChange}
                    />
                  );
                })}
              </div>
            )}
            <div className="flex py-3 justify-center gap-2">
              <button
                className="text-sm font-semibold text-gray-400 hover:text-white"
                onClick={resetAll}
              >
                <XMarkIcon className="h-4 w-4 inline-block mr-1" />
                <span>Reset selections</span>
              </button>
            </div>
          </>
        )}
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

const RoundGroup = ({
  gameday,
  entries,
  isOpen,
  onToggle,
  renderGameRows,
}) => {
  // Get the date from the first game entry
  const date = entries[0]?.game?.date;

  return (
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-gray-300 hover:text-white"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span>Round {gameday}</span>
          {date && (
            <span className="text-gray-500 font-normal">{date}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <div className={`grid grid-cols-1 ${entries.length > 1 ? "xl:grid-cols-2" : ""} gap-x-4 pb-2`}>
          {renderGameRows(entries)}
        </div>
      )}
    </div>
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
