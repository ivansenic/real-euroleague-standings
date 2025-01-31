export const teamCodeToAbbreviation = (teamCode: string) => {
  switch (teamCode) {
    case "BAS":
      return "BKN";

    case "IST":
      return "EFS";

    case "MAD":
      return "RBM";

    case "MCO":
      return "ASM";

    case "MIL":
      return "EA7";

    case "MUN":
      return "BAY";

    case "PAN":
      return "PAO";

    case "PRS":
      return "PBB";

    case "RED":
      return "CZV";

    case "ULK":
      return "FBB";

    case "TEL":
      return "MTA";

    default:
      return teamCode;
  }
};
