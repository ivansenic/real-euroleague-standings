"use client";

import { TeamLogo } from "@/components/TeamLogo.jsx";
import { formatDayLabel } from "@/lib/schedule.js";
import { teamCodeToAbbreviation } from "@/utils/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { useState } from "react";

const Score = ({ score, won, accentBadgeClass }) => (
  <span
    className={classNames(
      "min-w-[2.25rem] rounded px-1 text-center font-semibold tabular-nums",
      won ? accentBadgeClass : "text-gray-400"
    )}
  >
    {score}
  </span>
);

const Middle = ({ game, accentBadgeClass }) => {
  if (game.played && game.homeScore !== undefined) {
    return (
      <span className="flex items-center gap-1">
        <Score
          score={game.homeScore}
          won={game.homeScore > game.awayScore}
          accentBadgeClass={accentBadgeClass}
        />
        <span className="text-gray-500">-</span>
        <Score
          score={game.awayScore}
          won={game.awayScore > game.homeScore}
          accentBadgeClass={accentBadgeClass}
        />
      </span>
    );
  }
  return <span className="text-gray-400 tabular-nums">{game.time} CET</span>;
};

const Odds = ({ odds, accentClass }) => {
  if (!odds) {
    return null;
  }
  return (
    <a
      href={odds.url}
      target="_blank"
      rel="sponsored noopener"
      title="Win probability"
      className="rounded-full bg-white/5 px-2 py-0.5 text-xs tabular-nums text-gray-300 hover:bg-white/10"
    >
      <span className={odds.home >= odds.away ? accentClass : ""}>
        {odds.home}%
      </span>
      {" · "}
      <span className={odds.away > odds.home ? accentClass : ""}>
        {odds.away}%
      </span>
    </a>
  );
};

const TeamName = ({ code, name }) => (
  <span className="min-w-0 truncate" title={name || code}>
    <span className="sm:hidden">{teamCodeToAbbreviation(code)}</span>
    <span className="hidden sm:inline">
      {name || teamCodeToAbbreviation(code)}
    </span>
  </span>
);

const ScheduleWidget = ({
  days,
  defaultIndex,
  accentClass = "text-orange-400",
  accentBadgeClass = "bg-orange-400/15 text-orange-400",
}) => {
  const [index, setIndex] = useState(Math.max(defaultIndex, 0));

  if (days.length === 0) {
    return null;
  }

  const day = days[index];
  const hasPrev = index > 0;
  const hasNext = index < days.length - 1;

  return (
    <div className="mb-6 w-full rounded-lg border border-white/10 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous game day"
          disabled={!hasPrev}
          onClick={() => setIndex(index - 1)}
          className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="font-semibold text-white">
          {formatDayLabel(day.date)}
        </span>
        <button
          type="button"
          aria-label="Next game day"
          disabled={!hasNext}
          onClick={() => setIndex(index + 1)}
          className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
        {day.games.map((game) => (
          <li
            key={game.gameNumber}
            className="grid grid-cols-[1fr_7rem_1fr] items-center gap-2 border-t border-white/5 py-1.5"
          >
            <span className="flex min-w-0 items-center justify-end gap-2 text-right text-gray-200">
              <TeamName code={game.homeCode} name={game.homeName} />
              <TeamLogo code={game.homeCode} size={20} className="shrink-0" />
            </span>
            <span className="flex flex-col items-center gap-0.5">
              <Middle game={game} accentBadgeClass={accentBadgeClass} />
              <Odds odds={game.odds} accentClass={accentClass} />
            </span>
            <span className="flex min-w-0 items-center gap-2 text-gray-200">
              <TeamLogo code={game.awayCode} size={20} className="shrink-0" />
              <TeamName code={game.awayCode} name={game.awayName} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScheduleWidget;
