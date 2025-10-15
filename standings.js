/**
 * EuroLeague Standings & Tie-Break (Node.js)
 *
 * HOW TO RUN FROM COMMAND LINE:
 * 1. Make sure you have Node.js installed.
 * 2. Install the "xmldom" package if you don't have it:
 *      npm install xmldom
 * 3. Place your "results.xml" file in the same directory as this script.
 * 4. (Optional) Edit the array "overtimeGameIDs" below if you have games that went to OT.
 * 5. Run:
 *      node euroleague_standings.js
 *
 * This script will:
 *  - Read results.xml from disk.
 *  - Parse the <game> entries.
 *  - Apply EuroLeague tie-break rules:
 *      (a) Best head-to-head record among tied teams
 *      (b) Head-to-head points difference among tied teams
 *      (c) Overall points difference
 *      (d) Total points scored
 *      (e) Sum of quotients (pointsFor / pointsAgainst) across all games
 *    ... reapplying tie-break among only those teams still tied after each step.
 *  - Exclude all points/differences from any game that is listed as "overtime" in
 *    the "overtimeGameIDs" array.
 *  - Print the standings with columns:
 *      TEAM | W | L | OverallDiff | H2H_W | H2H_L | H2H_Diff
 */

import { DOMParser } from "xmldom";

// -----------------------------
// Customize your OT games here
// -----------------------------
// If you know a certain <game> was decided in overtime, list its <gamenumber>
// (or whatever unique identifier you prefer). For example:
const euroleagueOvertimeGameIDs = [];
const eurocupOvertimeGameIDs = [9];

// -----------------------------
// 2) Generate Standings
// -----------------------------
function parseData(xmlData, overtimeIDs, leagueGames, filter) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlData, "application/xml");
  const gameNodes = xmlDoc.getElementsByTagName("game");

  // Data structure to store team stats
  // { TEAM_CODE: {
  //     name: string,
  //     code: string,
  //     wins: number,
  //     losses: number,
  //     ptsFor: number,
  //     ptsAgainst: number,
  //     sumOfQuotients: number,
  //     h2h: {
  //       [opponentCode]: {
  //         ptsFor: number,
  //         ptsAgainst: number,
  //         wins: number,
  //         losses: number
  //       }
  //     }
  //   }
  // }
  const teams = {};
  const games = [];

  function initTeamIfNotExists(teamCode, teamName) {
    if (!teams[teamCode]) {
      teams[teamCode] = {
        name: teamName,
        code: teamCode,
        wins: 0,
        losses: 0,
        ptsFor: 0,
        ptsAgainst: 0,
        sumOfQuotients: 0,
        h2h: {},
      };
    }
  }

  // -----------------------------
  // 3) Process each <game> entry
  // -----------------------------
  for (let i = 0; i < gameNodes.length; i++) {
    const game = gameNodes[i];

    const homeTeamName = game.getElementsByTagName("hometeam")[0].textContent;
    const homeTeamCode = game.getElementsByTagName("homecode")[0].textContent;
    const awayTeamName = game.getElementsByTagName("awayteam")[0].textContent;
    const awayTeamCode = game.getElementsByTagName("awaycode")[0].textContent;
    const homeScore = parseInt(
      game.getElementsByTagName("homescore")[0].textContent,
      10
    );
    const awayScore = parseInt(
      game.getElementsByTagName("awayscore")[0].textContent,
      10
    );
    const played =
      game.getElementsByTagName("played")[0].textContent === "true";
    const gameNumber = parseInt(
      game.getElementsByTagName("gamenumber")[0].textContent,
      10
    );

    if (!played) {
      // If the game hasn't been played, skip it.
      continue;
    }

    if (gameNumber > leagueGames) {
      // If the game number is higher than the total games in the league, skip it.
      continue;
    }

    // Filter logic
    if (filter) {
      const field = filter.field;
      const value = filter.value;
      const actualValue = game.getElementsByTagName(field)[0].textContent;
      if (actualValue !== value) {
        continue;
      }
    }

    // Add game number to the games array
    games.push(gameNumber);

    // Ensure we have entries for both teams
    initTeamIfNotExists(homeTeamCode, homeTeamName);
    initTeamIfNotExists(awayTeamCode, awayTeamName);

    // Determine the winner (for W/L record), ignoring OT points logic
    // because the outcome doesn't change (someone won).
    if (homeScore > awayScore) {
      teams[homeTeamCode].wins += 1;
      teams[awayTeamCode].losses += 1;
    } else if (awayScore > homeScore) {
      teams[awayTeamCode].wins += 1;
      teams[homeTeamCode].losses += 1;
    }
    // If a tie is possible, handle that as well.
    // (Normally basketball doesn't end in a tie.)

    // Head-to-head structure init
    if (!teams[homeTeamCode].h2h[awayTeamCode]) {
      teams[homeTeamCode].h2h[awayTeamCode] = {
        ptsFor: 0,
        ptsAgainst: 0,
        wins: 0,
        losses: 0,
      };
    }
    if (!teams[awayTeamCode].h2h[homeTeamCode]) {
      teams[awayTeamCode].h2h[homeTeamCode] = {
        ptsFor: 0,
        ptsAgainst: 0,
        wins: 0,
        losses: 0,
      };
    }
    if (homeScore > awayScore) {
      teams[homeTeamCode].h2h[awayTeamCode].wins += 1;
      teams[awayTeamCode].h2h[homeTeamCode].losses += 1;
    } else {
      teams[awayTeamCode].h2h[homeTeamCode].wins += 1;
      teams[homeTeamCode].h2h[awayTeamCode].losses += 1;
    }

    // -----------------------------
    // OT check:
    // If the gameNumber is in the list of OT games,
    // do NOT apply scoring stats or sumOfQuotients
    // (i.e. "don't apply score difference updates").
    // -----------------------------
    const isOvertimeGame = overtimeIDs.includes(gameNumber);
    if (!isOvertimeGame) {
      // Update overall points for/against
      teams[homeTeamCode].ptsFor += homeScore;
      teams[homeTeamCode].ptsAgainst += awayScore;
      teams[awayTeamCode].ptsFor += awayScore;
      teams[awayTeamCode].ptsAgainst += homeScore;

      // Sum of quotients for tie-break #5
      if (awayScore > 0) {
        teams[homeTeamCode].sumOfQuotients += homeScore / awayScore;
      }
      if (homeScore > 0) {
        teams[awayTeamCode].sumOfQuotients += awayScore / homeScore;
      }

      // Update head-to-head points
      teams[homeTeamCode].h2h[awayTeamCode].ptsFor += homeScore;
      teams[homeTeamCode].h2h[awayTeamCode].ptsAgainst += awayScore;
      teams[awayTeamCode].h2h[homeTeamCode].ptsFor += awayScore;
      teams[awayTeamCode].h2h[homeTeamCode].ptsAgainst += homeScore;
    }
  }

  return { teams, games };
}

