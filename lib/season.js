// Current season. Next season: bump the codes and the label here.
export const SEASON_LABEL = "2026/27";

export const SITE_URL = "https://euroleague-standings.com";

// 2026/27: four groups of eight, top four of each group advance to playoffs
export const EUROCUP_GROUPS = ["A", "B", "C", "D"];

export const FEED_REVALIDATE = 5 * 60;

export const COMPETITIONS = {
  euroleague: {
    key: "euroleague",
    name: "EuroLeague",
    seasonCode: "E2026",
    standingsPath: "/",
    accentClass: "text-orange-400",
    accentBadgeClass: "bg-orange-400/15 text-orange-400",
  },
  eurocup: {
    key: "eurocup",
    name: "EuroCup",
    seasonCode: "U2026",
    standingsPath: "/eurocup",
    accentClass: "text-indigo-400",
    accentBadgeClass: "bg-indigo-400/15 text-indigo-400",
  },
};

const FEED = "https://api-live.euroleague.net/v1";

export const resultsUrl = (seasonCode) =>
  `${FEED}/results?seasoncode=${seasonCode}`;

export const scheduleUrl = (seasonCode) =>
  `${FEED}/schedules?seasonCode=${seasonCode}`;
