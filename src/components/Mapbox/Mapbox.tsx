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
//
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
  const [alertSelected, setAlertSelected] = useState(false);

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

        zoom: (initialZoom || 12) + 3,
        speed: map.getZoom() < 12 ? 0.55 : 0.7,
        curve: 1,
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
      speed: map.getZoom() < 12 ? 0.55 : 0.7,
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
  // 📌 SECTION: Dynamic Animation Utilities
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: createPulsingDot                                              */
  /* -------------------------------------------------------------------------- */
  // Description : Creates a pulsing dot animation for red (critical) points
  // Parameters  :
  //    - size: number → Size of the pulsing dot in pixels (default: 100)
  //    - map: maplibregl.Map → Map instance to trigger repaints
  // Returns     : object → Pulsing dot image object for MapLibre
  // Usage       : const pulsingDot = createPulsingDot(100, mapInstance)
  // Notes       : Creates smooth pulsing animation for critical status indicators

  const createPulsingDot = (size: number = 200, map: maplibregl.Map) => {
    return {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
      context: null as CanvasRenderingContext2D | null,

      // ─── 1️⃣ Get rendering context for the map canvas when layer is added ──
      onAdd() {
        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext("2d");
      },

      // ─── 2️⃣ Called once before every frame where the icon will be used ────
      render() {
        const duration = 1000;
        const t = (performance.now() % duration) / duration;

        const radius = (size / 2) * 0.3;
        const outerRadius = (size / 2) * 0.7 * t + radius;
        const context = this.context;

        // Early return if context is not available
        if (!context) return false;

        // ─── 3️⃣ Draw outer pulsing circle ──────────────────────────────────
        context.clearRect(0, 0, this.width, this.height);
        context.beginPath();
        context.arc(
          this.width / 2,
          this.height / 2,
          outerRadius,
          0,
          Math.PI * 2
        );
        context.fillStyle = `rgba(255, 0, 0,${0.3 * (1 - t)})`;
        context.fill();

        // ─── 4️⃣ Draw inner circle with stroke ──────────────────────────────
        context.beginPath();
        context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
        context.fillStyle = "#B4202A";
        context.strokeStyle = "white";
        context.lineWidth = 2 + 4 * (1 - t);
        context.fill();
        context.stroke();

        // ─── 5️⃣ Update image data from canvas ──────────────────────────────
        const imageData = context.getImageData(0, 0, this.width, this.height);
        this.data = new Uint8Array(imageData.data);

        // ─── 6️⃣ Continuously repaint for smooth animation ──────────────────
        map.triggerRepaint();

        // Return true to indicate the image was updated
        return true;
      },
    };
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
  // Notes       : Creates 3 layers: green, red (with pulsing animation), yellow

  const addPointLayers = (map: maplibregl.Map) => {
    // ─── 1️⃣ Add pulsing dot image for red points (larger size) ──────────────
    const pulsingDot = createPulsingDot(350, map);
    map.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });

    // ─── 2️⃣ Layer: GREEN status points (circles) ────────────────────────────
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
        "circle-color": "#289178",
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

    // ─── 3️⃣ Layer: RED status points (initial static circles) ───────────────
    // Note: Will be replaced by useEffect based on alertSelected state
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
        "circle-color": "#B4202A",
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

    // ─── 4️⃣ Layer: YELLOW status points (circles) ───────────────────────────
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
        "circle-color": "#C67605",
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
  };

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: addNumberLayers                                              */
  /* -------------------------------------------------------------------------- */
  // Description : Adds text symbol layers displaying numbers on map points
  // Parameters  :
  //    - map: maplibregl.Map → The map instance to add text layers to
  // Returns     : void (modifies map by adding text symbol layers)
  // Usage       : addNumberLayers(mapInstance)
  // Notes       : Numbers displayed on all point types, including RED pulsing points

  const addNumberLayers = (map: maplibregl.Map) => {
    // ─── 1️⃣ Number layer: GREEN points ──────────────────────────────────────
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

    // ─── 2️⃣ Number layer: RED points (initial static version) ───────────────
    // Note: Will be replaced by useEffect based on alertSelected state
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
    const numberLayers = ["numbers_green", "numbers_red", "numbers_yellow"];
    const allInteractiveLayers = [...pointLayers, ...numberLayers];

    allInteractiveLayers.forEach((layerId) => {
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

    // ─── 2️⃣ Apply RED filter (pulsing dots + numbers) ───────────────────────
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

  /* -------------------------------------------------------------------------- */
  /* 📍 EFFECT: Alert Button Layer Toggle                                       */
  /* -------------------------------------------------------------------------- */
  // Description : Updates red point layers when alertSelected state changes
  // Dependencies: alertSelected, staticMap
  // Purpose     : Switches between static circles and pulsing animation for red points
  // Notes       : Only applies to interactive maps, recreates red point layers

  useEffect(() => {
    // Skip for static maps
    if (staticMap) return;

    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // ─── 1️⃣ Remove existing red point layers ────────────────────────────────
    if (map.getLayer("points_red")) {
      map.removeLayer("points_red");
    }
    if (map.getLayer("numbers_red")) {
      map.removeLayer("numbers_red");
    }

    // ─── 2️⃣ Add red point layer based on alert state ───────────────────────
    if (alertSelected) {
      // Add pulsing red points
      map.addLayer({
        id: "points_red",
        type: "symbol",
        source: "points",
        filter: ["==", ["get", "status"], "red"],
        layout: {
          "icon-image": "pulsing-dot",
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0,
            6,
            0.25,
            7.23,
            0.45,
            9,
            0.5,
            11,
            0.6,
            13,
            0.7,
            15,
            0.8,
            18,
            1.0,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // Add numbers for pulsing red points
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
          "text-allow-overlap": true,
          "text-ignore-placement": true,
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
    } else {
      // Add static red circles
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
          "circle-color": "#B4202A",
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

      // Add numbers for static red circles
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
    }

    // ─── 3️⃣ Re-add event listeners for the new red layers ──────────────────
    const redLayers = ["points_red", "numbers_red"];
    redLayers.forEach((layerId) => {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", layerId, (e: any) => {
        const feature = e.features![0];
        const properties = feature.properties;
        const originalPoint = points.find(
          (p: mapPoint) => p.serialNumber === properties.serialNumber
        );
        if (onPointClick && originalPoint) {
          onPointClick(originalPoint);
        }
      });
    });

    // ─── 4️⃣ Apply current filter state to new layers ───────────────────────
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
  }, [alertSelected, staticMap, filters.red, onPointClick, points]);

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

                      marginTop: "2px",
                      fontWeight: "bold",
                    }}
                  >
                    Status:{" "}
                    <span
                      style={{
                        display: "inline-block",
                        background:
                          point.status === "green"
                            ? "#289178"
                            : point.status === "red"
                            ? "#B4202A"
                            : "#C67605",
                        width: "11px",
                        height: "11px",
                        borderRadius: "50%",
                        verticalAlign: "middle",
                      }}
                    ></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results message  */}
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

      {/* ─── 3️⃣ Alert Button (Interactive Maps Only) ───────────────────────── */}
      <button
        type="button"
        onClick={() => setAlertSelected(!alertSelected)}
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          zIndex: 2,
          pointerEvents: "auto",
          cursor: "pointer",
          padding: 0,
          border: "none",
          background: "none",
        }}
      >
        <div
          style={{
            padding: "3px",
            borderRadius: "4px",
            border: "1px solid #DDDDDD",
            width: "25px",
            height: "25px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            background: alertSelected ? "#cae5fa" : "#fff", // Gris azulado claro cuando seleccionado
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!alertSelected) {
              e.currentTarget.style.background = "#F5F5F5"; // Gris suave en hover
            }
          }}
          onMouseLeave={(e) => {
            if (!alertSelected) {
              e.currentTarget.style.background = "#fff"; // Volver al blanco
            }
          }}
        >
          <span
            role="img"
            aria-label="Alerta"
            style={{
              fontSize: "20px",
              display: "block",
            }}
          >
            🚨
          </span>
        </div>
      </button>
    </div>
  );
};

export default memo(MapBox);