// Expose the function
export const generateEuroleagueStandingsFormXml = (xmlData) => {
  const { teams, games } = parseData(xmlData, euroleagueOvertimeGameIDs, 380);
  const standings = createStandings(teams);
  return { ...standings, games };
};
export const generateEurocupStandingsFormXml = (xmlData, group) => {
  const { teams, games } = parseData(xmlData, eurocupOvertimeGameIDs, 180, {
    field: "group",
    value: group,
  });
  const standings = createStandings(teams);
  return { ...standings, games };
};

// Expose the helper
// -----------------------------
// 5) Tie-Break function
// -----------------------------
export function applyTieBreak(teams, sortedGroup) {
  if (sortedGroup.length <= 1) {
    return sortedGroup;
  }

  // We'll build a local compare function that tries each step in order
  function buildMiniTable(subGroup) {
    // subGroup: array of team objects
    const miniTable = {};
    subGroup.forEach((teamObj) => {
      miniTable[teamObj.code] = {
        code: teamObj.code,
        name: teamObj.name,
        h2hWins: 0,
        h2hLosses: 0,
        h2hPointsFor: 0,
        h2hPointsAgainst: 0,
      };
    });

    // Accumulate only for teams within subGroup
    subGroup.forEach((t) => {
      const tCode = t.code;
      subGroup.forEach((other) => {
        if (other.code === tCode) return;
        const oCode = other.code;
        // If there's an h2h record, accumulate it
        if (teams[tCode].h2h[oCode]) {
          miniTable[tCode].h2hWins += teams[tCode].h2h[oCode].wins;
          miniTable[tCode].h2hLosses += teams[tCode].h2h[oCode].losses;
          miniTable[tCode].h2hPointsFor += teams[tCode].h2h[oCode].ptsFor;
          miniTable[tCode].h2hPointsAgainst +=
            teams[tCode].h2h[oCode].ptsAgainst;
        }
      });
    });

    return miniTable;
  }

  function compareTeams(a, b, subGroup, previousSubGroup) {
    // Build mini-table from subGroup
    const miniTable = buildMiniTable(subGroup);

    const aMiniTable = miniTable[a.code];
    const bMiniTable = miniTable[b.code];

    // 1) Best record in head-to-head games
    const aPercentage = getPercentage(aMiniTable);
    const bPercentage = getPercentage(bMiniTable);

    // both have played, rank by percentage if they differ
    if (aPercentage !== undefined && bPercentage !== undefined) {
      if (aPercentage !== bPercentage) {
        return bPercentage - aPercentage;
      }

      // however if more than 2 teams are tied, we need to check the H2H in the new subgroup
      if (subGroup.length > 2) {
        const subSubGroup = subGroup.filter((t) => {
          const tMiniCode = miniTable[t.code];
          const tPercentage = getPercentage(tMiniCode);
          return tPercentage === aPercentage;
        });

        // go into recursion only if the new subgroup is smaller
        if (subSubGroup.length < subGroup.length) {
          return compareTeams(a, b, subSubGroup, subGroup);
        }
      }
    } else if (aPercentage === undefined) {
      if (bPercentage > 0.5) {
        return 1; // a has no H2H games, b has positive, so b is better
      }
    } else if (bPercentage === undefined) {
      if (aPercentage > 0.5) {
        return -1; // b has no H2H games, a has positive, so a is better
      }
    }

    // 2) Higher cumulative score difference in h2h
    const aH2HDiff = getH2HDiff(aMiniTable);
    const bH2HDiff = getH2HDiff(bMiniTable);
    if (aH2HDiff !== bH2HDiff) {
      return bH2HDiff - aH2HDiff;
    }

    // 2a) If we came from a previous subgroup, and are still tied,
    // we need to re-apply the previous subgroup to ensure correct order.
    if (previousSubGroup) {
      const aIndexOf = previousSubGroup.findIndex((t) => t.code === a.code);
      const bIndexOf = previousSubGroup.findIndex((t) => t.code === b.code);
      if (aIndexOf !== bIndexOf) {
        return aIndexOf - bIndexOf;
      }
    }

    // 3) Overall points difference
    const aSeasonDiff = a.ptsFor - a.ptsAgainst;
    const bSeasonDiff = b.ptsFor - b.ptsAgainst;
    if (aSeasonDiff !== bSeasonDiff) {
      return bSeasonDiff - aSeasonDiff;
    }

    // 4) Total points scored
    if (a.ptsFor !== b.ptsFor) {
      return b.ptsFor - a.ptsFor;
    }

    // 5) Higher sumOfQuotients
    if (a.sumOfQuotients !== b.sumOfQuotients) {
      return b.sumOfQuotients - a.sumOfQuotients;
    }

    // Still tied
    return 0;
  }

  let tiebreaked = [...sortedGroup];
  tiebreaked.sort((a, b) => compareTeams(a, b, tiebreaked));

  // Because multiple teams might remain fully tied through all steps,
  // we'll do a sub-block detection and re-sort. In practice, re-sorting
  // with the same criteria won't magically separate them if there's
  // truly no difference. We'll just keep them in the order they appear
  // (or you could do random / alphabetical).
  let finalOrder = [];
  let i = 0;
  while (i < tiebreaked.length) {
    let block = [tiebreaked[i]];
    let j = i + 1;
    while (
      j < tiebreaked.length &&
      compareTeams(tiebreaked[j - 1], tiebreaked[j], tiebreaked) === 0 &&
      compareTeams(tiebreaked[j], tiebreaked[j - 1], tiebreaked) === 0
    ) {
      block.push(tiebreaked[j]);
      j++;
    }

    if (block.length === 1) {
      finalOrder.push(block[0]);
    } else {
      block.sort((a, b) => compareTeams(a, b, block));
      finalOrder.push(...block);
    }
    i = j;
  }

  return finalOrder;
}

