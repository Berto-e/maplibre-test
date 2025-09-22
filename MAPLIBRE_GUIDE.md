# 🗺️ Guía Completa: MapLibre GL JS con React

## 📚 Índice

1. [Configuración Inicial](#configuración-inicial)
2. [Conceptos Fundamentales](#conceptos-fundamentales)
3. [Paso a Paso: Construcción del Mapa](#paso-a-paso)
4. [Optimización con React Hooks](#optimización)
5. [Características Avanzadas](#características-avanzadas)
6. [Mejores Prácticas](#mejores-prácticas)

---

## 🚀 Configuración Inicial

### Instalación

```bash
npm install maplibre-gl
npm install @types/maplibre-gl  # Si usas TypeScript
```

### Importaciones Básicas

```typescript
import { useEffect, useRef, useMemo, useCallback } from "react";
<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css"; // ¡Importante! Los estilos CSS
```

---

## 📖 Conceptos Fundamentales

### 1. **Referencias (useRef) - ¿Por qué las necesitamos?**

En React, los componentes se vuelven a renderizar constantemente. Si guardáramos el mapa en una variable normal o en el estado, se perdería o recrearía en cada render, lo cual sería muy ineficiente.

```typescript
const mapContainer = useRef<HTMLDivElement>(null);
const mapRef = useRef<maplibregl.Map | null>(null);
```

#### 🎯 **mapContainer - Referencia al DOM**

```typescript
// En el JSX:
<div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;

// En JavaScript:
const map = new maplibregl.Map({
  container: mapContainer.current, // ← Le dice a MapLibre DÓNDE montarse
  style: mapStyle,
  center: center,
  zoom: zoom,
});
```

**¿Qué hace?**

- Guarda una referencia directa al elemento `<div>` del DOM
- MapLibre necesita un elemento DOM real donde "vivir"
- React no puede acceder directamente al DOM, useRef es el puente

**Analogía:** Es como darle a MapLibre la dirección exacta de tu casa para que sepa dónde instalarse.

#### 🗺️ **mapRef - Referencia a la Instancia del Mapa**

```typescript
// Crear el mapa
const map = new maplibregl.Map({
  /* configuración */
});
mapRef.current = map; // ← Guardamos la instancia del mapa

// Más tarde podemos usarlo:
if (mapRef.current) {
  mapRef.current.addLayer({
    /* nueva capa */
  });
  mapRef.current.flyTo({ center: [lng, lat] });
  mapRef.current.remove(); // Al limpiar el componente
}
```

**¿Qué hace?**

- Guarda la instancia del mapa MapLibre para usar después
- Permite manipular el mapa desde otros useEffect o funciones
- Persiste entre renders sin recrear el mapa
- Nos permite hacer cleanup al desmontar el componente

**Analogía:** Es como tener el control remoto de tu TV. Una vez que tienes el control, puedes cambiar canales, volumen, etc.

#### ⚠️ **¿Qué pasaría SIN useRef?**

```typescript
// ❌ MAL - Sin useRef
let map; // Variable normal

useEffect(() => {
  map = new maplibregl.Map({
    container: "map-div", // ← ¿Qué div? No sabemos cuál
    // ...
  });
}, []);

// ❌ PROBLEMA:
// - En cada render, 'map' se vuelve undefined
// - No podemos acceder al mapa desde otras funciones
// - No podemos hacer cleanup adecuado
// - El elemento DOM no está garantizado
```

#### ✅ **Comparación Práctica:**

```typescript
// CON useRef (CORRECTO)
const MyMapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    // ✅ Sabemos exactamente qué elemento usar
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current, // ← Elemento DOM específico
      // ...
    });

    mapRef.current = map; // ← Guardamos para usar después

    return () => {
      // ✅ Podemos limpiar correctamente
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const addNewLayer = () => {
    // ✅ Podemos acceder al mapa desde cualquier función
    if (mapRef.current) {
      mapRef.current.addLayer({
        /* ... */
      });
    }
  };

  return <div ref={mapContainer} style={{ width: "100%", height: "400px" }} />;
};
```

### 2. **GeoJSON - Formato de Datos**

```typescript
const geoJsonData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [longitude, latitude], // ¡OJO! [lng, lat], no [lat, lng]
      },
      properties: {
        id: 1,
        name: "Mi Punto",
        // Cualquier propiedad personalizada...
      },
    },
  ],
};
```

### 3. **Capas (Layers) en MapLibre**

- **Source**: Los datos (GeoJSON, tiles, etc.)
- **Layer**: Cómo se visualizan los datos (círculos, símbolos, líneas)

---

## 🔨 Paso a Paso: Construcción del Mapa

### Paso 1: Estructura Básica del Componente

```typescript
const MapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
```

### Paso 2: Configuración del Mapa

```typescript
const mapStyle =
  "https://api.maptiler.com/maps/openstreetmap/style.json?key=TU_API_KEY";
const center: [number, number] = [-1.1307, 37.987]; // Murcia, España
const zoom = 10;
```

### Paso 3: Inicialización del Mapa

```typescript
useEffect(() => {
  if (!mapContainer.current) return;

  const map = new maplibregl.Map({
    container: mapContainer.current,
    style: mapStyle,
    center: center,
    zoom: zoom,
    attributionControl: false, // Opcional: quitar atribuciones por defecto
  });

  mapRef.current = map;

  // Cleanup al desmontar el componente
  return () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  };
}, []); // Array vacío = solo se ejecuta una vez
```

### Paso 4: Añadir Controles de Navegación

```typescript
// Dentro del useEffect, después de crear el mapa
map.addControl(new maplibregl.NavigationControl(), "top-right");
map.addControl(new maplibregl.FullscreenControl());
map.addControl(
  new maplibregl.AttributionControl({ compact: true }),
  "bottom-right"
);
```

---

## 🎯 Añadiendo Puntos al Mapa

### Opción A: Marcadores Simples (HTML)

```typescript
// Para pocos puntos (< 100)
const addSimpleMarkers = () => {
  points.forEach((point) => {
    new maplibregl.Marker({ color: "#3b82f6" })
      .setLngLat([point.longitude, point.latitude])
      .addTo(map);
  });
};
```

### Opción B: Capas con GeoJSON (Recomendado)

```typescript
// Para muchos puntos (mejor rendimiento)
map.on("load", () => {
  // 1. Añadir la fuente de datos
  map.addSource("my-points", {
    type: "geojson",
    data: geoJsonData,
  });

  // 2. Añadir la capa visual
  map.addLayer({
    id: "points-layer",
    type: "circle",
    source: "my-points",
    paint: {
      "circle-radius": 8,
      "circle-color": "#3b82f6",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
});
```

---

## 📝 Añadiendo Texto Encima de los Puntos

```typescript
// Capa de símbolos para mostrar texto
map.addLayer({
  id: "point-labels",
  type: "symbol",
  source: "my-points",
  layout: {
    "text-field": ["get", "pointNumber"], // Obtiene la propiedad del GeoJSON
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-size": 14,
    "text-anchor": "center",
    "text-justify": "center",
  },
  paint: {
    "text-color": "#ffffff",
    "text-halo-color": "#000000", // Contorno negro
    "text-halo-width": 1,
  },
});
```

---

## 🎪 Clustering (Agrupación de Puntos)

### Configuración del Source con Clustering

```typescript
map.addSource("clustered-points", {
  type: "geojson",
  data: geoJsonData,
  cluster: true,
  clusterMaxZoom: 14, // Zoom máximo para hacer clustering
  clusterRadius: 50, // Radio del cluster en píxeles
});
```

### Capa de Clusters

```typescript
// Círculos de los clusters
map.addLayer({
  id: "clusters",
  type: "circle",
  source: "clustered-points",
  filter: ["has", "point_count"], // Solo muestra features que tengan point_count
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#51bbd6", // Color para clusters pequeños
      100,
      "#f1f075", // Color para clusters medianos
      750,
      "#f28cb1", // Color para clusters grandes
    ],
    "circle-radius": [
      "step",
      ["get", "point_count"],
      20, // Radio para clusters pequeños
      100,
      30, // Radio para clusters medianos
      750,
      40, // Radio para clusters grandes
    ],
  },
});

// Números dentro de los clusters
map.addLayer({
  id: "cluster-count",
  type: "symbol",
  source: "clustered-points",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["Open Sans Bold"],
    "text-size": 14,
  },
  paint: {
    "text-color": "#ffffff",
  },
});

// Puntos individuales (cuando no están en cluster)
map.addLayer({
  id: "individual-points",
  type: "circle",
  source: "clustered-points",
  filter: ["!", ["has", "point_count"]], // Solo features SIN point_count
  paint: {
    "circle-radius": 8,
    "circle-color": "#3b82f6",
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
});
```

---

## 🎮 Eventos e Interactividad

### Eventos de Click

```typescript
map.on("click", "individual-points", (e) => {
  const feature = e.features![0];
  const properties = feature.properties;

  console.log("Punto clickeado:", properties);

  // Crear popup
  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(`<h3>Punto ${properties.pointNumber}</h3>`)
    .addTo(map);
});
```

### Eventos de Hover

```typescript
// Cambiar cursor al pasar sobre puntos
map.on("mouseenter", "individual-points", () => {
  map.getCanvas().style.cursor = "pointer";
});

map.on("mouseleave", "individual-points", () => {
  map.getCanvas().style.cursor = "";
});
```

### Click en Clusters para Expandir

```typescript
map.on("click", "clusters", (e) => {
  const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
  const clusterId = features[0].properties!.cluster_id;
  const source = map.getSource("clustered-points") as maplibregl.GeoJSONSource;

  source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
    const coordinates = (features[0].geometry as GeoJSON.Point).coordinates as [
      number,
      number
    ];
    map.easeTo({
      center: coordinates,
      zoom: zoom,
    });
  });
});
```

---

## ⚡ Optimización con React Hooks

### 🧠 useMemo - Memoización de Datos

```typescript
// ❌ MAL: Se recalcula en cada render
const processedData = rawData.filter((point) => point.lat !== 0);

// ✅ BIEN: Solo se recalcula cuando rawData cambia
const processedData = useMemo(() => {
  return rawData.filter((point) => point.lat !== 0);
}, [rawData]);
```

**¿Cuándo usar useMemo?**

- Procesamiento pesado de datos
- Transformaciones complejas
- Cuando el cálculo depende de props/state específicos

### 🔄 useCallback - Memoización de Funciones

```typescript
// ❌ MAL: Nueva función en cada render
const handleClick = (event) => {
  console.log("Click!", event);
};

// ✅ BIEN: Misma función hasta que dependencies cambien
const handleClick = useCallback((event) => {
  console.log("Click!", event);
}, []); // Array vacío = nunca cambia
```

**¿Cuándo usar useCallback?**

- Funciones que se pasan como props a componentes hijos
- Event handlers que se usan en useEffect
- Funciones costosas que no necesitan recrearse

### Ejemplo Práctico en el Mapa

```typescript
// Procesar datos solo cuando rawPoints cambia
const processedPoints = useMemo(() => {
  console.log("🔄 Procesando puntos..."); // Solo aparece cuando sea necesario

  return rawPoints
    .filter((p) => p.longitude !== 0 && p.latitude !== 0)
    .map((p, index) => ({
      id: index,
      coordinates: [p.longitude, p.latitude] as [number, number],
    }));
}, [rawPoints]);

// Función para añadir capas, memoizada
const addPointLayers = useCallback((map: maplibregl.Map) => {
  console.log("🎨 Añadiendo capas..."); // Solo cuando la función cambia

  map.addLayer({
    id: "points",
    type: "circle",
    source: "my-points",
    paint: { "circle-radius": 8, "circle-color": "#3b82f6" },
  });
}, []); // No depende de nada, nunca cambia

// Crear GeoJSON solo cuando processedPoints cambia
const geoJsonData = useMemo(() => {
  console.log("📊 Creando GeoJSON..."); // Solo cuando processedPoints cambia

  return {
    type: "FeatureCollection" as const,
    features: processedPoints.map((point) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: point.coordinates },
      properties: { id: point.id },
    })),
  };
}, [processedPoints]);
```

---

## 🎨 Zoom Responsivo y Expresiones

### Tamaño de Círculos Basado en Zoom

```typescript
paint: {
  "circle-radius": [
    "interpolate",
    ["linear"],
    ["zoom"],
    5,  0,     // Zoom 5: radio 0 (invisible)
    6,  4,     // Zoom 6: radio 4px
    10, 8,     // Zoom 10: radio 8px
    15, 12,    // Zoom 15: radio 12px
    20, 20     // Zoom 20: radio 20px
  ]
}
```

### Opacidad Basada en Zoom

```typescript
paint: {
  "circle-opacity": [
    "interpolate",
    ["linear"],
    ["zoom"],
    5,  0,    // Invisible en zoom bajo
    7,  0.5,  // Semi-transparente
    10, 1     // Completamente opaco
  ]
}
```

### Colores Basados en Propiedades

```typescript
paint: {
  "circle-color": [
    "match",
    ["get", "status"],  // Obtiene la propiedad "status"
    "active",   "#22c55e",  // Verde para activo
    "inactive", "#ef4444",  // Rojo para inactivo
    "pending",  "#f59e0b",  // Ámbar para pendiente
    "#6b7280"   // Gris por defecto
  ]
}
```

---

## 🏗️ Estructura Completa del Componente

```typescript
import { useEffect, useRef, useMemo, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Point {
  id: number;
  longitude: number;
  latitude: number;
  name?: string;
  status?: "active" | "inactive" | "pending";
}

interface MapComponentProps {
  points: Point[];
  onPointClick?: (point: Point) => void;
  center?: [number, number];
  zoom?: number;
}

const MapComponent: React.FC<MapComponentProps> = ({
  points,
  onPointClick,
  center = [0, 0],
  zoom = 10,
}) => {
  // ===== REFS =====
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // ===== PROCESSED DATA (useMemo) =====
  const processedPoints = useMemo(() => {
    return points.filter((p) => p.longitude !== 0 && p.latitude !== 0);
  }, [points]);

  const geoJsonData = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: processedPoints.map((point) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          id: point.id,
          name: point.name || `Punto ${point.id}`,
          status: point.status || "active",
        },
      })),
    };
  }, [processedPoints]);

  // ===== LAYER FUNCTIONS (useCallback) =====
  const addClusterLayers = useCallback((map: maplibregl.Map) => {
    // Clusters
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "points",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#51bbd6",
          100,
          "#f1f075",
          750,
          "#f28cb1",
        ],
        "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
      },
    });

    // Cluster count
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "points",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold"],
        "text-size": 14,
      },
      paint: { "text-color": "#ffffff" },
    });
  }, []);

  const addPointLayers = useCallback((map: maplibregl.Map) => {
    // Individual points
    map.addLayer({
      id: "individual-points",
      type: "circle",
      source: "points",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0,
          10,
          8,
          15,
          12,
        ],
        "circle-color": [
          "match",
          ["get", "status"],
          "active",
          "#22c55e",
          "inactive",
          "#ef4444",
          "pending",
          "#f59e0b",
          "#6b7280",
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });

    // Point labels
    map.addLayer({
      id: "point-labels",
      type: "symbol",
      source: "points",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 10, 0, 12, 12],
        "text-anchor": "top",
        "text-offset": [0, 1],
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1,
      },
    });
  }, []);

  const addEventListeners = useCallback(
    (map: maplibregl.Map) => {
      // Click en puntos individuales
      map.on("click", "individual-points", (e) => {
        const feature = e.features![0];
        const properties = feature.properties;

        if (onPointClick) {
          const point = processedPoints.find((p) => p.id === properties.id);
          if (point) onPointClick(point);
        }
      });

      // Hover effects
      map.on("mouseenter", "individual-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "individual-points", () => {
        map.getCanvas().style.cursor = "";
      });

      // Cluster expansion
      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0].properties!.cluster_id;
        const source = map.getSource("points") as maplibregl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
          const coordinates = (features[0].geometry as GeoJSON.Point)
            .coordinates as [number, number];
          map.easeTo({ center: coordinates, zoom });
        });
      });
    },
    [processedPoints, onPointClick]
  );

  // ===== MAP CREATION (useCallback) =====
  const createMap = useCallback(() => {
    if (!mapContainer.current) return null;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style:
        "https://api.maptiler.com/maps/openstreetmap/style.json?key=YOUR_API_KEY",
      center,
      zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl());

    // Setup layers when map loads
    map.on("load", () => {
      map.addSource("points", {
        type: "geojson",
        data: geoJsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      addClusterLayers(map);
      addPointLayers(map);
      addEventListeners(map);
    });

    return map;
  }, [
    center,
    zoom,
    geoJsonData,
    addClusterLayers,
    addPointLayers,
    addEventListeners,
  ]);

  // ===== EFFECTS =====
  useEffect(() => {
    createMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [createMap]);

  // Update data when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("points") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geoJsonData);
    }
  }, [geoJsonData]);

  // ===== RENDER =====
  return (
    <div style={{ width: "100%", height: "400px", position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Info overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(255,255,255,0.9)",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "14px",
        }}
      >
        📍 {processedPoints.length} puntos
      </div>
    </div>
  );
};

export default MapComponent;
```

---

## 📋 Mejores Prácticas

### ✅ DO (Hacer)

- Usar `useMemo` para procesamiento pesado de datos
- Usar `useCallback` para funciones que se pasan a efectos o componentes hijos
- Limpiar el mapa en el cleanup del `useEffect`
- Usar GeoJSON para muchos puntos (mejor rendimiento)
- Implementar clustering para datasets grandes
- Verificar `map.isStyleLoaded()` antes de manipular capas

### ❌ DON'T (No hacer)

- Recrear datos en cada render sin `useMemo`
- Crear funciones nuevas en cada render sin `useCallback`
- Olvidar el cleanup del mapa
- Usar marcadores HTML para muchos puntos (>100)
- Manipular capas antes de que el mapa esté cargado
- Usar `any` en TypeScript (especificar tipos correctos)

### 🔧 Debugging Tips

```typescript
// Ver que layers están cargados
console.log(map.getStyle().layers);

// Ver que sources están disponibles
console.log(Object.keys(map.getStyle().sources));

// Ver features en una capa
const features = map.queryRenderedFeatures({ layers: ["my-layer"] });
console.log(features);
```

---

## 🎓 Ejercicios Prácticos

1. **Básico**: Crea un mapa con 5 puntos fijos y añade popups al hacer click
2. **Intermedio**: Implementa un filtro que muestre/oculte puntos por categoría
3. **Avanzado**: Añade clustering y diferentes estilos según el zoom level
4. **Experto**: Implementa búsqueda en tiempo real con flyTo animation

¡Esta guía te dará una base sólida para crear mapas interactivos potentes con MapLibre y React! 🚀
