"use client";

import {
  BERLIN,
  MatchupRow,
  Odds,
  Score,
  useNow,
} from "@/components/GameParts.jsx";
import {
  formatDayLabel,
  formatStartTime,
  getGameStatus,
  swipeDirection,
} from "@/lib/schedule.js";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import classNames from "classnames";
import { useRef, useState } from "react";

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
        <span className="h-2 w-2 motion-safe:animate-pulse rounded-full bg-red-500" />
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

const GameRow = ({ game, now, accentClass, accentBadgeClass }) => {
  const status = getGameStatus(game, now);
  return (
    <MatchupRow game={game}>
      <Middle
        game={game}
        status={status}
        now={now}
        accentBadgeClass={accentBadgeClass}
      />
      <Odds odds={game.odds} live={status === "live"} accentClass={accentClass} />
    </MatchupRow>
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
