import { generateEuroleagueStandingsFormXml } from "./standings.js";

fetch("https://api-live.euroleague.net/v1/results")
  .then((response) => response.text())
  .then((text) => generateEuroleagueStandingsFormXml(text))
  .then(({standings, teams}) => {
    console.log("TEAMS");
    teams.forEach((t) => {
      console.log(t);
    });

    console.log("TEAM | W | L | OverallDiff | H2H_W | H2H_L | H2H_Diff");
    standings.forEach((t, index) => {
      console.log(
        `${index + 1}`,
        `${t.name} | ` +
        `${t.wins} | ` +
        `${t.losses} | ` +
        `${t.scoreDiff} | ` +
        `${t.h2hWins} | ` +
        `${t.h2hLosses} | ` +
        `${t.h2hScoreDiff}`
      );
    });
  });


