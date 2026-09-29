"use client";

import { TeamLogo } from "@/components/TeamLogo.jsx";
import {
  formatDayLabel,
  formatStartTime,
  getGameStatus,
  swipeDirection,
} from "@/lib/schedule.js";
import { teamCodeToAbbreviation } from "@/utils/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";

// null during server render and hydration, then the current time,
// refreshed every minute so cached pages switch games to live on time
const useNow = () => {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

// fixed locale and zone so server render and hydration match
const BERLIN = { locale: "en-GB", timeZone: "Europe/Berlin" };

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

const Middle = ({ game, status, now, accentBadgeClass }) => {
  if (status === "final" && game.homeScore !== undefined) {
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
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        LIVE
      </span>
    );
  }
  // server renders Berlin time, the browser switches to the viewer's zone
  let time = game.time;
  if (game.startsAt) {
    time = formatStartTime(game.startsAt, now === null ? BERLIN : undefined);
  }
  return <span className="text-gray-400 tabular-nums">{time}</span>;
};

const Odds = ({ odds, live, accentClass }) => {
  if (!odds) {
    return null;
  }
  return (
    <a
      href={odds.url}
      target="_blank"
      rel="sponsored noopener"
      title={live ? "Live win probability" : "Win probability"}
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

const GameRow = ({ game, now, accentClass, accentBadgeClass }) => {
  const status = getGameStatus(game, now);
  return (
    <li className="grid grid-cols-[1fr_7rem_1fr] items-center gap-2 border-t border-white/5 py-1.5">
      <span className="flex min-w-0 items-center justify-end gap-2 text-right text-gray-200">
        <TeamName code={game.homeCode} name={game.homeName} />
        <TeamLogo code={game.homeCode} size={20} className="shrink-0" />
      </span>
      <span className="flex flex-col items-center gap-0.5">
        <Middle
          game={game}
          status={status}
          now={now}
          accentBadgeClass={accentBadgeClass}
        />
        <Odds
          odds={game.odds}
          live={status === "live"}
          accentClass={accentClass}
        />
      </span>
      <span className="flex min-w-0 items-center gap-2 text-gray-200">
        <TeamLogo code={game.awayCode} size={20} className="shrink-0" />
        <TeamName code={game.awayCode} name={game.awayName} />
      </span>
    </li>
  );
};

const ScheduleWidget = ({
  days,
  defaultIndex,
  accentClass = "text-orange-400",
  accentBadgeClass = "bg-orange-400/15 text-orange-400",
}) => {
  const [index, setIndex] = useState(Math.max(defaultIndex, 0));
  // last navigation direction, drives the slide-in animation
  const [direction, setDirection] = useState(0);
  const touchStart = useRef(null);
  const now = useNow();

  const go = (step) => {
    const next = index + step;
    if (step === 0 || next < 0 || next >= days.length) {
      return;
    }
    setDirection(step);
    setIndex(next);
  };

  const onTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event) => {
    if (!touchStart.current) {
      return;
    }
    const touch = event.changedTouches[0];
    go(
      swipeDirection(
        touch.clientX - touchStart.current.x,
        touch.clientY - touchStart.current.y
      )
    );
    touchStart.current = null;
  };

  if (days.length === 0) {
    return null;
  }

  const day = days[index];
  const hasPrev = index > 0;
  const hasNext = index < days.length - 1;

  return (
    <div
      className="mb-6 w-full touch-pan-y overflow-hidden rounded-lg border border-white/10 p-3 text-sm"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous game day"
          disabled={!hasPrev}
          onClick={() => go(-1)}
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
          onClick={() => go(1)}
          className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <ul
        key={day.date}
        className={classNames("grid grid-cols-1 gap-x-8 lg:grid-cols-2", {
          "motion-safe:animate-slide-in-right": direction === 1,
          "motion-safe:animate-slide-in-left": direction === -1,
        })}
      >
        {day.games.map((game) => (
          <GameRow
            key={game.gameNumber}
            game={game}
            now={now}
            accentClass={accentClass}
            accentBadgeClass={accentBadgeClass}
          />
        ))}
      </ul>
    </div>
  );
};

export default ScheduleWidget;
