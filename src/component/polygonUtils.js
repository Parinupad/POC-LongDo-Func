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
 * เลื่อน Shape ไปทางขวา (เพิ่มค่า longitude)
 * @param {Array} points
 * @param {number} offsetMeters
 * @returns {Array}
 */
const shiftShapeRight = (points, offsetMeters = 1000) => {
  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const metersPerDegree = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const offsetDegrees = offsetMeters / metersPerDegree;

  return points.map((point) => ({
    lon: point.lon + offsetDegrees,
    lat: point.lat,
  }));
};

/**
 * สร้าง Shapes ใหม่จากผลลัพธ์การตรวจสอบ
 * @param {Object} intersectionResult
 * @param {number} offsetMeters
 * @returns {Object}
 */
const createShiftedShapes = (intersectionResult, offsetMeters = 1000) => {
  if (!intersectionResult) {
    console.warn("⚠️ ไม่มีข้อมูล intersection result");
    return null;
  }

  const shiftedPolygon1 = shiftShapeRight(
    intersectionResult.polygon1,
    offsetMeters
  );
  const shiftedPolygon2 = shiftShapeRight(
    intersectionResult.polygon2,
    offsetMeters
  );

  return {
    polygon1: shiftedPolygon1,
    polygon2: shiftedPolygon2,
    shape1IsClosed: intersectionResult.shape1IsClosed,
    shape2IsClosed: intersectionResult.shape2IsClosed,
  };
};

/**
 * หาจุดตัดระหว่างเส้นสองเส้น
 */
const getLineIntersection = (p1, p2, p3, p4) => {
  const x1 = p1.lon,
    y1 = p1.lat;
  const x2 = p2.lon,
    y2 = p2.lat;
  const x3 = p3.lon,
    y3 = p3.lat;
  const x4 = p4.lon,
    y4 = p4.lat;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.0000001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      lon: x1 + t * (x2 - x1),
      lat: y1 + t * (y2 - y1),
    };
  }
  return null;
};

/**
 * หาจุดตัดทั้งหมดระหว่าง Polyline และ Polygon
 */
const findAllIntersectionPoints = (polyline, polygon) => {
  const intersections = [];

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];

    for (let j = 0; j < polygon.length; j++) {
      const p3 = polygon[j];
      const p4 = polygon[(j + 1) % polygon.length];

      const intersection = getLineIntersection(p1, p2, p3, p4);
      if (intersection) {
        intersections.push({
          point: intersection,
          polylineSegment: i,
          polygonSegment: j,
        });
      }
    }
  }

  return intersections;
};

/**
 * แบ่ง Polygon ออกเป็น 2 ส่วนตาม Polyline
 */
