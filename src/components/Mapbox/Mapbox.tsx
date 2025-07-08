////////////////////////////////////////////////////////////////////////////////
// 🗺️ MAPBOX  COMPONENT - MAPLIBRE REACT INTEGRATION
////////////////////////////////////////////////////////////////////////////////
//
// Description : A flexible MapLibre-based React component supporting both static
//               and interactive map modes with customizable point rendering
//
// Features    : • Static map mode with single marker display
//               • Interactive map with multi-status point layers
//               • Zoom-responsive point sizing and number overlays
//               • Filter integration for layer visibility control
//               • Built-in search functionality for interactive maps
//               • Memoized for performance optimization
//
// Usage       : <MapBox
//                 staticMap={false}
//                 mapPoints={pointsArray}
//                 onPointClick={handlePointClick}
//                 center={[longitude, latitude]}
//                 initialZoom={12}
//               />
//
// Dependencies: • maplibre-gl (map rendering engine)
//               • React (hooks: useEffect, useRef, memo)
//               • MapContext (filter state management)
//
// Author      : Alberto Álvarez González
// Last Update : 2025
//
////////////////////////////////////////////////////////////////////////////////

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { mapPoint } from "./MapPoint.types";
import { useMapContext } from "../../contexts/MapContext";
import { memo } from "react";

////////////////////////////////////////////////////////////////////////////////
// 📌 SECTION: Component Types & Props
////////////////////////////////////////////////////////////////////////////////

type MapBoxProps = {
  onPointClick?: (properties: any) => void;
  mapPoints: mapPoint[];
  initialZoom?: number;
  flyToPoint?: (point: mapPoint) => void;
  staticMap: boolean;
  center?: [number, number];
};

////////////////////////////////////////////////////////////////////////////////
// 📌 SECTION: MapBox Component
////////////////////////////////////////////////////////////////////////////////

