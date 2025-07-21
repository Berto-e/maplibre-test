export type Point = {
  serialNumber: number;
  station: string;
  gps: [number, number]; // [long, lat]
  status: "green" | "yellow" | "red";
  brand: string;
  model: string;
  installationDate: string;
};

const randomInRange = (min: number, max: number): number => {
  return Math.random() * (max - min + 1) + min;
};
const STATUS_VALUES = ["green", "red", "yellow"];
const BRANDS = ["Siemens", "ABB", "Schneider", "General Electric", "Honeywell"];
const MODELS = [
  "SensorPro",
  "DataLogger",
  "SmartMeter",
  "IoT-Device",
  "Monitor",
];

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

const randomBrand = (): string => {
  const randomIndex = Math.floor(Math.random() * BRANDS.length);
  return BRANDS[randomIndex];
};

const randomModel = (): string => {
  const randomIndex = Math.floor(Math.random() * MODELS.length);
  return MODELS[randomIndex];
};

const randomDate = (): string => {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  const randomTime =
    start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString().split("T")[0];
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
      brand: randomBrand(),
      model: randomModel(),
      installationDate: randomDate(),
    });
  }

  points.push({
    serialNumber: numberOfPoints + 1,
    station: "Station-duplicated-1",
    status: "green",
    gps: [-1.1309, 37.9854],
    brand: randomBrand(),
    model: randomModel(),
    installationDate: randomDate(),
  });

  points.push({
    serialNumber: numberOfPoints + 2,
    station: "Station-duplicated-2",
    status: "yellow",
    gps: [-1.1309, 37.9854],
    brand: randomBrand(),
    model: randomModel(),
    installationDate: randomDate(),
  });

  return points;
};
