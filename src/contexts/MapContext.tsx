// MapContext.tsx
import { createContext, useContext, useState, type ReactNode } from "react";

export type MapElement = {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
};

// En MapContext.tsx
const INITIAL_ELEMENTS: MapElement[] = [
  {
    id: "casa-carlos",
    name: "Casa Carlos",
    coordinates: [-6.258388276953902, 36.60512751654313],
  },
  {
    id: "appliedit-office",
    name: "AppliedIt Office",
    coordinates: [-6.201316908618605, 36.613125345472156],
  },
  {
    id: "random-pipe",
    name: "Random Pipe",
    coordinates: [-6.2584, 36.6052],
  },
];

type MapContextType = {
  mapElements: MapElement[];
  addElement: (element: MapElement) => void;
  selectedElement?: MapElement; // Optional, for future use
  setSelectedElement?: (element: MapElement) => void; // Optional, for future use
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [mapElements, setMapElements] =
    useState<MapElement[]>(INITIAL_ELEMENTS);
  const [selectedElement, setSelectedElement] = useState<
    MapElement | undefined
  >(undefined);

  const addElement = (element: MapElement) => {
    setMapElements((prev) => [...prev, element]);
  };

  return (
    <MapContext.Provider
      value={{ mapElements, addElement, selectedElement, setSelectedElement }}
    >
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
