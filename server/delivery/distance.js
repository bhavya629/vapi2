const EARTH_RADIUS_KM = 6371.0088;
const radians = (degrees) => (degrees * Math.PI) / 180;

export function haversineDistanceKm(from, to) {
  const values = [
    from?.latitude,
    from?.longitude,
    to?.latitude,
    to?.longitude,
  ].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [lat1, lon1, lat2, lon2] = values;
  if (
    Math.abs(lat1) > 90 ||
    Math.abs(lat2) > 90 ||
    Math.abs(lon1) > 180 ||
    Math.abs(lon2) > 180
  )
    return null;
  const dLat = radians(lat2 - lat1),
    dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a)) * 100) / 100;
}
