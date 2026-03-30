import { teamCodeToAbbreviation } from "@/utils/utils";
import spriteMap from "@/lib/sprite-map.json";

const SPRITE_URL = "/images/team-logos-sprite.webp";
const { cellSize, cols, codes } = spriteMap;

function getPosition(code) {
  const index = codes.indexOf(code);
  if (index === -1) return null;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: col * cellSize, y: row * cellSize };
}

export const TeamLogo = ({ code, size, className }) => {
  const pos = getPosition(code);
  if (!pos) return null;

  const scale = size / cellSize;

  return (
    <span
      role="img"
      aria-label={teamCodeToAbbreviation(code)}
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundImage: `url(${SPRITE_URL})`,
        backgroundPosition: `-${pos.x * scale}px -${pos.y * scale}px`,
        backgroundSize: `${cols * cellSize * scale}px auto`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
};
