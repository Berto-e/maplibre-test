import { useEffect, useState } from "react";
import Mapbox from "./components/Mapbox";
import { useMapContext } from "./contexts/MapContext";
import { type MapElement } from "./contexts/MapContext";
const App = () => {
  const { mapElements, setSelectedElement } = useMapContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapElement[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

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
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: "80px",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
          <img
            src="/images/logo-zwater.png"
            alt="ZWATER Logo"
            style={{ height: "40px" }}
          />
          <h1 style={{ margin: 0 }}>MAPLIBRE</h1>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "8px",
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
      </div>
      <div style={{ flex: 1 }}>
        <Mapbox />
      </div>
    </div>
  );
};

export default App;
