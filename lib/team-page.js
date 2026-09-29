import {
  generateEurocupStandingsFormXml,
  generateEuroleagueStandingsFormXml,
  parseResultScores,
} from "../standings.js";
import { buildScheduleDays, shiftIsoDate, todayIso } from "./schedule.js";
import { COMPETITIONS, EUROCUP_GROUPS, FEED_REVALIDATE } from "./season.js";

// the XML parser throws on an empty string, failed feeds become empty ones
export const orEmptyXml = (text) => (text?.trim() ? text : "<empty/>");

// a failed request throws so ISR keeps serving the last good page
export async function fetchFeed(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    next: { revalidate: FEED_REVALIDATE },
  });
  if (!response.ok) {
    throw new Error(`Feed ${url} failed with ${response.status}`);
  }
  return orEmptyXml(await response.text());
}

const playsIn = (code) => (game) =>
  game.homeCode === code || game.awayCode === code;

// throws when a feed is empty: the team may be in it, so a 404 would be a guess
export function findCompetition(code, gamesByCompetition) {
  for (const [key, games] of Object.entries(gamesByCompetition)) {
    if (games.some(playsIn(code))) {
      return key;
    }
  }
  if (Object.values(gamesByCompetition).some((games) => games.length === 0)) {
    throw new Error("Team not found and some schedule feeds are empty");
  }
  return null;
}

// days and their games come sorted by date and start time;
// unplayed games more than a day before today are postponed, not upcoming
export function getTeamGames(days, code, today, count = 3) {
  const games = days.flatMap((day) =>
    day.games.filter(playsIn(code)).map((game) => ({ ...game, date: day.date }))
  );
  const cutoff = today ? shiftIsoDate(today, -1) : "";
  return {
    last: games.filter((g) => g.played).slice(-count).reverse(),
    next: games.filter((g) => !g.played && g.date >= cutoff).slice(0, count),
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

export function ordinal(n) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

// season code picks the overtime games excluded from point differences
function findStanding(competition, seasonCode, code, resultsXml) {
  const tables =
    competition === "eurocup"
      ? EUROCUP_GROUPS.map((group) => ({
          group,
          ...generateEurocupStandingsFormXml(resultsXml, group, seasonCode),
        }))
      : [
          {
            group: null,
            ...generateEuroleagueStandingsFormXml(resultsXml, seasonCode),
          },
        ];
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
  seasonCode = COMPETITIONS[competition].seasonCode,
  scheduleGames,
  resultsXml,
  odds,
  config,
  ref,
  today = todayIso(),
}) {
  const days = buildScheduleDays({
    scheduleGames,
    scores: parseResultScores(resultsXml),
    odds,
    config,
    ref,
  });
  const games = getTeamGames(days, code, today);
  // official feed name, sponsors included, as the standings table shows it
  const scheduled = scheduleGames.find(playsIn(code));
  const fullName =
    scheduled?.homeCode === code ? scheduled.homeName : scheduled?.awayName;
  const found = findStanding(competition, seasonCode, code, resultsXml);
  if (!found) {
    return {
      ...games,
      fullName,
      standing: null,
      tiebreakers: { positive: [], negative: [] },
    };
  }
  const { group, position, team, standings } = found;
  return {
    ...games,
    fullName,
    standing: { group, position, wins: team.wins, losses: team.losses },
    tiebreakers: getKnownTiebreakers(team, standings),
  };
}
