import { buildSlug, polymarketUrl } from "./polymarket.js";

const MONTHS = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// EL feed dates look like "Sep 24, 2026"
export function elDateToIso(elDate) {
  const match = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(elDate.trim());
  if (!match || !MONTHS[match[1]]) {
    return null;
  }
  return `${match[3]}-${MONTHS[match[1]]}-${match[2].padStart(2, "0")}`;
}

export function todayIso(timeZone = "Europe/Berlin", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatDayLabel(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function buildScheduleDays({ scheduleGames, scores, odds, config, ref }) {
  const byDate = new Map();

  for (const scheduleGame of scheduleGames) {
    const date = elDateToIso(scheduleGame.date);
    if (!date) {
      continue;
    }

    const { gameNumber, homeCode, awayCode, time, played } = scheduleGame;
    const game = { gameNumber, homeCode, awayCode, time, played };

    if (played) {
      const score = scores.get(gameNumber);
      if (score) {
        game.homeScore = score.homeScore;
        game.awayScore = score.awayScore;
      }
    } else {
      const slug = buildSlug(config, homeCode, awayCode, date);
      const gameOdds = slug && odds.get(slug);
      if (gameOdds) {
        game.odds = { ...gameOdds, url: polymarketUrl(slug, ref) };
      }
    }

    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date).push(game);
  }

  return [...byDate.keys()].sort().map((date) => ({
    date,
    games: byDate
      .get(date)
      .sort((a, b) => a.time.localeCompare(b.time) || a.gameNumber - b.gameNumber),
  }));
}

export function pickDefaultDateIndex(days, today) {
  if (days.length === 0) {
    return -1;
  }
  const index = days.findIndex((day) => day.date >= today);
  return index === -1 ? days.length - 1 : index;
}
