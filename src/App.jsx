import React, { useEffect, useRef, useState } from "react";
import { getIntersectingPolygons } from "./component/polygonUtils";

function LongdoMap() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [longdo, setLongdo] = useState(null);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://api.longdo.com/map/?key=d6c0afb465f3e120f140e6c900e95d27";
    script.async = true;

    script.onload = () => {
      if (window.longdo && mapRef.current) {
        try {
          const mapInstance = new window.longdo.Map({
            placeholder: mapRef.current,
            language: "th",
          });

          console.log("✅ แผนที่โหลดสำเร็จ");

          setMap(mapInstance);
          setLongdo(window.longdo);

          setTimeout(() => {
            if (mapInstance.Ui && mapInstance.Ui.Measurement) {
              try {
                mapInstance.Ui.Measurement.tool("line");
                console.log("✅ เปิด Measurement tool อัตโนมัติสำเร็จ");
              } catch (e) {
                console.error("❌ Error เปิด Measurement:", e);
              }
            }
          }, 1000);

          mapInstance.Event.bind("overlayChange", () => {
            setTimeout(() => {
              const overlays = mapInstance.Overlays.list();

              overlays.forEach((overlay) => {
                try {
                  if (overlay.location) {
                    const locs = overlay.location();
                    setPoints(locs);

                    if (locs.length > 1) {
                      let dist = 0;

                      const calculateDistance = (point1, point2) => {
                        const R = 6371000;
                        const lat1 = (point1.lat * Math.PI) / 180;
                        const lat2 = (point2.lat * Math.PI) / 180;
                        const dLat =
                          ((point2.lat - point1.lat) * Math.PI) / 180;
                        const dLon =
                          ((point2.lon - point1.lon) * Math.PI) / 180;

                        const a =
                          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                          Math.cos(lat1) *
                            Math.cos(lat2) *
                            Math.sin(dLon / 2) *
                            Math.sin(dLon / 2);
                        const c =
                          2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                        return R * c;
                      };

                      for (let i = 0; i < locs.length - 1; i++) {
                        const d = calculateDistance(locs[i], locs[i + 1]);
                        dist += d;
                      }

                      if (typeof overlay.contains === "function") {
                        const d = calculateDistance(
                          locs[locs.length - 1],
                          locs[0]
                        );
                        dist += d;
                      }

                      setDistance(dist);
                    }
                  }
                } catch (e) {
                  console.error("❌ Error getting location:", e);
                }
              });
            }, 100);
          });
        } catch (error) {
          console.error("❌ Error initializing map:", error);
        }
      }
    };

    script.onerror = () => {
      console.error("❌ ไม่สามารถโหลด Longdo Map script ได้");
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const testIntersection = () => {
    const result = getIntersectingPolygons(map);

    if (result) {
      console.log("=== ✅ ผลลัพธ์: พบ Shape ที่ทับกัน ===");
      console.log(
        "Shape 1 (ปิดรูป:",
        result.shape1IsClosed,
        "):",
        result.polygon1
      );
      console.log(
        "Shape 2 (ปิดรูป:",
        result.shape2IsClosed,
        "):",
        result.polygon2
      );
      console.log("\n📄 JSON Format:");
      console.log(
        JSON.stringify(
          {
            polygon1: result.polygon1,
            polygon2: result.polygon2,
            shape1IsClosed: result.shape1IsClosed,
            shape2IsClosed: result.shape2IsClosed,
          },
          null,
          2
        )
      );

      alert("✅ พบ Shape ที่ทับกัน! ดูรายละเอียดใน Console");
    } else {
      console.log("❌ ไม่พบ Shape ที่ทับกัน");
      alert("❌ ไม่พบ Shape ที่ทับกัน");
    }
  };

  const clearAll = () => {
    if (map) {
      console.log("🗑️ ลบ overlays ทั้งหมด");
      map.Overlays.clear();
      setPoints([]);
      setDistance(0);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        ref={mapRef}
        className="map-container"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "500px",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "10px",
          background: "white",
          padding: "15px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          minWidth: "220px",
          color: "#000",
          zIndex: 1000,
        }}
      >
        <h3
          style={{
            margin: "0 0 15px 0",
            fontSize: "18px",
            color: "#000",
            fontWeight: "bold",
          }}
        >
          🗺️ Measurement Tool
        </h3>

        <div
          style={{
            marginBottom: "15px",
            padding: "10px",
            background: "#f8f9fa",
            borderRadius: "4px",
          }}
        >
          <p style={{ margin: "5px 0", color: "#000", fontSize: "14px" }}>
            <strong>จำนวนจุด:</strong> {points.length}
          </p>
          <p style={{ margin: "5px 0", color: "#000", fontSize: "14px" }}>
            <strong>ระยะทาง:</strong> {(distance / 1000).toFixed(3)} km
          </p>
          <p style={{ margin: "5px 0", color: "#666", fontSize: "12px" }}>
            ({distance.toFixed(2)} เมตร)
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
          <button
            onClick={testIntersection}
            style={{
              padding: "10px 12px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            🔍 ตรวจสอบ Shape ทับกัน
          </button>

          <button
            onClick={clearAll}
            style={{
              padding: "10px 12px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            🗑️ ลบทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0 }}>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <h2
          style={{
            margin: 0,
            padding: "20px",
            background: "#343a40",
            color: "white",
            fontSize: "24px",
            fontWeight: "700",
          }}
        >
          Longdo Map React - Polygon Intersection Detection
        </h2>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <LongdoMap />
        </div>
      </div>
    </div>
  );
}

export default App;
