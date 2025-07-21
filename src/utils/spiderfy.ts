import type { Point } from "./generateRandomPoints";

// Distrubute duplicate points in a circle O(n) -> Time
export const spiderfy = (points: Point[], radius: number = 30): Point[] => {
  if (points.length === 0) return [];
  const spiderfiedPoints: Point[] = [];
  const centerX =
    points.reduce((sum, point) => sum + point.gps[0], 0) / points.length;
  const centerY =
    points.reduce((sum, point) => sum + point.gps[1], 0) / points.length;
  const angleIncrement = (2 * Math.PI) / points.length;
  const radiusIncrement = radius / points.length;
  points.forEach((point, index) => {
    const angle = index * angleIncrement;
    const r = radius + index * radiusIncrement;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    spiderfiedPoints.push({ ...point, gps: [x, y] });
  });
  return spiderfiedPoints;
};

// Aplica un jittering leve a cada punto para evitar solapamientos exactos
export const jitterPoints = (
  points: Point[],
  jitter: number = 0.00001
): Point[] => {
  return points.map((point) => {
    const jitteredGps = point.gps.map((coord) => coord * jitter) as [
      number,
      number
    ];
    return { ...point, gps: jitteredGps };
  });
};

// Calculate points with equal coordinates 0(n) -> Time
export const duplicatedPoints = (points: Point[]): Point[] => {
  let duplicatePointsMap: { [key: string]: Point[] } = {};
  points.forEach((point) => {
    const key = point.gps.join(",");
    if (!duplicatePointsMap[key]) {
      duplicatePointsMap[key] = [];
    }
    duplicatePointsMap[key].push(point);
  });
  return Object.values(duplicatePointsMap)
    .flat()
    .filter((point) => {
      const key = point.gps.join(",");
      return duplicatePointsMap[key].length > 1;
    });
};
