import { useEffect, useRef, useState } from "react";
import styles from "./PegmanContainer.module.css";
import type maplibregl from "maplibre-gl";

type PegmanContainerProps = {
  mapInstance?: maplibregl.Map | null;
  onDropOnMap?: (coordinates: [number, number]) => void;
};

// Utility function to check if coordinates are within map bounds
const isWithinMapBounds = (clientX: number, clientY: number): boolean => {
  const mapCanvas = document.querySelector(".maplibregl-canvas");
  if (!mapCanvas) return false;

  const rect = mapCanvas.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
};

// Utility function to convert screen coordinates to map coordinates
const screenToMapCoordinates = (
  clientX: number,
  clientY: number,
  mapInstance: maplibregl.Map | null
): [number, number] | null => {
  if (!mapInstance) return null;

  const mapCanvas = document.querySelector(".maplibregl-canvas");
  if (!mapCanvas) return null;

  const rect = mapCanvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  try {
    const lngLat = mapInstance.unproject([x, y]);
    return [lngLat.lng, lngLat.lat];
  } catch (error) {
    console.warn(
      "Error converting screen coordinates to map coordinates:",
      error
    );
    return null;
  }
};

const PegmanContainer = ({
  mapInstance,
  onDropOnMap,
}: PegmanContainerProps) => {
  const pegmanRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const initialPositionRef = useRef({ x: 0, y: 0 });
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastXRef = useRef(0);
  const pegmanShadowRef = useRef<HTMLDivElement>(null);

  // State to control which pegman image to show
  const [pegmanState, setPegmanState] = useState<
    "static" | "hover" | "dragging"
  >("static");
  const [isDraggingOutside, setIsDraggingOutside] = useState(false);

  // Ref para guardar los colores originales de las calles
  const originalRoadColorsRef = useRef<Map<string, string>>(new Map());

  // Función para restaurar los colores originales de las calles
  const restoreOriginalRoadColors = () => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    // Restaurar los colores originales guardados
    originalRoadColorsRef.current.forEach((originalColor, layerId) => {
      try {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.setPaintProperty(layerId, "line-color", originalColor);
        }
      } catch (error) {
        console.debug(`No se pudo restaurar color de la capa: ${layerId}`);
      }
    });

    // Limpiar el mapa de colores guardados
    originalRoadColorsRef.current.clear();
  };

  // Función para cambiar las calles a azul claro durante el dragging
  const highlightRoadsForDropping = () => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    // Limpiar colores guardados previos
    originalRoadColorsRef.current.clear();

    // Obtener todas las capas del mapa
    const allLayers = mapInstance.getStyle().layers;

    // Filtrar capas que probablemente sean carreteras
    const roadLayers = allLayers?.filter((layer) => {
      const layerId = layer.id.toLowerCase();
      return (
        layer.type === "line" &&
        (layerId.includes("road") ||
          layerId.includes("highway") ||
          layerId.includes("street") ||
          layerId.includes("motorway") ||
          layerId.includes("trunk") ||
          layerId.includes("primary") ||
          layerId.includes("secondary") ||
          layerId.includes("tertiary"))
      );
    });

    // Cambiar color de todas las capas de carreteras detectadas
    roadLayers?.forEach((layer) => {
      try {
        // Guardar el color original antes de cambiarlo
        const currentColor = mapInstance.getPaintProperty(
          layer.id,
          "line-color"
        );
        if (currentColor !== undefined) {
          originalRoadColorsRef.current.set(layer.id, currentColor as string);
        }

        // Cambiar al color azul
        mapInstance.setPaintProperty(layer.id, "line-color", "#00aabd");
      } catch (error) {
        // Ignorar errores si la capa no soporta line-color
        console.debug(`No se pudo cambiar color de la capa: ${layer.id}`);
      }
    });
  };

  useEffect(() => {
    const pegman = pegmanRef.current;
    const pegmanShadow = pegmanShadowRef.current;
    const container = containerRef.current;
    if (!pegman || !container) return;

    const timeout = 25;
    const maxDegrees = 50;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isDraggingRef.current = true;
      initialPositionRef.current = { x: e.clientX, y: e.clientY };

      // Change to dragging state
      setPegmanState("dragging");

      // Cambiar las calles a azul claro para indicar donde se puede soltar el pegman
      highlightRoadsForDropping();

      // Prevent text selection during drag
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      // Disable pointer events on other elements
      document.body.style.pointerEvents = "none";
      // Re-enable pointer events only on our pegman
      pegman.style.pointerEvents = "auto";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const dy = e.clientY - initialPositionRef.current.y;
      const dx = e.clientX - initialPositionRef.current.x;

      // Check if dragging over map
      const overMap = isWithinMapBounds(e.clientX, e.clientY);
      setIsDraggingOutside(overMap);

      const rx = Math.max(
        -maxDegrees,
        Math.min(maxDegrees, dx - lastXRef.current)
      );
      pegman.style.setProperty("--r", `${rx}deg`);

      // Durante el dragging, aplicar scale y rotación juntos
      if (pegmanState === "dragging") {
        pegman.style.transform = `scale(2.1) rotate(${rx}deg)`;
      }

      pegman.animate(
        { translate: `${dx}px ${dy}px` },
        {
          duration: 100,
          fill: "forwards",
        }
      );

      // Mover la sombra junto con el pegman
      if (pegmanShadow) {
        pegmanShadow.animate(
          { translate: `${dx}px ${dy}px` },
          {
            duration: 100,
            fill: "forwards",
          }
        );
      }

      // Clear previous timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        lastXRef.current = dx;
        pegman.style.setProperty("--r", "0deg");
      }, timeout);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      isDraggingRef.current = false;
      setIsDraggingOutside(false);

      // Restaurar colores originales de las calles
      restoreOriginalRoadColors();

      // Restore normal styles
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.style.pointerEvents = "";
      pegman.style.pointerEvents = "";

      // Check if dropped on map
      if (isDraggingOutside) {
        const coordinates = screenToMapCoordinates(
          e.clientX,
          e.clientY,
          mapInstance || null
        );
        if (coordinates && onDropOnMap) {
          onDropOnMap(coordinates);
        }
      }

      // Return to static state
      setPegmanState("static");

      // Reset transform and rotation
      pegman.style.setProperty("--r", "0deg");
      pegman.style.transform = ""; // Limpiar cualquier transform inline

      pegman.animate(
        { translate: `0px 0px` },
        {
          duration: 500,
          fill: "forwards",
          easing: "ease",
        }
      );

      // Regresar la sombra a su posición original junto con el pegman
      if (pegmanShadow) {
        pegmanShadow.animate(
          { translate: `0px 0px` },
          {
            duration: 500,
            fill: "forwards",
            easing: "ease",
          }
        );
      }

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        lastXRef.current = 0;
      }, timeout);
    };

    const onMouseEnter = () => {
      if (!isDraggingRef.current) {
        setPegmanState("hover");
      }
    };

    const onMouseLeave = () => {
      if (!isDraggingRef.current) {
        setPegmanState("static");
      }
    };

    // Add event listeners
    pegman.addEventListener("mousedown", onMouseDown);
    pegman.addEventListener("mouseenter", onMouseEnter);
    pegman.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    // Cleanup function
    return () => {
      pegman.removeEventListener("mousedown", onMouseDown);
      pegman.removeEventListener("mouseenter", onMouseEnter);
      pegman.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      // Clear any pending timeout
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      // Reset cursor and styles
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    };
  }, [onDropOnMap, isDraggingOutside]);

  // Get the appropriate image source and size based on state
  const getPegmanImageStyle = () => {
    const baseStyle = {
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };

    switch (pegmanState) {
      case "hover":
        return {
          ...baseStyle,
          backgroundImage: `url(/images/pegman/hover.PNG)`,
          backgroundSize: "contain",
        };
      case "dragging":
        return {
          ...baseStyle,
          backgroundImage: `url(/images/pegman/dragging.PNG)`,
          backgroundSize: "contain",
          // Nota: El scale y la rotación se aplicarán dinámicamente en onMouseMove
        };
      case "static":
      default:
        return {
          ...baseStyle,
          backgroundImage: `url(/images/pegman/static.PNG)`,
          backgroundSize: "contain",
        };
    }
  };

  return (
    <div
      className={styles.pegmanContainer}
      id="pegman-container"
      ref={containerRef}
    >
      <div
        className={styles.pegman}
        id="pegman"
        ref={pegmanRef}
        data-dragging={pegmanState === "dragging"}
        style={getPegmanImageStyle()}
      />
      {pegmanState === "dragging" && (
        <div className={styles.pegmanShadow} ref={pegmanShadowRef}>
          <div className={styles.blurBackground} />
        </div>
      )}
    </div>
  );
};

export default PegmanContainer;
