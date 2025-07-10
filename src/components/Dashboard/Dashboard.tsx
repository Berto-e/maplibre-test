import styles from "./Dashboard.module.css";
import { useMapContext } from "../../contexts/MapContext";
import { useCallback, useState, useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { generateRandomPoints } from "../../utils/generateRandomPoints";
import Mapbox from "../Mapbox/Mapbox";

const Dashboard = () => {
  const { mapElements, filters, setFilters } = useMapContext();
  const greenPoints = mapElements.filter((p) => p.status === "green").length;
  const yellowPoints = mapElements.filter((p) => p.status === "yellow").length;
  const redPoints = mapElements.filter((p) => p.status === "red").length;
  const [showPopup, setShowPopup] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<any>(null);

  // Función para manejar cambios en checkboxes
  const handleFilterChange = (color: "green" | "yellow" | "red") => {
    setFilters((prev) => ({
      ...prev,
      [color]: !prev[color],
    }));
  };

  // Memoized points generation to prevent re-renders and number randomization
  const points = useMemo(() => generateRandomPoints(50000), []);

  const handlePointClick = useCallback((properties: any) => {
    setSelectedProperties(properties);
    setShowPopup(true);
  }, []);

  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <img className={styles.logo} alt="Logo" src="/images/logo.png" />
        <nav className={styles.nav}>
          <button className={styles.navItem}>🏠</button>
          <button className={styles.navItem}>📊</button>
          <button className={`${styles.navItem} ${styles.active}`}>🗺️</button>
          <button className={styles.navItem}>📈</button>
          <button className={styles.navItem}>🛠️</button>
        </nav>
        <div className={styles.user}>J</div>
      </aside>

      {/* Main content */}
      {/*Header */}
      <main className={styles.main}>
        <h1 className={styles.title}>
          Contadores inteligentes <span>/ Panel de control</span>
        </h1>

        {/*Mapbox Container with Filters */}
        <div className={styles.mapSection}>
          <div className={styles.mapContainer}>
            <Mapbox
              onPointClick={handlePointClick}
              staticMap={false}
              initialZoom={8}
              mapPoints={points}
            />
          </div>

          {/* Filters Panel */}
          <div className={styles.filtersPanel}>
            <h3>Filtros del Mapa</h3>

            {/* Status Filters */}
            <div className={styles.filterGroup}>
              <h4>Estado de Sensores</h4>
              <div className={styles.statusFilters}>
                <label className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={filters.green}
                    onChange={() => handleFilterChange("green")}
                  />
                  <span
                    className={`${styles.statusIndicator} ${styles.green}`}
                  ></span>
                  Menos de 2 días ({greenPoints})
                </label>
                <label className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={filters.yellow}
                    onChange={() => handleFilterChange("yellow")}
                  />
                  <span
                    className={`${styles.statusIndicator} ${styles.yellow}`}
                  ></span>
                  Entre 2 y 4 días ({yellowPoints})
                </label>
                <label className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={filters.red}
                    onChange={() => handleFilterChange("red")}
                  />
                  <span
                    className={`${styles.statusIndicator} ${styles.red}`}
                  ></span>
                  Más de 12 días ({redPoints})
                </label>
              </div>
            </div>
          </div>
        </div>

        {/*Indicators Section */}
        <section className={styles.indicators}>
          <div className={styles.indicatorsHeader}>
            <h2>Indicadores rápidos</h2>
            <div className={styles.filters}>
              <button>Hoy</button>
              <button className={styles.activeFilter}>Últimos 7 días</button>
              <button>Este mes</button>
              <button>Personalizado</button>
            </div>
          </div>
          <div className={styles.cards}>
            <div className={`${styles.card} ${styles.activeCard}`}>
              <div className={styles.cardTitle}>⭕ Gateways activas</div>
              <div className={styles.cardValue}>15/15</div>
            </div>
            <div className={styles.card}>
              🔔 Consumo negativo
              <br />
              <strong>59</strong>
            </div>
            <div className={styles.card}>
              🔔 Consumo 0
              <br />
              <strong>201</strong>
            </div>
            <div className={styles.card}>
              🔔 Consumo continuado
              <br />
              <strong>39</strong>
            </div>
            <div className={styles.card}>
              🔔 Consumo excesivo
              <br />
              <strong>44</strong>
            </div>
            <div className={styles.card}>
              🔔 Boca de incendios
              <br />
              <strong>3</strong>
            </div>
          </div>
        </section>
      </main>

      {/* Station Info Popup */}
      {showPopup ? (
        <div className={styles.stationPopup}>
          <div
            className={styles.stationPopupOverlay}
            onClick={() => setShowPopup(false)}
          >
            <div
              className={styles.stationPopupContent}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.stationPopupHeader}>
                <h2 className={styles.stationPopupTitle}>
                  Detalle de la estación
                </h2>
                <button
                  className={styles.stationPopupClose}
                  onClick={() => {
                    setShowPopup(false);
                  }}
                >
                  ×
                </button>
              </div>

              <div className={styles.stationPopupMainContainer}>
                <div className={styles.stationPopupMapContainer}>
                  <h3 className={styles.stationPopupMapContainerTitle}>
                    Punto de la estación:
                  </h3>
                  <span className={styles.stationPopupMapContainerSubTitle}>
                    {selectedProperties.station!}
                  </span>
                  <div className={styles.stationPopupMapContainerMap}>
                    {selectedProperties?.gps &&
                    Array.isArray(selectedProperties.gps) ? (
                      <Mapbox
                        staticMap={true}
                        mapPoints={[selectedProperties]}
                        initialZoom={15}
                        center={[
                          selectedProperties.gps[0],
                          selectedProperties.gps[1],
                        ]}
                      />
                    ) : (
                      <span>Sin ubicación</span>
                    )}
                  </div>
                </div>

                <div className={styles.stationPopupInfoContainer}>
                  <h3 className={styles.stationPopupInfoTitle}>
                    Información general:
                  </h3>

                  {/* Fila 1 */}
                  <div className={styles.stationPopupInfoGrid}>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Código del contador:
                      </span>{" "}
                      {selectedProperties.serialNumber!}
                    </div>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Estación:
                      </span>{" "}
                      {selectedProperties.station!}
                    </div>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Póliza:
                      </span>{" "}
                      171469
                    </div>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Abonado:
                      </span>{" "}
                      GRIFOLL SERRA, ANNA M
                    </div>
                  </div>

                  {/* Fila 2 */}
                  <div className={styles.stationPopupInfoGrid}>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Tipo de uso:
                      </span>{" "}
                      DOMESTICA
                    </div>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Fecha de instalación:
                      </span>{" "}
                      {selectedProperties.installationDate!}
                    </div>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Marca:
                      </span>{" "}
                      {selectedProperties.brand!}
                    </div>
                    <div className={styles.stationPopupInfoItem}>
                      <span className={styles.stationPopupInfoLabel}>
                        Modelo:
                      </span>{" "}
                      {selectedProperties.model!}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
