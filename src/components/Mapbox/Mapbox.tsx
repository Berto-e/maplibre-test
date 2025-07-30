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

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import type { mapPoint } from "./MapPoint.types";
import { useMapContext } from "../../contexts/MapContext";
import { memo } from "react";
import type { Point } from "../../utils/generateRandomPoints";
import PegmanContainer from "../StreetView/PegmanContainer";
import "@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css";
import { MaplibreTerradrawControl } from "@watergis/maplibre-gl-terradraw";
import pointsWithinPolygon from "@turf/points-within-polygon";

// Utility function for debouncing
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

////////////////////////////////////////////////////////////////////////////////
// 📌 SECTION: Component Types & Props
////////////////////////////////////////////////////////////////////////////////

type MapBoxProps = {
  onPointClick?: (properties: any) => void;
  mapPoints: Point[];
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
  const drawRef = useRef<MaplibreTerradrawControl | null>(null);
  const points = mapPoints || [];

  // Search functionality with optimization
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapStyle, setMapStyle] = useState<number>(0);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [pegmanCoordinates, setPegmanCoordinates] = useState<
    [number, number] | null
  >(null);

  // Debounced search term to prevent excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized search results to prevent recalculation
  const filteredResults = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return [];

    return points
      .filter((point: Point) =>
        point.station.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      .slice(0, 50); // Limit results to first 50 for performance
  }, [points, debouncedSearchTerm]);

  // Update results when filtered results change
  useEffect(() => {
    setResults(filteredResults);
    setIsSearching(debouncedSearchTerm.trim() !== "");
    setHighlightedIndex(-1);
  }, [filteredResults, debouncedSearchTerm]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Variables
  ////////////////////////////////////////////////////////////////////////////////

  // Define map styles
  const mapStyles = {
    openSteet: {
      code: "openStreet",
      url: "https://api.maptiler.com/maps/openstreetmap/style.json?key=W8q1pSL8KdnaMEh4wtdB",
      image:
        "https://carto.com/help/images/building-maps/basemaps/positron_labels.png",
    },

    streets: {
      code: "streets",
      url: "https://api.maptiler.com/maps/streets-v2/style.json?key=W8q1pSL8KdnaMEh4wtdB",
      image:
        "https://carto.com/help/images/building-maps/basemaps/voyager_labels.png",
    },
  };

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Search bar Utilities
  ////////////////////////////////////////////////////////////////////////////////

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: handleChange                                                  */
  /* -------------------------------------------------------------------------- */
  // Description : Handles input change with optimized debounced filtering
  // Parameters  :
  //    - event: React.ChangeEvent<HTMLInputElement> → Input change event

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchTerm(value);
      setHighlightedIndex(-1);

      // Clear results immediately when input is empty
      if (value.trim() === "") {
        setResults([]);
        setIsSearching(false);
      }
    },
    []
  );

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: handleSearch                                                  */
  /* -------------------------------------------------------------------------- */
  // Description : Executes search and flies to the first matching result (optimized)
  // Parameters  : none (uses searchTerm state)
  // Returns     : void (triggers map flyTo animation)
  // Usage       : Called when Enter key is pressed or search is triggered
  // Notes       : Uses pre-filtered results for better performance

  const handleSearch = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !searchTerm.trim()) return;

    // Use already filtered results instead of filtering again
    if (filteredResults.length > 0) {
      const firstResult = filteredResults[0];

      // ─── 2️⃣ Fly to the first result with smooth animation ──────────────────
      map.flyTo({
        center: [firstResult.gps[0], firstResult.gps[1]],
        zoom: (initialZoom || 12) + 3,
        speed: 1,
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
  }, [searchTerm, filteredResults, initialZoom, onPointClick]);

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
  // Description : Handles clicking on a search result item (optimized)
  // Parameters  :
  //    - point: mapPoint → The selected map point
  // Returns     : void (triggers map animation and callbacks)
  // Usage       : Called when user clicks on search result
  // Notes       : Flies to point, clears search, and triggers point click callback

  const handleResultClick = useCallback(
    (point: Point) => {
      const map = mapRef.current;

      if (!map || !map.isStyleLoaded()) return;

      // ─── 1️⃣ Fly to selected point ───────────────────────────────────────────
      map.flyTo({
        center: [point.gps[0], point.gps[1]],
        bearing: 0,
        zoom: 15,
        speed: 1,
        curve: 1,
        essential: true,
      });

      // ─── 2️⃣ Clear search UI ─────────────────────────────────────────────────
      clearSearch();
    },
    [initialZoom]
  );

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: clearSearch                                                   */
  /* -------------------------------------------------------------------------- */
  // Description : Clears all search-related state (optimized)
  // Parameters  : none
  // Returns     : void (resets search state)
  // Usage       : Called when clearing search or after successful selection
  // Notes       : Resets search term, results, and highlighted index

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setResults([]);
    setIsSearching(false);
    setHighlightedIndex(-1);
  }, []);

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
      style: mapStyles["openSteet"].url,
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
  // Notes       : Creates 3 layers: green, red (with pulsing animation), yellow

  const addPointLayers = (map: maplibregl.Map) => {
    // ─── 1️⃣ Layer: GREEN status points (circles) ────────────────────────────
    map.addLayer({
      id: "points_green",
      type: "circle",
      source: "points",
      filter: [
        "all",
        ["==", ["get", "status"], "green"],
        ["!", ["has", "point_count"]],
      ],
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

    // ─── 2️⃣ Layer: RED status points (circles) ──────────────────────────────
    map.addLayer({
      id: "points_red",
      type: "circle",
      source: "points",
      filter: [
        "all",
        ["==", ["get", "status"], "red"],
        ["!", ["has", "point_count"]],
      ],
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

    // ─── 3️⃣ Layer: YELLOW status points (circles) ───────────────────────────
    map.addLayer({
      id: "points_yellow",
      type: "circle",
      source: "points",
      filter: [
        "all",
        ["==", ["get", "status"], "yellow"],
        ["!", ["has", "point_count"]],
      ],
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
      filter: [
        "all",
        ["==", ["get", "status"], "green"],
        ["!", ["has", "point_count"]],
      ],
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

    // ─── 2️⃣ Number layer: RED points ────────────────────────────────────────
    map.addLayer({
      id: "numbers_red",
      type: "symbol",
      source: "points",
      filter: [
        "all",
        ["==", ["get", "status"], "red"],
        ["!", ["has", "point_count"]],
      ],
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
      filter: [
        "all",
        ["==", ["get", "status"], "yellow"],
        ["!", ["has", "point_count"]],
      ],
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

  const addMapEvents = useCallback(
    (map: maplibregl.Map) => {
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
            (p: Point) => p.serialNumber === properties.serialNumber
          );

          if (onPointClick && originalPoint) {
            onPointClick(originalPoint);
          }
        });
      });
    },
    [points, onPointClick]
  );

  /* -------------------------------------------------------------------------- */
  /* 📍 FUNCTION: addClusterLayers                                             */
  /* -------------------------------------------------------------------------- */
  // Description : Adds cluster layers for better performance with large datasets
  // Parameters  :
  //    - map: maplibregl.Map → The map instance to add cluster layers to
  // Returns     : void (modifies map by adding cluster layers)
  // Usage       : addClusterLayers(mapInstance)
  // Notes       : Creates clusters for points when zoomed out, individual points when zoomed in

  const addClusterLayers = useCallback((map: maplibregl.Map) => {
    // ─── 1️⃣ Cluster circles layer (only visible at low zoom levels) ───────────
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "points",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#51bbd6", // Color for small clusters
          100,
          "#f1f075", // Color for medium clusters
          750,
          "#f28cb1", // Color for large clusters
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20, // Radius for small clusters
          100,
          30, // Radius for medium clusters
          750,
          40, // Radius for large clusters
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // ─── 2️⃣ Cluster count labels (only visible at low zoom levels) ──────────
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "points",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 14,
      },
      paint: {
        "text-color": "#ffffff",
      },
    });

    // ─── 3️⃣ Cluster click events for zoom ───────────────────────────────────
    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });
      const clusterId = features[0].properties!.cluster_id;
      const source = map.getSource("points") as maplibregl.GeoJSONSource;

      // Use Promise-based approach for getClusterExpansionZoom
      source
        .getClusterExpansionZoom(clusterId)
        .then((zoom: number) => {
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom,
          });
        })
        .catch((err) => {
          console.error("Error getting cluster expansion zoom:", err);
        });
    });

    // ─── 4️⃣ Change cursor on cluster hover ──────────────────────────────────
    map.on("mouseenter", "clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
      map.getCanvas().style.cursor = "";
    });
  }, []);

  // Memoized GeoJSON data to prevent recreation on every render
  const geoJsonData = useMemo(() => {
    // Filter points based on active filters
    const filteredPoints = points.filter((p: Point) => {
      switch (p.status) {
        case "green":
          return filters.green;
        case "red":
          return filters.red;
        case "yellow":
          return filters.yellow;
        default:
          return true;
      }
    });

    return {
      type: "FeatureCollection" as const,
      features: filteredPoints.map((p: Point) => {
        // Create a stable random number based on serialNumber to prevent re-renders
        const stableRandom =
          ((parseInt(p.serialNumber.toString()) || 0) % 90) + 1;

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [p.gps[0], p.gps[1]],
          },
          properties: {
            serialNumber: p.serialNumber,
            station: p.station,
            status: p.status,
            randomNumber: stableRandom,
          },
        };
      }),
    };
  }, [points, filters]);

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

  const createInteractiveMap = useCallback(() => {
    // ─── 1️⃣ Initialize interactive map instance ─────────────────────────────
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: mapStyles["openSteet"].url,
      center: [-1.1307, 37.987], // Center of Murcia, Spain
      zoom: initialZoom || 12, // Default zoom level
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 300,

      attributionControl: false,
    });

    mapRef.current = map;

    /*  ------ Map Controls ----- */
    const draw = new MaplibreTerradrawControl({
      modes: [
        "render",
        "linestring",
        "polygon",
        "rectangle",
        "circle",
        "select",
        "delete-selection",
        "delete",
        "download",
      ],
      open: true,
    });

    drawRef.current = draw;

    // --💥 Map Control to draw polygons --
    map.addControl(draw, "top-right");

    // ─── 2️⃣ Setup map data and layers after load ───────────────────────────
    map.on("load", () => {
      // Add GeoJSON source with all points initially (filtering will be handled separately)
      const allPointsData = {
        type: "FeatureCollection" as const,
        features: points.map((p: Point) => {
          const stableRandom =
            ((parseInt(p.serialNumber.toString()) || 0) % 90) + 1;

          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [p.gps[0], p.gps[1]],
            },
            properties: {
              serialNumber: p.serialNumber,
              station: p.station,
              status: p.status,
              randomNumber: stableRandom,
            },
          };
        }),
      };

      map.addSource("points", {
        type: "geojson",
        data: allPointsData,
        cluster: true,
        clusterMaxZoom: 11, // Max zoom to cluster points on
        clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
      });

      // ─── ✨ Event listeners  ─────────────────
      const drawInstance = draw.getTerraDrawInstance();
      if (drawInstance) {
        drawInstance.on("finish", (id) => {
          console.log("🎯 Polígono completado con ID:", id);

          const snapshot = drawInstance.getSnapshot();
          const drawnFeature = snapshot?.find((feature) => feature.id === id);

          if (drawnFeature && drawnFeature.geometry) {
            console.log("📍 Figura dibujada:", drawnFeature);
            console.log("📊 Tipo de geometría:", drawnFeature.geometry.type);
            console.log("🗺️ Coordenadas:", drawnFeature.geometry.coordinates);

            const polygon = {
              type: "Feature" as const,
              geometry: {
                type: "Polygon" as const,
                coordinates: drawnFeature.geometry.coordinates as number[][][],
              },
              properties: {},
            };

            try {
              // Usar pointsWithinPolygon con los tipos correctos
              const pointsInside = pointsWithinPolygon(geoJsonData, polygon);

              console.log("✅ Análisis completado:");

              console.log(
                "📍 Puntos dentro del polígono:",
                pointsInside.features.length
              );
              console.log(
                "🎯 Detalles de puntos encontrados:",
                pointsInside.features.map((f) => ({
                  station: f.properties.station,
                  status: f.properties.status,
                  serialNumber: f.properties.serialNumber,
                  coordinates: f.geometry.coordinates,
                }))
              );
            } catch (error) {
              console.error("❌ Error al filtrar puntos:", error);

              console.log("🔍 Debug - polygon:", polygon);
            }
          }
        });
      }

      // ─── 3️⃣ Add cluster layers for performance ─────────────────────────
      addClusterLayers(map);
      addPointLayers(map);
      addNumberLayers(map);
      addMapEvents(map);
    });
  }, [points, addClusterLayers, addMapEvents]); // Only depend on points, not geoJsonData

  // Handle style change with transformStyle to preserve custom sources and layers
  const handleStyleChange = useCallback(
    (styleUrl: string, styleIndex: number) => {
      if (mapStyle === styleIndex) return;

      const map = mapRef.current;
      if (!map) return;
      const draw = drawRef.current;

      // Change the style using transformStyle to preserve our custom data
      map.setStyle(styleUrl, {
        transformStyle: (previousStyle, nextStyle) => ({
          ...nextStyle,
          sources: {
            ...nextStyle.sources,
            // Preserve our custom points source if it exists
            ...(previousStyle?.sources?.points && {
              points: previousStyle.sources.points,
            }),
          },
          layers: [
            // Keep all layers from the new style
            ...nextStyle.layers,
            // Add back our custom layers if they existed in the previous style
            ...(previousStyle?.layers || []).filter((layer) =>
              [
                "clusters",
                "cluster-count",
                "points_green",
                "points_red",
                "points_yellow",
                "numbers_green",
                "numbers_red",
                "numbers_yellow",
              ].includes(layer.id)
            ),
          ],
        }),
      });
      draw?.deactivate();

      setMapStyle(styleIndex);
    },
    [mapStyle]
  );

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
    return () => {
      const map = mapRef.current;
      if (map) {
        map.remove();
      }
    };
  }, [staticMap, center, initialZoom]);

  /* -------------------------------------------------------------------------- */
  /* 📍 EFFECT: Filter Management                                               */
  /* -------------------------------------------------------------------------- */
  // Description : Updates map data source based on filter state
  // Dependencies: filters, staticMap, geoJsonData
  // Purpose     : Updates cluster and point data based on user filter selections
  // Notes       : Only applies to interactive maps, updates data source directly

  useEffect(() => {
    // Skip filter application for static maps
    if (staticMap) return;

    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Update the data source with filtered data
    const source = map.getSource("points") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geoJsonData);
    }
  }, [geoJsonData, staticMap]);

  useEffect(() => {
    // Check if pegmanCoordinates is set and open Street View
    if (pegmanCoordinates) {
      // Open Google Street View in a new tab
      const [lng, lat] = pegmanCoordinates;
      const streetViewUrl = `https://www.google.com/maps/@${lat},${lng},3a,75y,90t/data=!3m8!1e1!3m6!1sAF1QipN7wADdLiLn02kTnYKWaL0ZCJNzPmGInfF1JHHb!2e10!3e11!6shttps:%2F%2Flh5.googleusercontent.com%2Fp%2FAF1QipN7wADdLiLn02kTnYKWaL0ZCJNzPmGInfF1JHHb%3Dw203-h100-k-no-pi-2.9338646-ya320.09116-ro-0.7834487-fo100!7i7776!8i3888`;

      // Open in new window/tab
      window.open(streetViewUrl, "_blank");

      // Reset pegman coordinates after opening Street View
      setPegmanCoordinates(null);
    }
  }, [pegmanCoordinates]);

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
        <>
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
                {results.slice(0, 20).map((point, index) => (
                  <div
                    key={point.serialNumber}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderBottom:
                        index < Math.min(results.length, 20) - 1
                          ? "1px solid #F0F0F0"
                          : "none",
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
                {results.length > 20 && (
                  <div
                    style={{
                      padding: "8px 12px",
                      textAlign: "center",
                      fontSize: "12px",
                      color: "#666",
                      fontStyle: "italic",
                      borderTop: "1px solid #F0F0F0",
                    }}
                  >
                    Showing first 20 of {results.length} results
                  </div>
                )}
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
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              width: "70px",
              height: "40px",
              background: "white",
              zIndex: 3,
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
              display: "flex",
              padding: "5px", // aire dentro del contenedor
              gap: "5px", // espacio entre hijos
              boxSizing: "border-box", // para que el padding no rompa el tamaño
            }}
          >
            {/* 🌐 Icono (global) */}
            <div
              style={{
                cursor: "pointer",
                background: mapStyle === 0 ? "#1b8ee057" : "#f1efef63",
                flex: 1,
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
              onClick={() =>
                handleStyleChange(
                  "https://api.maptiler.com/maps/openstreetmap/style.json?key=W8q1pSL8KdnaMEh4wtdB",
                  0
                )
              }
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#444"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "block" }}
              >
                <circle cx="12" cy="12" r="10" />
                <ellipse cx="12" cy="12" rx="4" ry="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            </div>
            {/* 🌍 Icono bola del mundo */}
            <div
              style={{
                cursor: "pointer",
                background: mapStyle === 1 ? "#1b8ee057" : "#f1efef63",
                flex: 1,
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() =>
                handleStyleChange(
                  "https://api.maptiler.com/maps/streets-v2/style.json?key=W8q1pSL8KdnaMEh4wtdB",
                  1
                )
              }
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#444"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "block" }}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12a10 10 0 0 0 20 0" />
                <path d="M12 2a10 10 0 0 0 0 20" />
                <ellipse cx="12" cy="12" rx="6" ry="10" />
              </svg>
            </div>
          </div>
          <PegmanContainer
            mapInstance={mapRef.current}
            onDropOnMap={(coordinates) => {
              setPegmanCoordinates(coordinates);
            }}
          />
        </>
      )}
    </div>
  );
};

export default memo(MapBox, (prevProps, nextProps) => {
  return (
    prevProps.staticMap === nextProps.staticMap &&
    prevProps.initialZoom === nextProps.initialZoom &&
    prevProps.mapPoints.length === nextProps.mapPoints.length &&
    prevProps.onPointClick === nextProps.onPointClick &&
    JSON.stringify(prevProps.center) === JSON.stringify(nextProps.center) &&
    prevProps.mapPoints === nextProps.mapPoints
  );
});
