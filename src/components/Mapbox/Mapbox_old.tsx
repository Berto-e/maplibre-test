import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { mapPoint } from "./MapPoint.types";
import pointsData from "./points.json";
import { useMapContext } from "../../contexts/MapContext";
import { memo } from "react";
type MapBoxProps = {
  onPointClick?: (properties: any) => void;
};

const MapBox = ({ onPointClick }: MapBoxProps) => {
  /*----Functions---*/
  const extract_points_from_json = (): mapPoint[] => {
    return pointsData as mapPoint[];
  };

  const { filters } = useMapContext();

  /* --------- Map Initialization --------- */
  const mapContainer = useRef(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const points = extract_points_from_json();

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style:
        "https://api.maptiler.com/maps/openstreetmap/style.json?key=W8q1pSL8KdnaMEh4wtdB",
      center: [-1.1307, 37.987], // Centro de Murcia
      zoom: 8,
    });

    mapRef.current = map;

    // map.addControl(new maplibregl.FullscreenControl());

    map.on("load", () => {
      map.addSource("points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: points.map((p) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [p.gps[0], p.gps[1]], // long , lat
            },
            properties: {
              serialNumber: p.serialNumber,
              station: p.station,
              installationDate: p.installationDate,
              brand: p.brand,
              model: p.model,
              status: p.status,
              // Número aleatorio entre 1 y 90
              randomNumber: Math.floor(Math.random() * 90) + 1,
            },
          })),
        },
      });

      // Capa para puntos GREEN
      map.addLayer({
        id: "points_green",
        type: "circle",
        source: "points",
        filter: ["==", ["get", "status"], "green"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            4,
            7.23,
            12,
            9,
            14,
            11,
            16,
            13,
            18,
            15,
            20,
            18,
            22,
          ],
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            0.2,
            6.5,
            0.4,
            7.23,
            1,
            18,
            1,
          ],
          "circle-color": "#289178", // Verde
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            1,
            7.23,
            2,
            11,
            2.5,
            15,
            3,
            18,
            3.5,
          ],
        },
      });

      // Capa para puntos RED
      map.addLayer({
        id: "points_red",
        type: "circle",
        source: "points",
        filter: ["==", ["get", "status"], "red"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            4,
            7.23,
            12,
            9,
            14,
            11,
            16,
            13,
            18,
            15,
            20,
            18,
            22,
          ],
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            0.2,
            6.5,
            0.4,
            7.23,
            1,
            18,
            1,
          ],
          "circle-color": "#B4202A", // Rojo
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            1,
            7.23,
            2,
            11,
            2.5,
            15,
            3,
            18,
            3.5,
          ],
        },
      });

      // Capa para puntos YELLOW
      map.addLayer({
        id: "points_yellow",
        type: "circle",
        source: "points",
        filter: ["==", ["get", "status"], "yellow"],
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            4,
            7.23,
            12,
            9,
            14,
            11,
            16,
            13,
            18,
            15,
            20,
            18,
            22,
          ],
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            0.2,
            6.5,
            0.4,
            7.23,
            1,
            18,
            1,
          ],
          "circle-color": "#C67605", // Amarillo
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            1,
            7.23,
            2,
            11,
            2.5,
            15,
            3,
            18,
            3.5,
          ],
        },
      });

      // Capa de números para puntos GREEN
      map.addLayer({
        id: "numbers_green",
        type: "symbol",
        source: "points",
        filter: ["==", ["get", "status"], "green"],
        layout: {
          "text-field": ["get", "randomNumber"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            6,
            7.23,
            10,
            9,
            11,
            11,
            12,
            13,
            14,
            15,
            16,
            18,
            18,
          ],
          "text-anchor": "center",
          "text-justify": "center",
        },
        paint: {
          "text-color": "#ffffff",
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            0.2,
            6.5,
            0.4,
            7.23,
            1,
            18,
            1,
          ],
        },
      });

      // Capa de números para puntos RED
      map.addLayer({
        id: "numbers_red",
        type: "symbol",
        source: "points",
        filter: ["==", ["get", "status"], "red"],
        layout: {
          "text-field": ["get", "randomNumber"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            6,
            7.23,
            10,
            9,
            11,
            11,
            12,
            13,
            14,
            15,
            16,
            18,
            18,
          ],
          "text-anchor": "center",
          "text-justify": "center",
        },
        paint: {
          "text-color": "#ffffff", // Blanco para mejor contraste con rojo
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            0.2,
            6.5,
            0.4,
            7.23,
            1,
            18,
            1,
          ],
        },
      });

      // Capa de números para puntos YELLOW
      map.addLayer({
        id: "numbers_yellow",
        type: "symbol",
        source: "points",
        filter: ["==", ["get", "status"], "yellow"],
        layout: {
          "text-field": ["get", "randomNumber"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            6,
            7.23,
            10,
            9,
            11,
            11,
            12,
            13,
            14,
            15,
            16,
            18,
            18,
          ],
          "text-anchor": "center",
          "text-justify": "center",
        },
        paint: {
          "text-color": "#ffffff",
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            0.2,
            6.5,
            0.4,
            7.23,
            1,
            18,
            1,
          ],
        },
      });

      // Eventos del mouse para todas las capas de puntos
      const pointLayers = ["points_green", "points_red", "points_yellow"];

      pointLayers.forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });

        // Al hacer click, buscar el punto original y pasar todas las propiedades (incluyendo gps)
        map.on("click", layerId, (e) => {
          const feature = e.features![0];
          const properties = feature.properties;
          // Buscar el punto original por serialNumber
          const originalPoint = points.find(
            (p) => p.serialNumber === properties.serialNumber
          );
          if (onPointClick && originalPoint) {
            onPointClick(originalPoint);
          }
        });
      });
    });

    return () => map.remove();
  }, [onPointClick]);

  // UseEffect para manejar los filtros
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Actualizar visibilidad de capas según filtros
    map.setLayoutProperty(
      "points_green",
      "visibility",
      filters.green ? "visible" : "none"
    );
    map.setLayoutProperty(
      "numbers_green",
      "visibility",
      filters.green ? "visible" : "none"
    );

    map.setLayoutProperty(
      "points_red",
      "visibility",
      filters.red ? "visible" : "none"
    );
    map.setLayoutProperty(
      "numbers_red",
      "visibility",
      filters.red ? "visible" : "none"
    );

    map.setLayoutProperty(
      "points_yellow",
      "visibility",
      filters.yellow ? "visible" : "none"
    );
    map.setLayoutProperty(
      "numbers_yellow",
      "visibility",
      filters.yellow ? "visible" : "none"
    );
  }, [filters]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      <div
        id="mapbox-search"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 2,

          pointerEvents: "auto",
        }}
      >
        <input
          id="search-input"
          type="text"
          placeholder="Buscar por estación..."
          style={{
            fontFamily: "Outfit, sans-serif",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #DDDDDD",
            width: "250px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            background: "#fff",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const searchTerm = (e.target as HTMLInputElement).value;
              // Logioa de búsqueda
              console.log("Buscar:", searchTerm);
            }
          }}
        />
      </div>
    </div>
  );
};

export default memo(MapBox);
