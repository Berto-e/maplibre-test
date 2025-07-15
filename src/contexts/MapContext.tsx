// MapContext.tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import type { mapPoint } from "../components/Mapbox/MapPoint.types";
import pointsData from "../components/Mapbox/points.json";

interface filter {
  green: boolean;
  yellow: boolean;
  red: boolean;
}

type MapContextType = {
  mapElements: mapPoint[];
  filters: filter;
  setFilters: React.Dispatch<React.SetStateAction<filter>>;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [mapElements] = useState<mapPoint[]>(pointsData as mapPoint[]);
  const [filters, setFilters] = useState({
    green: true,
    yellow: true,
    red: true,
  });

  return (
    <MapContext.Provider value={{ mapElements, filters, setFilters }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = () => {
  const context = useContext(MapContext);

  if (!context)
    throw new Error("useMapContext debe usarse dentro de <MapProvider>");
  return context;
};
