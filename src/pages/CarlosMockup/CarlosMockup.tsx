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

import { useEffect, useRef, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import rawPoints from "../../utils/carlos.json";

////////////////////////////////////////////////////////////////////////////////
// 📌 SECTION: Component Definition
////////////////////////////////////////////////////////////////////////////////

const CarlosMockup = () => {
  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Data Processing & State
  ////////////////////////////////////////////////////////////////////////////////

  // Process and filter raw points data
  const processedPoints = useMemo(() => {
    // Convert objects to arrays and filter out invalid points
    const validPoints = rawPoints
      .filter((p) => p.longitude !== 0 && p.latitude !== 0)
      .map((p, index) => ({
        id: index,
        coordinates: [p.longitude, p.latitude] as [number, number],
        longitude: p.longitude,
        latitude: p.latitude,
      }));

    // Remove duplicates based on coordinates
    const uniquePoints = validPoints.filter(
      (point, index, self) =>
        self.findIndex(
          (p) =>
            p.coordinates[0] === point.coordinates[0] &&
            p.coordinates[1] === point.coordinates[1]
        ) === index
    );

    return uniquePoints;
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
        },
      })),
    };
  }, [processedPoints]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Map Configuration
  ////////////////////////////////////////////////////////////////////////////////

  const zoom = 6;
  const apiKey = "W8q1pSL8KdnaMEh4wtdB";
  const mapStyle = `https://api.maptiler.com/maps/openstreetmap/style.json?key=${apiKey}`;

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

    // Change cursor on cluster hover
    map.on("mouseenter", "clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "clusters", () => {
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
        clusterMaxZoom: 14, // Max zoom to cluster points
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

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Component Render
  ////////////////////////////////////////////////////////////////////////////////

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
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
          📍 Carlos Route Data (Clustered)
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          <div>
            Center: [{center[0].toFixed(6)}, {center[1].toFixed(6)}]
          </div>
          <div>Zoom: {zoom}</div>
          <div>Unique Points: {processedPoints.length}</div>
          <div>Original Points: {rawPoints.length}</div>
          <div
            style={{ marginTop: "4px", fontSize: "11px", fontStyle: "italic" }}
          >
            🔢 Clustered for better performance
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarlosMockup;
