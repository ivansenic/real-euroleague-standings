"use client";

import { MatchupRow, Odds, Score, useNow } from "@/components/GameParts.jsx";
import {
  formatDayLabel,
  formatStartTime,
  getGameStatus,
  isSameDay,
} from "@/lib/schedule.js";

const ResultMiddle = ({ game, accentBadgeClass }) => (
  <>
    {game.homeScore === undefined ? (
      // results feed can lag behind the schedule
      <span className="text-gray-400">Final</span>
    ) : (
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
    )}
    <span className="text-xs text-gray-500">{formatDayLabel(game.date)}</span>
  </>
);

// date, or start time when the game is today in the viewer's zone;
// server render and hydration always show the date
const FixtureMiddle = ({ game, now, accentClass }) => {
  const status = getGameStatus(game, now);
  let label = formatDayLabel(game.date);
  if (status === "live") {
    label = (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
        <span className="h-2 w-2 motion-safe:animate-pulse rounded-full bg-red-500" />
        LIVE
      </span>
    );
  } else if (now !== null && game.startsAt && isSameDay(game.startsAt, now)) {
    label = formatStartTime(game.startsAt);
  }
  return (
    <>
      <span className="text-gray-400 tabular-nums">{label}</span>
      <Odds
        odds={game.odds}
        live={status === "live"}
        accentClass={accentClass}
      />
    </>
  );
};

const Column = ({ title, empty, children }) => (
  <section className="rounded-lg border border-white/10 p-3">
    <h2 className="mb-2 text-center font-semibold text-white">{title}</h2>
    {children.length === 0 ? (
      <p className="py-4 text-center text-gray-400">{empty}</p>
    ) : (
      <ul>{children}</ul>
    )}
  </section>
);

const TeamGames = ({ code, last, next, accentClass, accentBadgeClass }) => {
  const now = useNow();
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <Column title="Last games" empty="No games played yet">
        {last.map((game) => (
          <MatchupRow key={game.gameNumber} game={game} focusCode={code}>
            <ResultMiddle game={game} accentBadgeClass={accentBadgeClass} />
          </MatchupRow>
        ))}
      </Column>
      <Column title="Next games" empty="No upcoming games">
        {next.map((game) => (
          <MatchupRow key={game.gameNumber} game={game} focusCode={code}>
            <FixtureMiddle game={game} now={now} accentClass={accentClass} />
          </MatchupRow>
        ))}
      </Column>
    </div>
  );
};

export default TeamGames;
