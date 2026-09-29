import { parseResultScores } from "../standings.js";
import { fetchPolymarketOdds } from "./polymarket.js";
import { buildScheduleDays, pickDefaultDateIndex, todayIso } from "./schedule.js";

// Server-side data for <ScheduleWidget>, shared by the competition pages.
// Pages pass `odds` (a Map or promise) to fetch it alongside their own requests.
/**
 * @param {{
 *   scheduleGames: object[],
 *   resultsXml: string,
 *   config: object,
 *   ref?: string,
 *   today?: string,
 *   fetchImpl?: typeof fetch,
 *   odds?: Map<string, { home: number, away: number }>
 *     | Promise<Map<string, { home: number, away: number }>>,
 * }} options
 */
export async function getScheduleWidgetProps({
  scheduleGames,
  resultsXml,
  config,
  ref = process.env.NEXT_PUBLIC_POLYMARKET_REF ?? "",
  today = todayIso(),
  fetchImpl = fetch,
  odds = fetchPolymarketOdds(config, fetchImpl),
}) {
  const days = buildScheduleDays({
    scheduleGames,
    scores: parseResultScores(resultsXml),
    odds: await odds,
    config,
    ref,
  });
  return { days, defaultIndex: pickDefaultDateIndex(days, today) };
}
