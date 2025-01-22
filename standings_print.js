import standings from "./standings.js";

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
