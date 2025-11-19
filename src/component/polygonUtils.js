/**
 * ตรวจสอบว่าเส้นสองเส้นตัดกันหรือไม่
 */
const doSegmentsIntersect = (p1, p2, p3, p4) => {
  const ccw = (A, B, C) => {
    return (
      (C.lat - A.lat) * (B.lon - A.lon) > (B.lat - A.lat) * (C.lon - A.lon)
    );
  };
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
};

/**
 * ตรวจสอบว่าจุดอยู่ภายใน polygon หรือไม่ (Ray casting algorithm)
 */
const isPointInPolygon = (point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon,
      yi = polygon[i].lat;
    const xj = polygon[j].lon,
      yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * นับจำนวนจุดตัดระหว่าง 2 shapes
 */
const countIntersectionPoints = (shape1, shape2) => {
  let count = 0;
  const shape1Length = shape1.length;

  for (let i = 0; i < shape1Length - 1; i++) {
    const p1 = shape1[i];
    const p2 = shape1[i + 1];

    for (let j = 0; j < shape2.length; j++) {
      const p3 = shape2[j];
      const p4 = shape2[(j + 1) % shape2.length];

      if (doSegmentsIntersect(p1, p2, p3, p4)) {
        count++;
      }
    }
  }
  return count;
};

/**
 * กรองจุดซ้ำออกจาก array
 */
const removeDuplicatePoints = (points) => {
  const uniquePoints = [];
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const isDuplicate = uniquePoints.some(
      (p) =>
        Math.abs(p.lon - point.lon) < 0.0000001 &&
        Math.abs(p.lat - point.lat) < 0.0000001
    );
    if (!isDuplicate) {
      uniquePoints.push(point);
    }
  }
  return uniquePoints;
};

/**
 * ตรวจสอบว่า Polyline ตัดผ่าน Polygon จริงๆ (เข้า-ออก ครบวงจร)
 */
const doesPolylineCrossThroughPolygon = (polyline, polygon) => {
  if (polyline.length < 2) return false;

  const firstPoint = polyline[0];
  const lastPoint = polyline[polyline.length - 1];

  const firstInside = isPointInPolygon(firstPoint, polygon);
  const lastInside = isPointInPolygon(lastPoint, polygon);

  console.log("🔍 จุดแรกของ Polyline อยู่ใน Polygon:", firstInside);
  console.log("🔍 จุดสุดท้ายของ Polyline อยู่ใน Polygon:", lastInside);

  // ถ้าจุดเริ่มต้นและจุดสุดท้ายอยู่ข้างนอกทั้งคู่ = ตัดผ่านจริง
  if (!firstInside && !lastInside) {
    const intersectionCount = countIntersectionPoints(polyline, polygon);
    console.log("🔍 จำนวนจุดตัดกับขอบ Polygon:", intersectionCount);
    return intersectionCount >= 2;
  }

  console.log(
    "❌ Polyline ไม่ได้ตัดผ่าน (จุดเริ่มต้นหรือจุดสุดท้ายอยู่ภายใน Polygon)"
  );
  return false;
};

/**
 * ตรวจสอบว่า 2 shapes ทับกันหรือไม่
 */
const doShapesOverlap = (shape1, shape2, isShape1Closed, isShape2Closed) => {
  // กรณี Polygon vs Polygon
  if (isShape1Closed && isShape2Closed) {
    const intersectionCount = countIntersectionPoints(shape1, shape2);
    console.log("🔍 จำนวนจุดตัด (Polygon vs Polygon):", intersectionCount);

    if (intersectionCount >= 2) {
      console.log("✅ Polygon ตัดกัน (มี", intersectionCount, "จุดตัด)");
      return true;
    }

    // เช็คว่ารูปหนึ่งอยู่ภายในอีกรูปทั้งหมด
    const shape1InShape2 = shape1.every((point) =>
      isPointInPolygon(point, shape2)
    );
    const shape2InShape1 = shape2.every((point) =>
      isPointInPolygon(point, shape1)
    );

    if (shape1InShape2) {
      console.log("✅ Polygon 1 อยู่ใน Polygon 2 ทั้งหมด");
      return true;
    }
    if (shape2InShape1) {
      console.log("✅ Polygon 2 อยู่ใน Polygon 1 ทั้งหมด");
      return true;
    }
  }

  // กรณี Polyline vs Polygon
  if (!isShape1Closed && isShape2Closed) {
    console.log("\n🔍 เช็ค Polyline vs Polygon");
    return doesPolylineCrossThroughPolygon(shape1, shape2);
  }

  if (isShape1Closed && !isShape2Closed) {
    console.log("\n🔍 เช็ค Polygon vs Polyline");
    return doesPolylineCrossThroughPolygon(shape2, shape1);
  }

  // กรณี Polyline vs Polyline
  if (!isShape1Closed && !isShape2Closed) {
    const intersectionCount = countIntersectionPoints(shape1, shape2);
    console.log("🔍 จำนวนจุดตัด (Polyline vs Polyline):", intersectionCount);

    if (intersectionCount >= 1) {
      console.log("✅ Polyline ตัดกัน");
      return true;
    }
  }

  console.log("❌ ไม่ถือว่าทับกัน");
  return false;
};

/**
 * @param {Object} mapInstance - Longdo Map instance
 * @returns {Object|null} - ข้อมูล 2 shapes ที่ทับกัน หรือ null ถ้าไม่พบ
 */
export const getIntersectingPolygons = (mapInstance) => {
  if (!mapInstance) {
    console.warn("⚠️ ไม่พบ map instance");
    return null;
  }

  try {
    const overlays = mapInstance.Overlays.list();

    // ฟังก์ชันตรวจสอบว่าเป็น Polygon หรือ Polyline
    const isPolygonOrPolyline = (overlay) => {
      const hasPolygonMethods = typeof overlay.contains === "function";
      const hasPolylineMethods = typeof overlay.pivot === "function";
      return hasPolygonMethods || hasPolylineMethods;
    };

    // ดึงข้อมูล shapes ทั้งหมด
    const shapes = overlays
      .filter((overlay) => {
        return (
          isPolygonOrPolyline(overlay) && typeof overlay.location === "function"
        );
      })
      .map((overlay) => {
        const locs = overlay.location();
        const hasContains = typeof overlay.contains === "function";
        const isClosed = hasContains;
        return { points: locs, isClosed: isClosed };
      })
      .filter((shape) => shape.points && shape.points.length >= 2);

    if (shapes.length < 2) {
      console.log("⚠️ ต้องมี Shape อย่างน้อย 2 ตัว");
      return null;
    }

    // หาคู่ที่ทับกัน
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        if (
          doShapesOverlap(
            shapes[i].points,
            shapes[j].points,
            shapes[i].isClosed,
            shapes[j].isClosed
          )
        ) {
          return {
            polygon1: shapes[i].points,
            polygon2: shapes[j].points,
            shape1IsClosed: shapes[i].isClosed,
            shape2IsClosed: shapes[j].isClosed,
            intersects: true,
          };
        }
      }
    }

    console.log("❌ ไม่พบ Shape ที่ทับกัน");
    return null;
  } catch (error) {
    console.error("❌ Error in getIntersectingPolygons:", error);
    return null;
  }
};

export {
  doSegmentsIntersect,
  isPointInPolygon,
  countIntersectionPoints,
  doesPolylineCrossThroughPolygon,
  doShapesOverlap,
  removeDuplicatePoints,
};
