import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapContext } from "../contexts/MapContext";

type Coordinate = { lat: number; lng: number };

// Example coordinates for a pipe (LineString)
const RANDOM_PIPE: Coordinate[] = [
  { lat: 36.60515268677145, lng: -6.258356460951911 },
  { lat: 36.60515268677145, lng: -6.258 },
  { lat: 36.6053, lng: -6.2577 },
];

const Mapbox = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { selectedElement } = useMapContext();

  // useEffect to initialize the map (runs only once)
  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: "http://localhost:8080/styles/andalucia_style/style.json",
      center: [-6.25836950353086, 36.60512751654313],
      zoom: 12,
    });

    mapRef.current = map;

    // Add sources and layers when the map is loaded
    map.on("load", () => {
      // Add a GeoJSON source for key points
      map.addSource("puntos-clave", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [-6.258388276953902, 36.60512751654313],
              },
              properties: {
                title: "Casa Carlos",
                color: "#FF5722",
                label: "CC",
              },
            },
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [-6.201316908618605, 36.613125345472156],
              },
              properties: {
                title: "AppliedIt Office",
                color: "#341792",
                label: "AI",
              },
            },
          ],
        },
      });

      // Add a GeoJSON source for the pipe (LineString)
      map.addSource("pipes", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            title: "Random Pipe",
            flow: 100,
            diameter: 30,
            pressure: 5,
          },
          geometry: {
            type: "LineString",
            coordinates: RANDOM_PIPE.map((coord) => [coord.lng, coord.lat]),
          },
        },
      });

      // Add a layer to display points as circles
      map.addLayer({
        id: "puntos-circulos",
        type: "circle",
        source: "puntos-clave",
        paint: {
          "circle-radius": 15,
          "circle-color": ["get", "color"],
        },
      });

      // Add a layer to display the line connecting the points
      map.addLayer({
        id: "puntos-linea",
        type: "line",
        source: "pipes",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#00aeff",
          "line-width": 6,
        },
      });

      // Add a layer for text labels in the center of the circles
      map.addLayer({
        id: "puntos-texto",
        type: "symbol",
        source: "puntos-clave",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-anchor": "center",
          "text-offset": [0, 0],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Popup to show information when clicking on a circle
      map.on("click", "puntos-circulos", (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;

          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${props.title}</strong>`)
            .addTo(map);
        }
      });

      map.on("click", "puntos-linea", (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<strong>${props.title}</strong><br>Flow: ${props.flow} L/s<br>Diameter: ${props.diameter} mm<br>Pressure: ${props.pressure} bar`
            )
            .addTo(map);
        }
      });

      map.on("mouseenter", "puntos-linea", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "puntos-linea", () => {
        map.getCanvas().style.cursor = "";
      });

      // Change cursor to pointer when hovering over circles
      map.on("mouseenter", "puntos-circulos", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "puntos-circulos", () => {
        map.getCanvas().style.cursor = "";
      });

      // Change cursor to pointer when hovering over text labels
      map.on("mouseenter", "puntos-texto", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "puntos-texto", () => {
        map.getCanvas().style.cursor = "";
      });

      // Popup to show information when clicking on a text label
      map.on("click", "puntos-texto", (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;

          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${props.title}</strong>`)
            .addTo(map);
        }
      });
    });

    // Cleanup function to remove the map when the component unmounts
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Runs only once

  // Separate useEffect to handle changes in selectedElement
  useEffect(() => {
    if (mapRef.current && selectedElement?.coordinates) {
      mapRef.current.flyTo({
        center: selectedElement.coordinates,
        zoom: 16,
        speed: 1.8,
        curve: 1.42,
        easing: (t: number) => t,
        essential: true,
      });
    }
  }, [selectedElement]); // Runs when selectedElement changes

  return (
    <>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </>
  );
};

export default Mapbox;
