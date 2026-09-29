import { parseResultScores } from "../standings.js";
import { fetchPolymarketOdds } from "./polymarket.js";
import { buildScheduleDays, pickDefaultDateIndex, todayIso } from "./schedule.js";

// Server-side data for <ScheduleWidget>, shared by the competition pages
export async function getScheduleWidgetProps({
  scheduleGames,
  resultsXml,
  config,
  ref = process.env.NEXT_PUBLIC_POLYMARKET_REF ?? "",
  today = todayIso(),
  fetchImpl = fetch,
}) {
  const odds = await fetchPolymarketOdds(config, fetchImpl);
  const days = buildScheduleDays({
    scheduleGames,
    scores: parseResultScores(resultsXml),
    odds,
    config,
    ref,
  });
  return { days, defaultIndex: pickDefaultDateIndex(days, today) };
}
