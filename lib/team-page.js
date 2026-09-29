import {
  generateEurocupStandingsFormXml,
  generateEuroleagueStandingsFormXml,
  parseResultScores,
} from "../standings.js";
import { buildScheduleDays } from "./schedule.js";
import { EUROCUP_GROUPS } from "./season.js";

// the XML parser throws on an empty string, failed feeds become empty ones
export const orEmptyXml = (text) => (text?.trim() ? text : "<empty/>");

const playsIn = (code) => (game) =>
  game.homeCode === code || game.awayCode === code;

export function findCompetition(code, gamesByCompetition) {
  for (const [key, games] of Object.entries(gamesByCompetition)) {
    if (games.some(playsIn(code))) {
      return key;
    }
  }
  return null;
}

// days and their games come sorted by date and start time
export function getTeamGames(days, code, count = 3) {
  const games = days.flatMap((day) =>
    day.games.filter(playsIn(code)).map((game) => ({ ...game, date: day.date }))
  );
  return {
    last: games.filter((g) => g.played).slice(-count).reverse(),
    next: games.filter((g) => !g.played).slice(0, count),
  };
}

// known = both games against the opponent played
export function getKnownTiebreakers(team, standings) {
  const positive = [];
  const negative = [];
  for (const [code, { wins, losses, ptsFor, ptsAgainst }] of Object.entries(
    team.h2h
  )) {
    if (wins + losses !== 2) {
      continue;
    }
    const diff = ptsFor - ptsAgainst;
    const entry = { code, wins, losses, diff };
    if (wins > losses || (wins === losses && diff > 0)) {
      positive.push(entry);
    } else if (wins < losses || diff < 0) {
      negative.push(entry);
    }
  }
  const position = (code) => standings.findIndex((t) => t.code === code);
  const byPosition = (a, b) => position(a.code) - position(b.code);
  return { positive: positive.sort(byPosition), negative: negative.sort(byPosition) };
}

// timeZone undefined = the viewer's own
export function isSameDay(startsAt, now, timeZone) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return day.format(new Date(startsAt)) === day.format(new Date(now));
}

export function ordinal(n) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function findStanding(competition, code, resultsXml) {
  const tables =
    competition === "eurocup"
      ? EUROCUP_GROUPS.map((group) => ({
          group,
          ...generateEurocupStandingsFormXml(resultsXml, group),
        }))
      : [{ group: null, ...generateEuroleagueStandingsFormXml(resultsXml) }];
  for (const { group, standings } of tables) {
    const index = standings.findIndex((t) => t.code === code);
    if (index !== -1) {
      return { group, position: index + 1, team: standings[index], standings };
    }
  }
  return null;
}

export function getTeamPageData({
  code,
  competition,
  scheduleGames,
  resultsXml,
  odds,
  config,
  ref,
}) {
  const days = buildScheduleDays({
    scheduleGames,
    scores: parseResultScores(resultsXml),
    odds,
    config,
    ref,
  });
  const games = getTeamGames(days, code);
  const found = findStanding(competition, code, resultsXml);
  if (!found) {
    return { ...games, standing: null, tiebreakers: { positive: [], negative: [] } };
  }
  const { group, position, team, standings } = found;
  return {
    ...games,
    standing: { group, position, wins: team.wins, losses: team.losses },
    tiebreakers: getKnownTiebreakers(team, standings),
  };
}
