export type Point = {
  serialNumber: number;
  station: string;
  gps: [number, number]; // [long, lat]
  status: "green" | "yellow" | "red";
};

const randomInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};
const STATUS_VALUES = ["green", "red", "yellow"];
const MURCIA_COORDINATES = {
  latMin: 37.5,
  latMax: 38.2,
  lonMin: -1.6,
  lonMax: -0.8,
};
const randomStatus = (): "green" | "yellow" | "red" => {
  const randomIndex = Math.floor(Math.random() * STATUS_VALUES.length);
  return STATUS_VALUES[randomIndex] as "green" | "yellow" | "red";
};
const generateCoordinates = (): [number, number] => {
  const lat = randomInRange(
    MURCIA_COORDINATES.latMin,
    MURCIA_COORDINATES.latMax
  );
  const lon = randomInRange(
    MURCIA_COORDINATES.lonMin,
    MURCIA_COORDINATES.lonMax
  );
  return [parseFloat(lon.toFixed(6)), parseFloat(lat.toFixed(6))]; // limitar decimales
};

export const generateRandomPoints = (numberOfPoints: number): Point[] => {
  const points: Point[] = [];

  for (let i = 0; i < numberOfPoints; ++i) {
    points.push({
      serialNumber: i + 1,
      station: `Station-${i + 1}`,
      gps: generateCoordinates(),
      status: randomStatus(),
    });
  }

  return points;
};
