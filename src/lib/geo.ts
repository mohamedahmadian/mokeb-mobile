export function hasValidCoords(
  latitude?: number | null,
  longitude?: number | null,
): latitude is number {
  return (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

export function buildMawkibLocationMapUrl(latitude: number, longitude: number) {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  return `geo:${lat},${lng}`;
}
