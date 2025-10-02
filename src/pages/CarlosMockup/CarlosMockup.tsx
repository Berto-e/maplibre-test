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
import { parse } from "date-fns";
import "maplibre-gl/dist/maplibre-gl.css";
import rawPoints from "../../utils/raw_points.json";

type tPoint = {
  "Entity Name": string | null;
  longitude: number | null;
  latitude: number | null;
  "GNSS accuracy": string | null;
  Timestamp: string | null | Date;
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

  // ...existing code...

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
    // Convert objects to arrays and filter out invalid points
    const validPoints = (rawPoints as tPoint[])
      .filter(
        (p) =>
          p.longitude !== 0 &&
          p.latitude !== 0 &&
          p.Timestamp !== "" &&
          p.Timestamp !== null
      )
      .map((p, index) => ({
        id: index,
        coordinates: [p.longitude, p.latitude] as [number, number],
        longitude: p.longitude,
        latitude: p.latitude,
        timestamp: p.Timestamp,
        gnss: p["GNSS accuracy"],
        tag: p["Entity Name"],
      }));

    // Eliminate duplicates by longitude and latitude
    const seen = new Set<string>();
    const uniquePoints = validPoints.filter((point) => {
      const key = `${point.longitude}-${point.latitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Reassign ids sequentially after deduplication
    return uniquePoints.map((point, index) => ({
      ...point,
      id: index,
    }));
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

  // ...existing code...

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
          tag: point.tag, // Entity Name for filtering
          timestamp: point.timestamp,
          gnss: point.gnss, // GNSS accuracy
        },
      })),
    };
  }, [processedPoints]);

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Map Configuration
  ////////////////////////////////////////////////////////////////////////////////

  // Animated path helpers (defined after geoJsonData)
  // Animated path state (requestAnimationFrame)
  const [isAnimating, setIsAnimating] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const animSegmentRef = useRef<number>(0);
  const animTRef = useRef<number>(0); // interpolation 0..1
  const animCoordsRef = useRef<[number, number][]>([]);
  const animSpeedRef = useRef<number>(0.02); // t increment per frame
  const animatedSourceId = "carlos-animated-line";

  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsAnimating(false);
    animSegmentRef.current = 0;
    animTRef.current = 0;
    animCoordsRef.current = [];
    // remove source/layer
    const map = mapRef.current;
    if (!map) return;
    try {
      if (map.getLayer(animatedSourceId)) map.removeLayer(animatedSourceId);
    } catch {
      /* ignore */
    }
    try {
      if (map.getSource(animatedSourceId)) map.removeSource(animatedSourceId);
    } catch {
      /* ignore */
    }
    // remove plane layer/source/image if present
    try {
      if (map.getLayer("carlos-animated-plane-layer"))
        map.removeLayer("carlos-animated-plane-layer");
    } catch {
      /* ignore */
    }
    try {
      if (map.getSource("carlos-animated-plane"))
        map.removeSource("carlos-animated-plane");
    } catch {
      /* ignore */
    }
    try {
      // remove image if map supports it
      if ((map as any).hasImage && (map as any).hasImage("plane-icon")) {
        try {
          (map as any).removeImage("plane-icon");
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const startAnimation = useCallback(
    (speed = 0.02) => {
      const map = mapRef.current;
      if (!map || !selectedTag) return;
      stopAnimation();
      animSpeedRef.current = speed;

      // Build ordered coords for selected tag using the currently displayed
      // features (respects filters applied via updateMapFilters)
      const sourceFeatures =
        displayedFeaturesRef.current && displayedFeaturesRef.current.length > 0
          ? displayedFeaturesRef.current
          : (geoJsonData.features as GeoJSON.Feature[]);

      const pts = sourceFeatures
        .filter(
          (f) =>
            f &&
            f.properties &&
            f.properties.tag === selectedTag &&
            f.geometry?.type === "Point"
        )
        .slice()
        .sort((a, b) => {
          const ai = a && a.properties ? Number(a.properties.id ?? 0) : 0;
          const bi = b && b.properties ? Number(b.properties.id ?? 0) : 0;
          return ai - bi;
        })
        .map(
          (f) => (f.geometry as GeoJSON.Point).coordinates as [number, number]
        );

      if (pts.length < 2) return;

      animCoordsRef.current = pts;
      animSegmentRef.current = 0;
      animTRef.current = 0;
      setIsAnimating(true);

      // ensure source/layer exist
      const emptyGeo = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: [] },
            properties: {},
          },
        ],
      };
      if (!map.getSource(animatedSourceId)) {
        map.addSource(animatedSourceId, {
          type: "geojson",
          data: emptyGeo as GeoJSON.FeatureCollection,
        });
        map.addLayer({
          id: animatedSourceId,
          type: "line",
          source: animatedSourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#ff0000",
            "line-width": 3,
            "line-opacity": 0.95,
          },
        });

        // add plane icon image (SVG) and a source/layer for the moving plane
        try {
          const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'><path fill='%23ffffff' d='M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9L2 14v2l8-1v3l-2 1v1l3-0.5L14 20v-1l-2-1v-3l8 1z'/></svg>`;
          const img = new Image();
          img.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
          img.onload = () => {
            try {
              if (
                (map as any).addImage &&
                !(map as any).hasImage?.("plane-icon")
              ) {
                (map as any).addImage("plane-icon", img);
              }
            } catch {
              /* ignore */
            }
          };
        } catch {
          /* ignore */
        }

        try {
          if (!map.getSource("carlos-animated-plane")) {
            const planeGeo = {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: [0, 0] },
                  properties: { bearing: 0 },
                },
              ],
            };
            map.addSource("carlos-animated-plane", {
              type: "geojson",
              data: planeGeo as GeoJSON.FeatureCollection,
            });
            map.addLayer({
              id: "carlos-animated-plane-layer",
              type: "symbol",
              source: "carlos-animated-plane",
              layout: {
                "icon-image": "plane-icon",
                "icon-size": 0.7,
                "icon-allow-overlap": true,
                "icon-rotation-alignment": "map",
                "icon-rotate": ["get", "bearing"],
              },
            });
          }
        } catch {
          /* ignore */
        }
      }

      const frame = () => {
        const coords = animCoordsRef.current;
        const seg = animSegmentRef.current;
        const t = animTRef.current + animSpeedRef.current;
        animTRef.current = t;
        let segIndex = seg;
        let frac = t;
        if (t >= 1) {
          // advance to next segment
          animSegmentRef.current = seg + Math.floor(t);
          animTRef.current = t - Math.floor(t);
          segIndex = animSegmentRef.current;
          frac = animTRef.current;
        }

        // clamp
        if (segIndex >= coords.length - 1) {
          // animation finished; stop
          stopAnimation();
          return;
        }

        const a = coords[segIndex];
        const b = coords[segIndex + 1];
        const interp = [
          a[0] + (b[0] - a[0]) * frac,
          a[1] + (b[1] - a[1]) * frac,
        ] as [number, number];

        // update source with line from start up to current interpolated point
        const played = coords.slice(0, segIndex + 1).concat([interp]);
        const geo = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "LineString", coordinates: played },
              properties: {},
            },
          ],
        };
        try {
          const src = map.getSource(
            animatedSourceId
          ) as maplibregl.GeoJSONSource;
          src.setData(geo as GeoJSON.FeatureCollection);
        } catch {
          /* ignore */
        }

        // update plane position and bearing
        try {
          const planeSrc = map.getSource("carlos-animated-plane") as
            | maplibregl.GeoJSONSource
            | undefined;
          if (planeSrc) {
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const planeGeo = {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: interp },
                  properties: { bearing: angle },
                },
              ],
            };
            planeSrc.setData(planeGeo as GeoJSON.FeatureCollection);
          }
        } catch {
          /* ignore */
        }

        animFrameRef.current = requestAnimationFrame(frame);
      };

      animFrameRef.current = requestAnimationFrame(frame);
    },
    [geoJsonData, selectedTag, stopAnimation]
  );

  // cleanup animation on unmount
  useEffect(() => {
    return () => stopAnimation();
  }, [stopAnimation]);

  // If filters or selected tag change, stop any running animation so we don't
  // animate a route that is no longer visible.
  useEffect(() => {
    stopAnimation();
  }, [
    selectedTag,
    gnssGreaterThanZeroFilter,
    gnssNotNullFilter,
    stopAnimation,
  ]);

  const zoom = 6;
  const apiKey = "W8q1pSL8KdnaMEh4wtdB";
  const mapStyle = `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`;

  ////////////////////////////////////////////////////////////////////////////////
  // 📌 SECTION: Refs
  ////////////////////////////////////////////////////////////////////////////////

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // Keep the currently-displayed (source) features so visualizations can
  // reference exactly what is shown on the map (respects filters and setData).
  const displayedFeaturesRef = useRef<GeoJSON.Feature[]>(
    geoJsonData.features as GeoJSON.Feature[]
  );

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
          50,
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
                📍 Point ${properties?.id || "N/A"}
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
        "text-field": ["get", "id"],
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

      // For clustering with filters, we need to update the source data
      // MapLibre clustering doesn't work well with layer-level filters
      let filteredFeatures = (geoJsonData.features || []).slice();

      // Apply tag filter
      if (tagFilter) {
        filteredFeatures = filteredFeatures.filter(
          (feature) => feature.properties.tag === tagFilter
        );

        // Apply GNSS > 0 filter (if requested) before ordering/rewiring ids
        if (gnssGreaterThanZero) {
          filteredFeatures = filteredFeatures.filter((feature) => {
            const gnss = feature.properties.gnss;
            const isValid =
              gnss !== null && gnss !== undefined && Number(gnss) > 0;
            return isValid;
          });
        }

        // Apply GNSS not null filter (if requested)
        if (gnssNotNull) {
          filteredFeatures = filteredFeatures.filter((feature) => {
            const gnss = feature.properties.gnss;
            const isNotNull =
              gnss !== null && gnss !== undefined && gnss !== "";
            return isNotNull;
          });
        }

        // Now parse timestamps and sort/reassign ids according to the visible set
        filteredFeatures.forEach((f) => {
          f.properties.timestamp =
            f.properties.timestamp instanceof Date
              ? f.properties.timestamp
              : parse(
                  f.properties.timestamp as string,
                  "M/d/yyyy H:mm",
                  new Date()
                );
        });

        // 2️⃣ Ordenamos por timestamp ascendente
        filteredFeatures.sort((a, b) => {
          const t1 = a.properties.timestamp as Date;
          const t2 = b.properties.timestamp as Date;
          return t1.getTime() - t2.getTime();
        });

        // 3️⃣ Reasignamos id de forma autoincremental según el orden
        filteredFeatures.forEach((f, index) => {
          f.properties.id = index; // comienza en 0
        });

        const filteredData = {
          type: "FeatureCollection" as const,
          features: filteredFeatures,
        };

        // Update the source data and track displayed features
        const source = map.getSource(
          "carlos-points"
        ) as maplibregl.GeoJSONSource;
        if (source) {
          try {
            displayedFeaturesRef.current = filteredFeatures.slice();
          } catch {
            displayedFeaturesRef.current =
              filteredFeatures as GeoJSON.Feature[];
          }
          source.setData(filteredData);
        }
      } else {
        // Apply GNSS > 0 filter
        if (gnssGreaterThanZero) {
          filteredFeatures = filteredFeatures.filter((feature) => {
            const gnss = feature.properties.gnss;
            const isValid =
              gnss !== null && gnss !== undefined && Number(gnss) > 0;
            return isValid;
          });
        }

        // Apply GNSS not null filter
        if (gnssNotNull) {
          filteredFeatures = filteredFeatures.filter((feature) => {
            const gnss = feature.properties.gnss;
            const isNotNull =
              gnss !== null && gnss !== undefined && gnss !== "";
            return isNotNull;
          });
        }

        const filteredData = {
          type: "FeatureCollection" as const,
          features: filteredFeatures,
        };

        // Update the source data and track displayed features
        const source = map.getSource(
          "carlos-points"
        ) as maplibregl.GeoJSONSource;
        if (source) {
          try {
            displayedFeaturesRef.current = filteredFeatures.slice();
          } catch {
            displayedFeaturesRef.current =
              filteredFeatures as GeoJSON.Feature[];
          }
          source.setData(filteredData);
        }
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
        // Increase clusterMaxZoom so clustering remains active at zoom 10
        // and up to higher zoom levels. Also increase clusterRadius to
        // group nearby points more aggressively.
        clusterMaxZoom: 16, // Max zoom to cluster points (was 11)
        clusterRadius: 80, // Radius of each cluster (was 50)
      });

      // initialize displayed features ref to the initial source data
      try {
        displayedFeaturesRef.current = (
          geoJsonData.features as GeoJSON.Feature[]
        ).slice();
      } catch {
        displayedFeaturesRef.current = [];
      }

      // Add all layers
      addClusterLayers(map);
      addPointLayers(map);

      console.log(
        `✅ Map loaded with ${processedPoints.length} points (${
          (rawPoints as tPoint[]).length
        } original)`
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
          <div>Original Points: {(rawPoints as tPoint[]).length}</div>
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

        {/* Animation Controls for selected tag */}
        {selectedTag && (
          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                if (isAnimating) stopAnimation();
                else startAnimation(0.02);
              }}
              style={{
                background: isAnimating ? "#ef4444" : "#3b82f6",
                color: "white",
                border: "none",
                padding: "6px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              {isAnimating ? "Stop tour" : "Animate tag"}
            </button>
            <button
              onClick={() => startAnimation(0.05)}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                padding: "6px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Play fast
            </button>
          </div>
        )}

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
          top: "300px",
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
