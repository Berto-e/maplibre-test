import rawPoints from "../data/processed_points.json";
import { useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
type tPoint = {
  longitude: number;
  latitude: number;
  id: number;
  gnss?: number;
  timestamp: string;
  macs?: string;
  coordinates: [number, number];
};

const CarlosMockup = () => {
  const points = rawPoints as unknown as Record<string, { points: tPoint[] }>;

  //Calculate the center of the map
  const center: [number, number] = useMemo(() => {
    const all = Object.values(points).flatMap((g) => g.points);
    if (!all || all.length === 0) return [-100, 40];
    const [sumX, sumY] = all.reduce(
      (acc, p) => [acc[0] + p.coordinates[0], acc[1] + p.coordinates[1]],
      [0, 0]
    );
    return [sumX / all.length, sumY / all.length];
  }, [points]);

  // Map Declaration
  const map = new maplibregl.Map({
    container: "map",
    style:
      "https://api.maptiler.com/maps/streets-v2/style.json?key=KMC7VKVlp4EAdHRSdNZP",
    center: center,
    zoom: 6,
  });

  return <div id="map"></div>;
};
export default CarlosMockup;
