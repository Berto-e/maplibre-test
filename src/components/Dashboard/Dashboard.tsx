import { useEffect, useState } from "react";
import { useMapContext, type MapElement } from "../../contexts/MapContext";
import styles from "./Dashboard.module.css";
import Mapbox from "../Mapbox";

const Dashboard = () => {
  const { mapElements, setSelectedElement } = useMapContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapElement[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  /* Functions */
  const filterMapElements = (query: string) => {
    if (!query.trim()) return [];

    return mapElements
      .filter((element) =>
        element.name?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedIndex(-1);
  };

  const renderDropdown = () => {
    if (!showDropdown || suggestions.length === 0) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          border: "1px solid #ccc",
          borderTop: "none",
          borderRadius: "0 0 5px 5px",
          zIndex: 1000,
          maxHeight: "200px",
          overflowY: "auto",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {suggestions.map((element, index) => (
          <div
            key={index}
            onClick={() => selectSuggestion(element)}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              backgroundColor: selectedIndex === index ? "#f0f0f0" : "#fff",
              borderBottom:
                index < suggestions.length - 1 ? "1px solid #eee" : "none",
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div style={{ fontWeight: "bold" }}>{element.name}</div>
          </div>
        ))}
      </div>
    );
  };

  const selectSuggestion = (element: any) => {
    setSearchQuery(element.name);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const onSubmit = () => {
    if (searchQuery.trim() === "") return;
    const filtered = filterMapElements(searchQuery);
    if (filtered.length > 0) {
      selectSuggestion(filtered[0]);
      setSelectedElement?.(filtered[0]);
    } else {
      alert("No se encontraron resultados");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex]);
          setSelectedElement?.(suggestions[selectedIndex]);
          setSearchQuery("");
          setShowDropdown(false);
          setSelectedIndex(-1);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  /*useEffects */
  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = filterMapElements(searchQuery);
      setSuggestions(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [searchQuery, mapElements]);

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
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() =>
                searchQuery && setShowDropdown(suggestions.length > 0)
              }
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              style={{
                width: "160px",
                borderRadius: showDropdown ? "5px 5px 0 0" : "5px",
                border: "1px solid #000000",
                padding: "6px 10px",
              }}
            />
            {renderDropdown()}
          </div>
          <button
            onClick={onSubmit}
            style={{
              padding: "6px 16px",
              borderRadius: "5px",
              border: "none",
              background: "#1976d2",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Buscar
          </button>
        </div>

        {/*Mapbox */}
        <div className={styles.mapContainer}>
          <Mapbox />
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