function getPercentage(miniTableEntry) {
  if (!miniTableEntry) {
    return undefined;
  }
  const totalGames = miniTableEntry.h2hWins + miniTableEntry.h2hLosses;
  return totalGames > 0 ? miniTableEntry.h2hWins / totalGames : undefined;
}

function getH2HDiff(miniTableEntry) {
  if (!miniTableEntry) {
    return 0;
  }
  return miniTableEntry.h2hPointsFor - miniTableEntry.h2hPointsAgainst;
}

export function createStandings(teams) {
  // -----------------------------
  // 4) Convert teams object to array
  // -----------------------------
  let teamArray = Object.values(teams);

  // -----------------------------
  // 5) Tie-Break function
  // -----------------------------
  // Use exported function to apply tie-break rules

  // -----------------------------
  // 6) Sort by W (desc), then tie-break
  // -----------------------------
  teamArray.sort((a, b) => b.wins / b.losses - a.wins / a.losses);

  let finalStandings = [];
  let idx = 0;
  while (idx < teamArray.length) {
    let block = [teamArray[idx]];
    let j = idx + 1;
    while (
      j < teamArray.length &&
      teamArray[j].wins === teamArray[idx].wins &&
      teamArray[j].losses === teamArray[idx].losses
    ) {
      block.push(teamArray[j]);
      j++;
    }
    if (block.length > 1) {
      const tieBroken = applyTieBreak(teams, block);
      finalStandings.push(...tieBroken);
    } else {
      finalStandings.push(block[0]);
    }
    idx = j;
  }

  // ---------------------------------
  // 7) Build display fields (H2H, etc)
  // ---------------------------------
  finalStandings.forEach((team) => {
    let h2hWins = 0,
      h2hLosses = 0,
      h2hPointsFor = 0,
      h2hPointsAgainst = 0;
    Object.keys(team.h2h).forEach((oppCode) => {
      const opp = finalStandings.find((t) => t.code === oppCode);
      if (opp.wins == team.wins && opp.losses == team.losses) {
        h2hWins += team.h2h[oppCode].wins;
        h2hLosses += team.h2h[oppCode].losses;
        h2hPointsFor += team.h2h[oppCode].ptsFor;
        h2hPointsAgainst += team.h2h[oppCode].ptsAgainst;
      }
    });
    team.h2hWins = h2hWins;
    team.h2hLosses = h2hLosses;
    team.h2hScoreDiff = h2hPointsFor - h2hPointsAgainst;
    team.scoreDiff = team.ptsFor - team.ptsAgainst;
  });

  return { standings: finalStandings, teams: teamArray };
}
