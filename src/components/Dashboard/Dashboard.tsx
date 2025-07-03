import styles from "./Dashboard.module.css";
import MapBox from "../Mapbox/Mapbox";
import { useMapContext } from "../../contexts/MapContext";

const Dashboard = () => {
  const { mapElements, filters, setFilters } = useMapContext();
  const greenPoints = mapElements.filter((p) => p.status === "green").length;
  const yellowPoints = mapElements.filter((p) => p.status === "yellow").length;
  const redPoints = mapElements.filter((p) => p.status === "red").length;

  // Función para manejar cambios en checkboxes
  const handleFilterChange = (color: "green" | "yellow" | "red") => {
    setFilters((prev) => ({
      ...prev,
      [color]: !prev[color],
    }));
  };

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
            <MapBox />
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
              <div className={styles.cardTitle}>🎧 Gateways activas</div>
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
    </div>
  );
};

export default Dashboard;