const MapBox = ({
  onPointClick,
  mapPoints,
  initialZoom,
  staticMap,
  center,
}: MapBoxProps) => {
  const { filters } = useMapContext();

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: State & Refs
  ////////////////////////////////////////////////////////////////////////////////

  // Refs for map container and map instance
  const mapContainer = useRef(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const points = mapPoints || [];
  //  search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<mapPoint[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Search bar Utilities
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: handleChange                                                  */
  /* -------------------------------------------------------------------------- */
  // Description : Handles input change and filters results in real-time
  // Parameters  :
  //    - event: React.ChangeEvent<HTMLInputElement> → Input change event

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    setHighlightedIndex(-1);

    if (value.trim() === "") {
      setResults([]);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      const filteredResults = points.filter((point) =>
        point.station.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filteredResults);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: handleSearch                                                  */
  /* -------------------------------------------------------------------------- */
  // Description : Executes search and flies to the first matching result
  // Parameters  : none (uses searchTerm state)
  // Returns     : void (triggers map flyTo animation)
  // Usage       : Called when Enter key is pressed or search is triggered
  // Notes       : Clears search UI and focuses on first result with enhanced zoom

  const handleSearch = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !searchTerm.trim()) return;

    // ─── 1️⃣ Filter points based on search term ─────────────────────────────
    const filteredResults = points.filter((point) =>
      point.station.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredResults.length > 0) {
      const firstResult = filteredResults[0];

      // ─── 2️⃣ Fly to the first result with smooth animation ──────────────────
      map.flyTo({
        center: [firstResult.gps[0], firstResult.gps[1]],
        bearing: 0,
        zoom: (initialZoom || 12) + 3,
        speed: 0.5, // Smooth flying speed
        curve: 1, // Animation curve
        essential: true,
      });

      // ─── 3️⃣ Clear search UI after successful search ────────────────────────
      clearSearch();

      // ─── 4️⃣ Trigger point click callback if available ──────────────────────
      if (onPointClick) {
        onPointClick(firstResult);
      }
    }
  };

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: handleKeyDown                                                 */
  /* -------------------------------------------------------------------------- */
  // Description : Handles keyboard navigation for search input and results
  // Parameters  :
  //    - event: React.KeyboardEvent<HTMLInputElement> → Keyboard event
  // Returns     : void (updates state and triggers actions)
  // Usage       : Called on keyDown events in search input
  // Notes       : Supports Enter (search), Escape (clear), Arrow keys (navigate)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        // Use highlighted result
        handleResultClick(results[highlightedIndex]);
      } else {
        // Use search term
        handleSearch();
      }
    }

    if (event.key === "Escape") {
      clearSearch();
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : prev
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    }
  };

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: handleResultClick                                             */
  /* -------------------------------------------------------------------------- */
  // Description : Handles clicking on a search result item
  // Parameters  :
  //    - point: mapPoint → The selected map point
  // Returns     : void (triggers map animation and callbacks)
  // Usage       : Called when user clicks on search result
  // Notes       : Flies to point, clears search, and triggers point click callback

  const handleResultClick = (point: mapPoint) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // ─── 1️⃣ Fly to selected point ───────────────────────────────────────────
    map.flyTo({
      center: [point.gps[0], point.gps[1]],
      bearing: 0,
      zoom: (initialZoom || 12) + 3,
      speed: 0.5,
      curve: 1,
      essential: true,
    });

    // ─── 2️⃣ Clear search UI ─────────────────────────────────────────────────
    clearSearch();
  };

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: clearSearch                                                   */
  /* -------------------------------------------------------------------------- */
  // Description : Clears all search-related state
  // Parameters  : none
  // Returns     : void (resets search state)
  // Usage       : Called when clearing search or after successful selection
  // Notes       : Resets search term, results, and highlighted index

  const clearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setIsSearching(false);
    setHighlightedIndex(-1);
  };

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Static Map Utilities
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: createStaticMap                                               */
  /* -------------------------------------------------------------------------- */
  // Description : Creates a non-interactive static map with a single marker
  // Parameters  :
  //    - Uses component props: center, initialZoom, points
  // Returns     : void (modifies mapRef.current)
  // Usage       : Called when staticMap prop is true

  const createStaticMap = () => {
    // ─── 1️⃣ Validation: Ensure points exist ─────────────────────────────────
    if (!points.length) return;

    // ─── 2️⃣ Determine map center coordinates ─────────────────────────────────
    const firstPoint = points[0];
    // Use center if available, otherwise use the first point
    const mapCenter = center || [firstPoint.gps[0], firstPoint.gps[1]];

    // ─── 3️⃣ Initialize static map instance ──────────────────────────────────
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style:
        "https://api.maptiler.com/maps/streets/style.json?key=W8q1pSL8KdnaMEh4wtdB",
      center: mapCenter,
      zoom: initialZoom || 15,
      interactive: false, // Disable user interactions
      attributionControl: false, // Hide attribution controls
    });

    mapRef.current = map;

    // ─── 4️⃣ Add location marker ─────────────────────────────────────────────
    new maplibregl.Marker({
      color: "var(--primary-blue)",
    })
      .setLngLat(mapCenter)
      .addTo(map);
  };

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Interactive Map Layer Management
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: addPointLayers                                               */
  /* -------------------------------------------------------------------------- */
  // Description : Adds colored circle layers for different point statuses
  // Parameters  :
  //    - map: maplibregl.Map → The map instance to add layers to
  // Returns     : void (modifies map by adding layers)
  // Usage       : addPointLayers(mapInstance)
  // Notes       : Creates 3 layers: green, red, yellow with status-based filtering

  const addPointLayers = (map: maplibregl.Map) => {
    // ─── 1️⃣ Layer: GREEN status points ──────────────────────────────────────
    map.addLayer({
      id: "points_green",
      type: "circle",
      source: "points",
      filter: ["==", ["get", "status"], "green"],
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          // Zoom levels to make zooming more gradual
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
        "circle-color": "#289178", // Green color
        "circle-stroke-color": "#ffffff", // White border
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

    // ─── 2️⃣ Layer: RED status points ────────────────────────────────────────
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
        "circle-color": "#B4202A", // Red color
        "circle-stroke-color": "#ffffff", // White border
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

    // ─── 3️⃣ Layer: YELLOW status points ─────────────────────────────────────
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
        "circle-color": "#C67605", // Yellow/Orange color
        "circle-stroke-color": "#ffffff", // White border
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
  };

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: addNumberLayers                                              */
  /* -------------------------------------------------------------------------- */
  // Description : Adds text symbol layers displaying numbers on map points
  // Parameters  :
  //    - map: maplibregl.Map → The map instance to add text layers to
  // Returns     : void (modifies map by adding text symbol layers)
  // Usage       : addNumberLayers(mapInstance)
  // Notes       : Numbers are displayed with zoom-responsive sizing and opacity

  const addNumberLayers = (map: maplibregl.Map) => {
    // ─── 1️⃣ Number layer: GREEN points ──────────────────────────────────────
    map.addLayer({
      id: "numbers_green",
      type: "symbol",
      source: "points",
      filter: ["==", ["get", "status"], "green"],
      layout: {
        "text-field": ["get", "randomNumber"], // Display random number property
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
        "text-color": "#ffffff", // White text for visibility
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

    // ─── 2️⃣ Number layer: RED points ────────────────────────────────────────
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
        "text-color": "#ffffff", // White for better contrast with red background
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

    // ─── 3️⃣ Number layer: YELLOW points ─────────────────────────────────────
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
        "text-color": "#ffffff", // White text for visibility
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
  };

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: addMapEvents                                                  */
  /* -------------------------------------------------------------------------- */
  // Description : Adds mouse event listeners to interactive map point layers
  // Parameters  :
  //    - map: maplibregl.Map → The map instance to add event listeners to
  // Returns     : void (modifies map by adding event listeners)
  // Usage       : addMapEvents(mapInstance)
  // Notes       : Handles cursor change on hover and click events for point selection

  const addMapEvents = (map: maplibregl.Map) => {
    // ─── 1️⃣ Define interactive layer IDs ────────────────────────────────────
    const pointLayers = ["points_green", "points_red", "points_yellow"];

    pointLayers.forEach((layerId) => {
      // ─── 2️⃣ Mouse enter event: Change cursor to pointer ───────────────────
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      // ─── 3️⃣ Mouse leave event: Reset cursor ───────────────────────────────
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });

      // ─── 4️⃣ Click event: Handle point selection ───────────────────────────
      map.on("click", layerId, (e: any) => {
        const feature = e.features![0];
        const properties = feature.properties;

        // Find the original point by serialNumber to get complete data
        const originalPoint = points.find(
          (p: mapPoint) => p.serialNumber === properties.serialNumber
        );

        if (onPointClick && originalPoint) {
          onPointClick(originalPoint);
        }
      });
    });
  };

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Interactive Map Creation
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: createInteractiveMap                                          */
  /* -------------------------------------------------------------------------- */
  // Description : Creates a fully interactive map with all data sources and layers
  // Parameters  :
  //    - Uses component props: points, onPointClick, initialZoom
  // Returns     : void (modifies mapRef.current and initializes map)
  // Usage       : Called when staticMap prop is false
  // Notes       : Includes point layers, number overlays, and interaction events

  const createInteractiveMap = () => {
    // ─── 1️⃣ Initialize interactive map instance ─────────────────────────────
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style:
        "https://api.maptiler.com/maps/openstreetmap/style.json?key=W8q1pSL8KdnaMEh4wtdB",
      center: [-1.1307, 37.987], // Center of Murcia, Spain
      zoom: initialZoom || 12, // Default zoom level
    });

    mapRef.current = map;

    // ─── 2️⃣ Setup map data and layers after load ───────────────────────────
    map.on("load", () => {
      // Add GeoJSON source with all map points
      map.addSource("points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: points.map((p: mapPoint) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [p.gps[0], p.gps[1]], // [longitude, latitude]
            },
            properties: {
              serialNumber: p.serialNumber,
              station: p.station,
              installationDate: p.installationDate,
              brand: p.brand,
              model: p.model,
              status: p.status,
              // Generate random number for display (1-90)
              randomNumber: Math.floor(Math.random() * 90) + 1,
            },
          })),
        },
      });

      // ─── 3️⃣ Add all map layers and interactions ─────────────────────────
      addPointLayers(map);
      addNumberLayers(map);
      addMapEvents(map);
    });
  };

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: React Effects & Lifecycle
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 EFFECT: Map Initialization                                              */
  /* -------------------------------------------------------------------------- */
  // Description : Initializes the map based on staticMap prop and cleans up on unmount
  // Dependencies: staticMap, points, onPointClick, center, initialZoom
  // Purpose     : Creates static or interactive map and handles cleanup
  // Notes       : Recreates map when any dependency changes

  useEffect(() => {
    if (staticMap) {
      createStaticMap();
    } else {
      createInteractiveMap();
    }

    // Cleanup function to remove map instance
    return () => mapRef.current?.remove();
  }, [staticMap, points, onPointClick, center, initialZoom]);

  /* -------------------------------------------------------------------------- */
  /* 📍 EFFECT: Filter Management                                               */
  /* -------------------------------------------------------------------------- */
  // Description : Applies visibility filters to map layers based on filter state
  // Dependencies: filters, staticMap
  // Purpose     : Shows/hides point layers based on user filter selections
  // Notes       : Only applies to interactive maps, static maps ignore filters

  useEffect(() => {
    // Skip filter application for static maps
    if (staticMap) return;

    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // ─── 1️⃣ Apply GREEN filter ──────────────────────────────────────────────
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

    // ─── 2️⃣ Apply RED filter ────────────────────────────────────────────────
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

    // ─── 3️⃣ Apply YELLOW filter ─────────────────────────────────────────────
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
  }, [filters, staticMap]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Component Render
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 RENDER: Map Container with Conditional Search                           */
  /* -------------------------------------------------------------------------- */
  // Description : Renders the map container with optional search input overlay
  // Structure   : Main container → Map container → Search overlay (if interactive)
  // Styling     : Full width/height with absolute positioning for search
  // Notes       : Search input only appears on interactive maps

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* ─── 1️⃣ Map Container ─────────────────────────────────────────────── */}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* ─── 2️⃣ Search Overlay (Interactive Maps Only) ─────────────────────── */}
      {!staticMap && (
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
          {/* Search input */}
          <input
            id="search-input"
            type="text"
            placeholder="Search by station..."
            style={{
              fontFamily: "Outfit, sans-serif",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #DDDDDD",
              width: "250px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              background: "#fff",
            }}
            value={searchTerm}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />

          {/* Search results dropdown */}
          {searchTerm && results.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 40,
                left: 0,
                width: "250px",
                background: "#fff",
                border: "1px solid #DDD",
                borderRadius: "4px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
                zIndex: 3,
                maxHeight: "220px",
                overflowY: "auto",
              }}
            >
              {results.map((point, index) => (
                <div
                  key={point.serialNumber}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom:
                      index < results.length - 1 ? "1px solid #F0F0F0" : "none",
                    backgroundColor:
                      index === highlightedIndex ? "#F5F5F5" : "#fff",
                    transition: "background-color 0.2s ease",
                  }}
                  onClick={() => handleResultClick(point)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseLeave={() => setHighlightedIndex(-1)}
                >
                  <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                    {point.station}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "2px",
                    }}
                  >
                    {point.brand} • {point.model}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color:
                        point.status === "green"
                          ? "#289178"
                          : point.status === "red"
                          ? "#B4202A"
                          : "#C67605",
                      marginTop: "2px",
                      fontWeight: "bold",
                    }}
                  >
                    Status: {point.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {searchTerm && isSearching && results.length === 0 && (
            <div
              style={{
                position: "absolute",
                top: 40,
                left: 0,
                width: "250px",
                background: "#fff",
                border: "1px solid #DDD",
                borderRadius: "4px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
                zIndex: 3,
                padding: "16px",
                textAlign: "center",
                color: "#666",
                fontSize: "14px",
              }}
            >
              No stations found for "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(MapBox);
