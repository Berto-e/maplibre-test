import rawPoints from "../data/processed_points.json";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type tPoint = {
  longitude: number;
  latitude: number;
  id: number;
  gnss?: number;
  timestamp: string;
  macs?: string;
  coordinates: [number, number];
};

const CarlosMockup = () => {
  //* -- VARIABLES --
  // Map Filters
  const [tagFilter, setTagFilter] = useState<string>("");
  const [gnssFilter, setGnssFilter] = useState<boolean>(false);
  const [macFilter, setMacFilter] = useState<boolean>(false);

  // Map container & map ref
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Map Points
  const points = rawPoints as unknown as Record<string, { points: tPoint[] }>;
  const totalPoints = Object.values(points).flatMap((p) => p.points);
  const tags = Object.keys(points).flat();

  // Convert points -> GeoJSON FeatureCollection once (and when points change)
  const geojson = useMemo(() => {
    const features = Object.entries(points).flatMap(([tag, g]) =>
      g.points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: p.coordinates },
        properties: {
          id: p.id,
          tag,
          timestamp: p.timestamp,
          gnss: p.gnss,
          macs: p.macs,
        },
      }))
    );

    return { type: "FeatureCollection" as const, features };
  }, [points]);

  // tiny helper to escape user-provided strings inserted into popup HTML
  const escapeHtml = (unsafe?: unknown) => {
    const s = unsafe == null ? "" : String(unsafe);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  //Calculate the center of the map
  const center: [number, number] = useMemo(() => {
    const all = Object.values(points).flatMap((g) => g.points);
    if (!all || all.length === 0) return [-100, 40];
    const [sumX, sumY] = all.reduce(
      (acc, p) => [acc[0] + p.coordinates[0], acc[1] + p.coordinates[1]],
      [0, 0]
    );
    return [sumX / all.length, sumY / all.length];
  }, [points]);

  //* -- END VARIABLES --

  //1.Map Declaration + plotting + clustering
  useEffect(() => {
    // create map only once
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        "https://api.maptiler.com/maps/streets-v2/style.json?key=KMC7VKVlp4EAdHRSdNZP",
      center: center,
      zoom: 6,
    });

    mapRef.current = map;

    // add navigation control
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const SOURCE_ID = "points-source";
    const CLUSTER_LAYER = "clusters";
    const CLUSTER_COUNT = "cluster-count";
    const UNCLUSTERED = "unclustered-point";

    const addData = () => {
      if (map.getSource(SOURCE_ID)) return;

      // add source with clustering enabled
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      // cluster circles
      map.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            10,
            "#f1f075",
            30,
            "#f28cb1",
          ],
          "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 25],
        },
      });

      // cluster count label
      map.addLayer({
        id: CLUSTER_COUNT,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
      });

      // unclustered points
      map.addLayer({
        id: UNCLUSTERED,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#11b4da",
          "circle-radius": 6,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff",
        },
      });

      // click cluster -> flyTo expansion zoom
      map.on("click", CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [CLUSTER_LAYER],
        });
        const cluster = features[0];
        if (!cluster || !cluster.properties) return;

        const clusterId = Number(
          (cluster.properties as Record<string, unknown>)["cluster_id"]
        );

        const source = map.getSource(SOURCE_ID) as
          | (maplibregl.GeoJSONSource & {
              getClusterExpansionZoom?: (id: number) => Promise<number>;
            })
          | null;
        if (!source || typeof source.getClusterExpansionZoom !== "function")
          return;

        // modern getClusterExpansionZoom returns a Promise in these typings — use it
        source.getClusterExpansionZoom!(clusterId)
          .then((zoom) => {
            if (zoom == null) return;
            const coords = (
              cluster.geometry as unknown as { coordinates: [number, number] }
            ).coordinates;
            map.flyTo({ center: coords, zoom });
          })
          .catch(() => {
            /* ignore errors */
          });
      });

      // click unclustered -> popup (styled)
      map.on("click", UNCLUSTERED, (e) => {
        const feature = e.features && e.features[0];
        if (!feature) return;
        const coords = (
          feature.geometry as unknown as { coordinates: [number, number] }
        ).coordinates.slice() as [number, number];
        const props = feature.properties as Record<string, unknown> | null;

        const timestamp = escapeHtml(props && props["timestamp"]);
        const coordsText = `${Number(coords[0]).toFixed(5)}, ${Number(
          coords[1]
        ).toFixed(5)}`;

        const html = `
          <div>
            <div style="font-weight:700; margin-bottom:6px;">📍 Punto 
            </div>
            <div style="margin-bottom:4px;"><strong>Coords: </strong>${coordsText}</div>
            <div><strong>Timestamp: </strong>${timestamp}</div>
          </div>
        `;

        new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      // change cursor on hover
      map.on(
        "mouseenter",
        CLUSTER_LAYER,
        () => (map.getCanvas().style.cursor = "pointer")
      );
      map.on(
        "mouseleave",
        CLUSTER_LAYER,
        () => (map.getCanvas().style.cursor = "")
      );
      map.on(
        "mouseenter",
        UNCLUSTERED,
        () => (map.getCanvas().style.cursor = "pointer")
      );
      map.on(
        "mouseleave",
        UNCLUSTERED,
        () => (map.getCanvas().style.cursor = "")
      );
    };

    if (map.loaded()) addData();
    else map.on("load", addData);

    return () => {
      try {
        map.remove();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
    };
  }, [geojson, center]);

  // update points by filters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const src = map.getSource(
      "points-source"
    ) as maplibregl.GeoJSONSource | null;
    if (!src) return;

    if (tagFilter) {
      // build a filtered GeoJSON and set it on the existing source
      const filtered = {
        type: "FeatureCollection",
        features: geojson.features.filter(
          (f) => (f.properties as Record<string, unknown>)?.tag === tagFilter
        ),
      };
      try {
        src.setData(filtered as unknown as GeoJSON.FeatureCollection);
      } catch (err) {
        // occasionally setData can throw if map/style isn't ready; ignore silently
        // but log in dev to help debugging
        console.warn("Failed to set filtered source data", err);
      }
    } else {
      // restore full data when no tag filter
      try {
        src.setData(geojson as unknown as GeoJSON.FeatureCollection);
      } catch (err) {
        console.warn("Failed to restore source data", err);
      }
    }
  }, [tagFilter, geojson]);

  return (
    <div
      id="map"
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        fontFamily: "Work Sans",
      }}
    >
      <div
        id="map-info"
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.95)",
          color: "#0b1726",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.244)",
          fontSize: 14,
          zIndex: 10,
          fontFamily: "Work Sans",
          maxWidth: 240,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          Map Info 🗺️
        </h3>
        <p style={{ margin: "6px 0 0" }}>Total Points: {totalPoints.length}</p>
      </div>
      <div
        id="filter-by-tag"
        style={{
          position: "absolute",
          top: 80,
          left: 12,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.95)",
          color: "#0b1726",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.244)",
          fontSize: 14,
          zIndex: 10,
          maxWidth: 240,
          gap: 5,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3 style={{ marginBottom: 5, fontSize: 16, fontWeight: 600 }}>
          Filters
        </h3>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          🛰️{"Gnss > 0"}
          <input
            type="checkbox"
            checked={gnssFilter}
            onChange={(e) => setGnssFilter(e.target.checked)}
          />
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          📡{"macs >= 3"}
          <input
            type="checkbox"
            checked={macFilter}
            onChange={(e) => setMacFilter(e.target.checked)}
          />
        </label>
        <label htmlFor="tag-select" style={{ display: "block" }}>
          🏷️Filter by tag
        </label>
        <select
          id="tag-select"
          value={tagFilter}
          onChange={(e) => {
            setTagFilter(e.target.value);
            console.log(e.target.value);
          }}
          style={{
            padding: "2px",
            width: "100%",
            marginTop: 6,
            fontFamily: "Work Sans",
          }}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
export default CarlosMockup;
