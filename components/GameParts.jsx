"use client";

import { TeamLogo } from "@/components/TeamLogo.jsx";
import { teamPath } from "@/lib/teams.js";
import { teamCodeToAbbreviation } from "@/utils/utils";
import classNames from "classnames";
import Link from "next/link";
import { useEffect, useState } from "react";

// null during server render and hydration, then the current time,
// refreshed every minute so cached pages switch games to live on time
export const useNow = () => {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

// fixed locale and zone so server render and hydration match
export const BERLIN = { locale: "en-GB", timeZone: "Europe/Berlin" };

export const Score = ({ score, won, accentBadgeClass }) => (
  <span
    className={classNames(
      "min-w-[2.25rem] rounded px-1 text-center font-semibold tabular-nums",
      won ? accentBadgeClass : "text-gray-400"
    )}
  >
    {score}
  </span>
);

export const Odds = ({ odds, live, accentClass }) => {
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

export const TeamName = ({ code, name }) => (
  <span className="min-w-0 truncate" title={name || code}>
    <span className="sm:hidden">{teamCodeToAbbreviation(code)}</span>
    <span className="hidden sm:inline">
      {name || teamCodeToAbbreviation(code)}
    </span>
  </span>
);

// team page link when the team is in the registry, plain text otherwise
export const TeamLink = ({ code, className, children }) => {
  const href = teamPath(code);
  if (!href) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

export const MatchupRow = ({ game, children }) => (
  <li className="grid grid-cols-[1fr_7rem_1fr] items-center gap-2 border-t border-white/5 py-1.5">
    <TeamLink
      code={game.homeCode}
      className="flex min-w-0 items-center justify-end gap-2 text-right text-gray-200 hover:text-white"
    >
      <TeamName code={game.homeCode} name={game.homeName} />
      <TeamLogo code={game.homeCode} size={20} className="shrink-0" />
    </TeamLink>
    <span className="flex flex-col items-center gap-0.5">{children}</span>
    <TeamLink
      code={game.awayCode}
      className="flex min-w-0 items-center gap-2 text-gray-200 hover:text-white"
    >
      <TeamLogo code={game.awayCode} size={20} className="shrink-0" />
      <TeamName code={game.awayCode} name={game.awayName} />
    </TeamLink>
  </li>
);