const splitPolygonByPolyline = (polygon, polyline) => {
  const intersections = findAllIntersectionPoints(polyline, polygon);

  if (intersections.length < 2) {
    console.log("⚠️ ต้องมีจุดตัดอย่างน้อย 2 จุด");
    return null;
  }

  console.log("🔍 พบจุดตัด:", intersections.length, "จุด");

  // เรียงจุดตัดตามลำดับบน polygon
  intersections.sort((a, b) => a.polygonSegment - b.polygonSegment);

  const firstIntersection = intersections[0];
  const lastIntersection = intersections[intersections.length - 1];

  // สร้าง Polygon ส่วนที่ 1
  const polygon1 = [];

  // เพิ่มจุดตัดแรก
  polygon1.push(firstIntersection.point);

  // เพิ่มจุดของ polyline ระหว่างจุดตัด
  for (
    let i = firstIntersection.polylineSegment + 1;
    i <= lastIntersection.polylineSegment;
    i++
  ) {
    if (i < polyline.length) {
      polygon1.push(polyline[i]);
    }
  }

  // เพิ่มจุดตัดสุดท้าย
  polygon1.push(lastIntersection.point);

  // เพิ่มจุดของ polygon จากจุดตัดสุดท้ายไปจุดตัดแรก (ทางด้านหนึ่ง)
  for (
    let i = lastIntersection.polygonSegment + 1;
    i !== firstIntersection.polygonSegment + 1;
    i = (i + 1) % polygon.length
  ) {
    polygon1.push(polygon[i]);
    if (i === firstIntersection.polygonSegment) break;
  }

  // สร้าง Polygon ส่วนที่ 2
  const polygon2 = [];

  // เพิ่มจุดตัดแรก
  polygon2.push(firstIntersection.point);

  // เพิ่มจุดของ polygon ทางด้านอีกด้าน
  for (
    let i = firstIntersection.polygonSegment + 1;
    i !== lastIntersection.polygonSegment + 1;
    i = (i + 1) % polygon.length
  ) {
    polygon2.push(polygon[i]);
    if (polygon2.length > polygon.length) break;
  }

  // เพิ่มจุดตัดสุดท้าย
  polygon2.push(lastIntersection.point);

  // เพิ่มจุดของ polyline กลับไปจุดตัดแรก
  for (
    let i = lastIntersection.polylineSegment;
    i >= firstIntersection.polylineSegment + 1;
    i--
  ) {
    if (i < polyline.length) {
      polygon2.push(polyline[i]);
    }
  }

  return {
    polygon1: removeDuplicatePoints(polygon1),
    polygon2: removeDuplicatePoints(polygon2),
    intersectionPoints: intersections.map((i) => i.point),
  };
};

/**
 * @param {Object} mapInstance
 * @returns {Object|null}
 */
const getIntersectingPolygons = (mapInstance) => {
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

/**
 *
 * @param {Array} polygon1
 * @param {Array} polygon2
 * @param {number} gapMeters
 * @returns {Object}
 */
const separatePolygons = (polygon1, polygon2, gapMeters = 500) => {
  const getCentroid = (polygon) => {
    const sumLat = polygon.reduce((sum, p) => sum + p.lat, 0);
    const sumLon = polygon.reduce((sum, p) => sum + p.lon, 0);
    return {
      lat: sumLat / polygon.length,
      lon: sumLon / polygon.length,
    };
  };

  const centroid1 = getCentroid(polygon1);
  const centroid2 = getCentroid(polygon2);

  // คำนวณทิศทางระหว่างจุดศูนย์กลาง
  const deltaLat = centroid2.lat - centroid1.lat;
  const deltaLon = centroid2.lon - centroid1.lon;
  const distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
  const dirLat = deltaLat / distance;
  const dirLon = deltaLon / distance;
  const avgLat = (centroid1.lat + centroid2.lat) / 2;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos((avgLat * Math.PI) / 180);
  const offsetLat = ((gapMeters / 2) * dirLat) / metersPerDegreeLat;
  const offsetLon = ((gapMeters / 2) * dirLon) / metersPerDegreeLon;

  // เลื่อน Polygon 1 ไปทางหนึ่ง
  const shiftedPolygon1 = polygon1.map((point) => ({
    lat: point.lat - offsetLat,
    lon: point.lon - offsetLon,
  }));

  // เลื่อน Polygon 2 ไปอีกทาง
  const shiftedPolygon2 = polygon2.map((point) => ({
    lat: point.lat + offsetLat,
    lon: point.lon + offsetLon,
  }));

  return {
    polygon1: shiftedPolygon1,
    polygon2: shiftedPolygon2,
  };
};

export {
  doSegmentsIntersect,
  isPointInPolygon,
  countIntersectionPoints,
  doesPolylineCrossThroughPolygon,
  doShapesOverlap,
  removeDuplicatePoints,
  shiftShapeRight,
  createShiftedShapes,
  getIntersectingPolygons,
  getLineIntersection,
  findAllIntersectionPoints,
  splitPolygonByPolyline,
  separatePolygons,
};
