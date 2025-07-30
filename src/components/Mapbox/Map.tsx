////////////////////////////////////////////////////////////////////////////////
// 🗺️ MAP COMPONENT - COMPLETE MAPLIBRE SOLUTION
////////////////////////////////////////////////////////////////////////////////
//
// Description : A complete MapLibre component with points and lines
//               All functionality included in a single component
//
// Features    : • MapLibre map with Dresden points
//               • Automatic center calculation
//               • Line connecting all points
//               • Markers with popups
//               • Navigation controls
//
// Usage       : <Map />
//
// Author      : Alberto Álvarez González
// Last Update : 2025
//
////////////////////////////////////////////////////////////////////////////////

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

////////////////////////////////////////////////////////////////////////////////
// 📌 SECTION: Map Component
////////////////////////////////////////////////////////////////////////////////

const Map: React.FC = () => {
  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Data & Configuration
  ////////////////////////////////////////////////////////////////////////////////

  // Puntos proporcionados (Dresden, Germany)
  const rawPoints: [number, number][] = [
    [12.239069, 51.407269],
    [12.2343294, 51.4091155],
    [12.2343294, 51.4091155],
    [12.241493, 51.4064495],
    [12.241493, 51.4064495],
    [12.2329395, 51.4090961],
    [12.2329395, 51.4090961],
    [12.2343294, 51.4091155],
    [12.2343294, 51.4091155],
  ];

  // Eliminar duplicados manteniendo el orden
  const filteredRawPoints = Array.from(
    new Set(rawPoints.map((p) => p.join(",")))
  ).map((str) => str.split(",").map(Number) as [number, number]);

  // Calcular centro basado en los puntos filtrados
  const centerLng =
    filteredRawPoints.reduce((sum, point) => sum + point[0], 0) /
    filteredRawPoints.length;
  const centerLat =
    filteredRawPoints.reduce((sum, point) => sum + point[1], 0) /
    filteredRawPoints.length;

  const center: [number, number] = [centerLng, centerLat];
  const zoom = 15;

  // MapTiler API Key
  const apiKey = "W8q1pSL8KdnaMEh4wtdB";
  const mapStyle = `https://api.maptiler.com/maps/openstreetmap/style.json?key=${apiKey}`;

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Refs
  ////////////////////////////////////////////////////////////////////////////////

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Map Initialization
  ////////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize MapLibre map
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: center,
      zoom: zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl());

    // Add attribution control
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      "bottom-right"
    );

    // Wait for map to load before adding features
    map.on("load", () => {
      addMarkersAndLines();
    });

    console.log("✅ Map initialized with Dresden points");

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Add Markers and Lines
  ////////////////////////////////////////////////////////////////////////////////

  const addMarkersAndLines = () => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add markers (smaller, no popups since we'll have numbers)
    filteredRawPoints.forEach((point, _) => {
      // Create marker element
      const markerElement = document.createElement("div");
      markerElement.style.width = "12px";
      markerElement.style.height = "12px";
      markerElement.style.borderRadius = "50%";
      markerElement.style.backgroundColor = "#3b82f6";
      markerElement.style.border = "2px solid white";
      markerElement.style.cursor = "pointer";
      markerElement.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      // Create MapLibre marker
      const marker = new maplibregl.Marker({
        element: markerElement,
      })
        .setLngLat([point[0], point[1]])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Add line connecting all points
    const lineSourceId = "connection-line-source";
    const lineLayerId = "connection-line-layer";

    // Add source for the line
    map.addSource(lineSourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: filteredRawPoints,
        },
      },
    });

    // Add layer for the line
    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: lineSourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ef4444",
        "line-width": 3,
      },
    });

    // Add numbered labels for sequence visualization
    const numbersSourceId = "numbers-source";
    const numbersLayerId = "numbers-layer";

    // Create point features with numbers
    const numberFeatures = filteredRawPoints.map((point, index) => ({
      type: "Feature" as const,
      properties: {
        number: (index + 1).toString(),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [point[0], point[1]],
      },
    }));

    // Add source for numbers
    map.addSource(numbersSourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: numberFeatures,
      },
    });

    // Add layer for numbers
    map.addLayer({
      id: numbersLayerId,
      type: "symbol",
      source: numbersSourceId,
      layout: {
        "text-field": ["get", "number"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 14,
        "text-offset": [0, -2],
        "text-anchor": "center",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#ef4444",
        "text-halo-width": 2,
      },
    });

    console.log(
      `✅ Added ${filteredRawPoints.length} numbered markers and connection line`
    );
  };

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Component Render
  ////////////////////////////////////////////////////////////////////////////////

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      />

      {/* Map Info Overlay */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          background: "rgba(255, 255, 255, 0.95)",
          padding: "12px 16px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: "14px",
          color: "#374151",
          maxWidth: "280px",
        }}
      >
        <div style={{ fontWeight: "600", marginBottom: "4px" }}>
          📍 Dresden Points Map
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          <div>
            Centro: [{centerLng.toFixed(6)}, {centerLat.toFixed(6)}]
          </div>
          <div>Zoom: {zoom}</div>
          <div>
            Puntos: {filteredRawPoints.length} únicos de {rawPoints.length}{" "}
            originales
          </div>
          <div
            style={{ marginTop: "4px", fontSize: "11px", fontStyle: "italic" }}
          >
            🔢 Los números muestran la secuencia del recorrido
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
