export const teamCodeToAbbreviation = (teamCode: string) => {
  switch (teamCode) {
    case "BAS":
      return "BKN";

    case "BAH":
      return "BKS";

    case "BES":
      return "BJK";

    case "BOU":
      return "JLB";
    
    case "CAN":
      return "DGC";

    case "CLU":
      return "UBT";

    case "IST":
      return "EFS";

    case "JER":
      return "JLM";

    case "JOV":
      return "CJB";

    case "LKB":
      return "LIE";
    
    case "LJU":
      return "COL";

    case "MAD":
      return "RBM";

    case "MCO":
      return "ASM";

    case "MIL":
      return "EA7";

    case "MUN":
      return "BAY";

    case "PAM":
      return "VBC";

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
    
    case "TRN":
      return "TRE";
    
    case "TSO":
      return "SOP";
    
    case "TTK":
      return "TTA";
    
    case "VNC":
      return "URV";

    case "WOL":
      return "WLV";

    default:
      return teamCode;
  }
};
