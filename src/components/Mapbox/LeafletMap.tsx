import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { generateRandomPoints } from "../../utils/generateRandomPoints";

// Extender la interfaz de Leaflet para incluir markerClusterGroup
declare module "leaflet" {
  function markerClusterGroup(options?: any): any;
}

// Configurar iconos por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/images/marker-icon-2x.png",
  iconUrl: "/leaflet/images/marker-icon.png",
  shadowUrl: "/leaflet/images/marker-shadow.png",
});

// Generar 20,000 puntos para testing de rendimiento
const points = generateRandomPoints(20000);

export default function LeafletNativeMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Inicializar el mapa centrado en Murcia
    const map = L.map(mapRef.current, {
      center: [37.9922, -1.1307], // Murcia, España
      zoom: 10,
      zoomControl: true,
      preferCanvas: true, // Optimización para muchos puntos
    });

    mapInstance.current = map;

    // Agregar capa de tiles
    const apiKey = "W8q1pSL8KdnaMEh4wtdB";
    L.tileLayer(
      `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${apiKey}`,
      {
        attribution:
          '&copy; <a href="https://www.maptiler.com/">MapTiler</a> & contributors',
        maxZoom: 18,
      }
    ).addTo(map);

    // Configurar clustering con spiderfy
    const markerClusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 200,
      chunkDelay: 50,
      maxClusterRadius: 100,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 16,
      spiderfyDistanceMultiplier: 1.5,
      // Optimizaciones para rendimiento
      animate: true,
      animateAddingMarkers: false,
      removeOutsideVisibleBounds: true,
    });

    // Crear marcadores con diferentes colores según el status
    const markers: L.CircleMarker[] = [];

    points.forEach((point) => {
      // Determinar color según status
      let color: string;
      switch (point.status) {
        case "green":
          color = "#289178";
          break;
        case "red":
          color = "#B4202A";
          break;
        case "yellow":
          color = "#C67605";
          break;
        default:
          color = "#666666";
      }

      // Crear CircleMarker para mejor rendimiento
      const marker = L.circleMarker([point.gps[1], point.gps[0]], {
        radius: 14,
        fillColor: color,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      // Agregar popup con información
      marker.bindPopup(`
        <div style="font-family: Arial, sans-serif;">
          <h4 style="margin: 0 0 8px 0; color: ${color};">${point.station}</h4>
          <p style="margin: 4px 0;"><strong>Serial:</strong> ${
            point.serialNumber
          }</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> 
            <span style="color: ${color}; font-weight: bold;">${point.status.toUpperCase()}</span>
          </p>
          <p style="margin: 4px 0;"><strong>Brand:</strong> ${point.brand}</p>
          <p style="margin: 4px 0;"><strong>Model:</strong> ${point.model}</p>
          <p style="margin: 4px 0;"><strong>Installed:</strong> ${
            point.installationDate
          }</p>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            <strong>Coords:</strong> ${point.gps[1].toFixed(
              4
            )}, ${point.gps[0].toFixed(4)}
          </p>
        </div>
      `);

      markers.push(marker);
      markerClusterGroup.addLayer(marker);
    });

    // Agregar el grupo de clusters al mapa
    map.addLayer(markerClusterGroup);

    // Log para verificar que los puntos se han cargado
    console.log(`Leaflet nativo: ${points.length} puntos cargados`);
    console.log(`Marcadores creados: ${markers.length}`);

    // Cleanup al desmontar
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {/* Contenedor del mapa */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Overlay con información */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "10px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 1000,
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <strong>Leaflet Nativo</strong>
        <br />
        📍 {points.length.toLocaleString()} puntos
        <br />
        🎯 Centro: Murcia
        <br />
        🕸️ Clustering + Spiderfy
      </div>
    </div>
  );
}
