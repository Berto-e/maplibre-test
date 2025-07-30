////////////////////////////////////////////////////////////////////////////////
// 🏢 MOCKUP PAGE - SIMPLE MAPLIBRE DEMO
////////////////////////////////////////////////////////////////////////////////
//
// Description : A simple and clean page to showcase MapLibre functionality
//
// Features    : • Clean minimal layout
//               • Map component integration
//               • Basic title and container
//
// Usage       : <MockupPage />
//
// Author      : Alberto Álvarez González
// Last Update : 2025
//
////////////////////////////////////////////////////////////////////////////////

import React from "react";
import Map from "../Mapbox/Map";

////////////////////////////////////////////////////////////////////////////////
// 📌 SECTION: MockupPage Component
////////////////////////////////////////////////////////////////////////////////

const MockupPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        padding: "2rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2rem",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "2rem",
            fontWeight: "600",
            color: "#1e293b",
          }}
        >
          Leipzig Map
        </h1>
        <p
          style={{
            margin: "0.5rem 0 0 0",
            color: "#64748b",
            fontSize: "1rem",
          }}
        ></p>
      </div>

      {/* Map Container */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
          maxWidth: "1300px",
          margin: "0 auto",
          height: "600px",
          position: "relative",
        }}
      >
        <Map />
      </div>
    </div>
  );
};

export default MockupPage;
