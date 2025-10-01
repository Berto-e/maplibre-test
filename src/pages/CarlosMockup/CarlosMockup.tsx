////////////////////////////////////////////////////////////////////////////////
// 🗺️ CARLOS MOCKUP COMPONENT - OPTIMIZED MAPLIBRE WITH CLUSTERING
////////////////////////////////////////////////////////////////////////////////
//
// Description : Optimized MapLibre component for displaying Carlos route data
//               with clustering for better performance with large datasets
//
// Features    : • Clustering for performance optimization
//               • Zoom-responsive point sizing
//               • Filtered data (removes duplicates and invalid coordinates)
//               • Navigation controls
//               • Memory optimized with useMemo and useCallback
//
// Author      : Alberto Álvarez González
// Last Update : 2025
//
////////////////////////////////////////////////////////////////////////////////

import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import rawPoints from "../../utils/carlos.json";

type tPoint = {
  "Entity Name": string | null;
  longitude: number | null;
  latitude: number | null;
  "GNSS accuracy": string | null;
};

////////////////////////////////////////////////////////////////////////////////
// 📌 SECTION: Component Definition
////////////////////////////////////////////////////////////////////////////////

const CarlosMockup = () => {
  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: State Management
  ////////////////////////////////////////////////////////////////////////////////

  // Filter state for tag selection
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [gnssGreaterThanZeroFilter, setGnssGreaterThanZeroFilter] =
    useState<boolean>(false);
  const [gnssNotNullFilter, setGnssNotNullFilter] = useState<boolean>(false);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Data Processing & State
  ////////////////////////////////////////////////////////////////////////////////

  // Open Street View function
  const openStreetView = (lat: number, long: number) => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${long}&heading=HEADING&pitch=PITCH&fov=FOV
`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Process and filter raw points data
  const processedPoints = useMemo(() => {
    console.log("🔍 === DATA PROCESSING DEBUG START ===");
    console.log("📊 Raw points count:", rawPoints.length);

    // Sample some raw GNSS values for debugging
    const sampleRawGnss = rawPoints.slice(0, 10).map((p) => ({
      gnss: p["GNSS accuracy"],
      type: typeof p["GNSS accuracy"],
      isNull: p["GNSS accuracy"] === null,
      isEmpty: p["GNSS accuracy"] === "",
      value: p["GNSS accuracy"],
    }));
    console.log("📡 Sample raw GNSS values:", sampleRawGnss);

    // Convert objects to arrays and filter out invalid points
    const validPoints = (rawPoints as tPoint[])
      .filter((p) => p.longitude !== 0 && p.latitude !== 0)
      .map((p, index) => ({
        id: index,
        coordinates: [p.longitude, p.latitude] as [number, number],
        longitude: p.longitude,
        latitude: p.latitude,

        gnss: p["GNSS accuracy"],
        tag: p["Entity Name"],
      }));

    console.log(
      "📊 Valid points count (after coordinate filter):",
      validPoints.length
    );

    // Remove duplicates based on coordinates
    // const uniquePoints = validPoints.filter(
    //   (point, index, self) =>
    //     self.findIndex(
    //       (p) =>
    //         p.coordinates[0] === point.coordinates[0] &&
    //         p.coordinates[1] === point.coordinates[1]
    //     ) === index
    // );

    // console.log(
    //   "📊 Unique points count (after duplicate removal):",
    //   uniquePoints.length
    // );

    // Sample processed GNSS values
    const sampleProcessedGnss = validPoints.slice(0, 10).map((p) => ({
      gnss: p.gnss,
      type: typeof p.gnss,
      isNull: p.gnss === null,
      isEmpty: p.gnss === "",
      numberValue: Number(p.gnss),
      isGreaterThanZero: Number(p.gnss) > 0,
    }));
    console.log("📡 Sample processed GNSS values:", sampleProcessedGnss);
    console.log("🔍 === DATA PROCESSING DEBUG END ===");

    return validPoints;
  }, []);

  // Get unique Entity Name tags from rawPoints (as tPoint)
  const uniqueTags = useMemo(() => {
    const seen = new Set<string>();
    return (rawPoints as tPoint[])
      .map((p) => p["Entity Name"])
      .filter(
        (tag): tag is string => !!tag && !seen.has(tag) && !!seen.add(tag)
      );
  }, []);

  // Calculate center based on filtered points
  const center: [number, number] = useMemo(() => {
    if (processedPoints.length === 0) return [0, 0];
    const centerLng =
      processedPoints.reduce((sum, point) => sum + point.coordinates[0], 0) /
      processedPoints.length;
    const centerLat =
      processedPoints.reduce((sum, point) => sum + point.coordinates[1], 0) /
      processedPoints.length;
    return [centerLng, centerLat];
  }, [processedPoints]);

  // Create GeoJSON data for MapLibre
  const geoJsonData = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: processedPoints.map((point) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: point.coordinates,
        },
        properties: {
          id: point.id,
          pointNumber: point.id + 1, // For display numbering
          tag: point.tag, // Entity Name for filtering
          gnss: point.gnss, // GNSS accuracy
        },
      })),
    };
  }, [processedPoints]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Map Configuration
  ////////////////////////////////////////////////////////////////////////////////

  const zoom = 6;
  const apiKey = "W8q1pSL8KdnaMEh4wtdB";
  const mapStyle = `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`;

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Refs
  ////////////////////////////////////////////////////////////////////////////////

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Map Layer Functions
  ////////////////////////////////////////////////////////////////////////////////

  // Add cluster layers (based on Mapbox.tsx logic)
  const addClusterLayers = useCallback((map: maplibregl.Map) => {
    // Cluster circles layer
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "carlos-points",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#3b82f6", // Blue for small clusters
          100,
          "#f59e0b", // Amber for medium clusters
          750,
          "#ef4444", // Red for large clusters
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20, // Small clusters
          100,
          30, // Medium clusters
          750,
          40, // Large clusters
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Cluster count labels
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "carlos-points",
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

    // Cluster click events for zoom
    map.on("click", "clusters", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });
      const clusterId = features[0].properties!.cluster_id;
      const source = map.getSource("carlos-points") as maplibregl.GeoJSONSource;

      source
        .getClusterExpansionZoom(clusterId)
        .then((zoom: number) => {
          const coordinates = (features[0].geometry as GeoJSON.Point)
            .coordinates as [number, number];
          map.easeTo({
            center: coordinates,
            zoom: zoom,
          });
        })
        .catch((err) => {
          console.error("Error getting cluster expansion zoom:", err);
        });
    });

    // Individual point click events for popup
    map.on("click", "carlos-individual-points", (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["carlos-individual-points"],
      });

      if (features.length > 0) {
        const feature = features[0];
        const coordinates = (
          feature.geometry as GeoJSON.Point
        ).coordinates.slice() as [number, number];
        const properties = feature.properties;

        // Create popup with coordinates
        new maplibregl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `
            <div style="max-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                📍 Point ${properties?.pointNumber || properties?.id || "N/A"}
              </h3>
              <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
                <div><strong>Longitude:</strong> ${coordinates[0].toFixed(
                  6
                )}</div>
                <div><strong>Latitude:</strong> ${coordinates[1].toFixed(
                  6
                )}</div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <button
                    id="streetview-btn"
                    style="
                      background: #3b82f6;
                      color: white;
                      border: none;
                      padding: 6px 12px;
                      border-radius: 4px;
                      font-size: 11px;
                      cursor: pointer;
                      width: 100%;
                    "
                  >
                    🗺️ View in Street View
                  </button>
                </div>
              </div>
            </div>
          `
          )
          .addTo(map);

        // Add event listener to the button after popup is added to DOM
        setTimeout(() => {
          const btn = document.getElementById("streetview-btn");
          if (btn) {
            btn.addEventListener("click", () => {
              openStreetView(coordinates[1], coordinates[0]);
            });
          }
        }, 0);
      }
    });

    // Change cursor on cluster hover
    map.on("mouseenter", "clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
      map.getCanvas().style.cursor = "";
    });

    // Change cursor on individual point hover
    map.on("mouseenter", "carlos-individual-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "carlos-individual-points", () => {
      map.getCanvas().style.cursor = "";
    });
  }, []);

  // Add individual point layers
  const addPointLayers = useCallback((map: maplibregl.Map) => {
    // Individual points layer
    map.addLayer({
      id: "carlos-individual-points",
      type: "circle",
      source: "carlos-points",
      filter: ["!", ["has", "point_count"]],
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
        "circle-color": "#3b82f6",
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

    // Point numbers layer
    map.addLayer({
      id: "carlos-point-numbers",
      type: "symbol",
      source: "carlos-points",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "text-field": ["get", "pointNumber"],
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

    // Add hover effects for individual points
    map.on("mouseenter", "carlos-individual-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "carlos-individual-points", () => {
      map.getCanvas().style.cursor = "";
    });
  }, []);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Filter Functions
  ////////////////////////////////////////////////////////////////////////////////

  // Update map filters based on selected tag and GNSS filters
  const updateMapFilters = useCallback(
    (
      map: maplibregl.Map,
      tagFilter: string | null,
      gnssGreaterThanZero: boolean,
      gnssNotNull: boolean
    ) => {
      if (!map.isStyleLoaded()) return;

      console.log("🔍 === FILTER DEBUG START ===");
      console.log("📊 Original features count:", geoJsonData.features.length);
      console.log("🏷️ Tag filter:", tagFilter);
      console.log("📡 GNSS > 0 filter:", gnssGreaterThanZero);
      console.log("📡 GNSS not null filter:", gnssNotNull);

      // For clustering with filters, we need to update the source data
      // MapLibre clustering doesn't work well with layer-level filters
      let filteredFeatures = geoJsonData.features;

      // Apply tag filter
      if (tagFilter) {
        const beforeCount = filteredFeatures.length;
        filteredFeatures = filteredFeatures.filter(
          (feature) => feature.properties.tag === tagFilter
        );
        console.log(
          `🏷️ After tag filter (${tagFilter}): ${beforeCount} → ${filteredFeatures.length}`
        );
      }

      // Apply GNSS > 0 filter
      if (gnssGreaterThanZero) {
        const beforeCount = filteredFeatures.length;
        filteredFeatures = filteredFeatures.filter((feature) => {
          const gnss = feature.properties.gnss;
          const isValid =
            gnss !== null && gnss !== undefined && Number(gnss) > 0;
          return isValid;
        });
        console.log(
          `📡 After GNSS > 0 filter: ${beforeCount} → ${filteredFeatures.length}`
        );

        // Sample some GNSS values for debugging
        const sampleGnss = filteredFeatures
          .slice(0, 5)
          .map((f) => f.properties.gnss);
        console.log("📡 Sample GNSS values (> 0):", sampleGnss);
      }

      // Apply GNSS not null filter
      if (gnssNotNull) {
        const beforeCount = filteredFeatures.length;
        filteredFeatures = filteredFeatures.filter((feature) => {
          const gnss = feature.properties.gnss;
          const isNotNull = gnss !== null && gnss !== undefined && gnss !== "";
          return isNotNull;
        });
        console.log(
          `📡 After GNSS not null filter: ${beforeCount} → ${filteredFeatures.length}`
        );

        // Sample some GNSS values for debugging
        const sampleGnss = filteredFeatures
          .slice(0, 5)
          .map((f) => f.properties.gnss);
        console.log("📡 Sample GNSS values (not null):", sampleGnss);
      }

      const filteredData = {
        type: "FeatureCollection" as const,
        features: filteredFeatures,
      };

      console.log("✅ Final filtered features count:", filteredFeatures.length);
      console.log("🔍 === FILTER DEBUG END ===");

      // Update the source data
      const source = map.getSource("carlos-points") as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(filteredData);
      }
    },
    [geoJsonData]
  );

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Map Creation
  ////////////////////////////////////////////////////////////////////////////////

  const createMap = useCallback(() => {
    if (!mapContainer.current) return null;

    // Initialize map
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: center,
      zoom: zoom,
      attributionControl: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: 300,
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

    // Setup map data and layers after load
    map.on("load", () => {
      // Add GeoJSON source with clustering
      map.addSource("carlos-points", {
        type: "geojson",
        data: geoJsonData,
        cluster: true,
        clusterMaxZoom: 11, // Max zoom to cluster points
        clusterRadius: 50, // Radius of each cluster
      });

      // Add all layers
      addClusterLayers(map);
      addPointLayers(map);

      console.log(
        `✅ Map loaded with ${processedPoints.length} points (${rawPoints.length} original)`
      );
    });

    return map;
  }, [
    center,
    zoom,
    mapStyle,
    geoJsonData,
    addClusterLayers,
    addPointLayers,
    processedPoints.length,
  ]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Effects
  ////////////////////////////////////////////////////////////////////////////////

  useEffect(() => {
    createMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [createMap]);

  // Update filters when any filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    updateMapFilters(
      map,
      selectedTag,
      gnssGreaterThanZeroFilter,
      gnssNotNullFilter
    );
  }, [
    selectedTag,
    gnssGreaterThanZeroFilter,
    gnssNotNullFilter,
    updateMapFilters,
  ]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Component Render
  ////////////////////////////////////////////////////////////////////////////////

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
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
          zIndex: 1,
        }}
      >
        <div style={{ fontWeight: "600", marginBottom: "4px" }}>
          📍 Carlos Data (Clustered)
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          <div>
            Center: [{center[0].toFixed(6)}, {center[1].toFixed(6)}]
          </div>
          <div>Zoom: {zoom}</div>
          <div>Filtered Points: {processedPoints.length}</div>
          <div>Original Points: {rawPoints.length}</div>
          <div
            style={{ marginTop: "4px", fontSize: "11px", fontStyle: "italic" }}
          >
            🔢 Clustered for better performance
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "140px",
          left: "10px",
          background: "rgba(255, 255, 255, 0.95)",
          padding: "12px 16px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: "14px",
          color: "#374151",
          maxWidth: "280px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontWeight: "600",
            marginBottom: "8px",
          }}
        >
          🏷️ Filter by tag
        </div>

        {/* Tag Filter Dropdown */}
        <select
          value={selectedTag || ""}
          onChange={(e) => setSelectedTag(e.target.value || null)}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid #d1d5db",
            fontSize: "12px",
            backgroundColor: "white",
            cursor: "pointer",
            marginBottom: "8px",
          }}
        >
          <option value="">All Points</option>
          {uniqueTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        {/* Filter Info */}
        <div style={{ fontSize: "11px", color: "#6b7280" }}>
          {selectedTag ? (
            <div>
              📌 Showing only: <strong>{selectedTag}</strong>
              <br />
              <span style={{ fontStyle: "italic" }}>
                {processedPoints.filter((p) => p.tag === selectedTag).length}{" "}
                points
              </span>
            </div>
          ) : (
            <div style={{ fontStyle: "italic" }}>
              Showing all {uniqueTags.length} available tags
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: "250px",
          left: "10px",
          background: "rgba(255, 255, 255, 0.95)",
          padding: "12px 16px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: "14px",
          color: "#374151",
          maxWidth: "280px",
          zIndex: 1,
        }}
      >
        <div style={{ fontWeight: "600", marginBottom: "8px" }}>
          🏷️ Filter by gnss
        </div>
        <div style={{ fontSize: "11px", color: "#6b7280" }}>
          <label
            style={{
              display: "flex",
              gap: "3px",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            {"GNSS > 0"}
            <input
              type="checkbox"
              checked={gnssGreaterThanZeroFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setGnssGreaterThanZeroFilter(e.target.checked);
              }}
            />
          </label>
          <label
            style={{
              display: "flex",
              gap: "3px",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            {"GNSS not null"}
            <input
              type="checkbox"
              checked={gnssNotNullFilter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setGnssNotNullFilter(e.target.checked);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default CarlosMockup;
