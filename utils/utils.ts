export const teamCodeToAbbreviation = (teamCode: string) => {
  switch (teamCode) {
    case "BAH":
      return "BKS";

    case "BAS":
      return "BKN";

    case "BCR":
      return "ROM";

    case "BES":
      return "BJK";

    case "BGS":
      return "BUR";

    case "BOU":
      return "JLB";

    case "BUR":
      return "TOF";

    case "CAN":
      return "DGC";

    case "CLU":
      return "UBT";

    case "FRA":
      return "SKY";

    case "IST":
      return "EFS";

    case "JER":
      return "JLM";

    case "JOV":
      return "CJB";

    case "LEM":
      return "MSB";

    case "LJU":
      return "COL";

    case "LKB":
      return "LIE";

    case "MAD":
      return "RBM";

    case "MCO":
      return "ASM";

    case "MIL":
      return "EA7";

    case "MRO":
      return "RMA";

    case "MUN":
      return "BAY";

    case "PAM":
      return "VBC";

    case "PAN":
      return "PAO";

    case "PAO":
      return "PBC";

    case "PRS":
      return "PBB";

    case "RED":
      return "CZV";

    case "RTK":
      return "ROS";

    case "TEL":
      return "MTA";

    case "TNF":
      return "LLT";

    case "TRN":
      return "TRE";

    case "TRT":
      return "DER";

    case "TSO":
      return "SOP";

    case "TTK":
      return "TTA";

    case "ULK":
      return "FBB";

    case "VNC":
      return "URV";

    case "WOL":
      return "WLV";

    default:
      return teamCode;
  }
};
