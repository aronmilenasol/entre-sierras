export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = (lat2 - lat1) * Math.PI / 180;
  const longitudeDelta = (lon2 - lon1) * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
