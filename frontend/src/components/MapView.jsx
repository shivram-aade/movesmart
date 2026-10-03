import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';

const COLORS = { low: '#19A974', medium: '#F5A524', high: '#E5484D' };

// Zoom to the whole route once per route, so live updates don't keep resetting the view
function Fit({ points, routeKey }) {
  const map = useMap();
  useEffect(() => { map.fitBounds(points, { padding: [40, 40] }); }, [map, routeKey]);
  return null;
}

export default function MapView({ trip }) {
  const line = trip.stops.map((s) => [s.lat, s.lng]);
  const part = trip.stops.filter((s) => s.seq >= trip.from_seq && s.seq <= trip.to_seq).map((s) => [s.lat, s.lng]);
  const color = COLORS[trip.crowd];

  return (
    <MapContainer center={line[0]} zoom={13} className="map">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <Fit points={line} routeKey={trip.route_number} />
      <Polyline positions={line} pathOptions={{ color: '#B8C2D6', weight: 5 }} />
      <Polyline positions={part} pathOptions={{ color: '#19C6A1', weight: 6 }} />
      {trip.stops.map((s) => {
        const role = s.seq === trip.from_seq ? 'Board: ' : s.seq === trip.to_seq ? 'Get off: ' : '';
        return (
          <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={role ? 9 : 5}
            pathOptions={{ color: role ? '#101B3D' : '#6B7899', weight: 3, fillColor: s.seq === trip.to_seq ? '#101B3D' : '#fff', fillOpacity: 1 }}>
            <Tooltip permanent={!!role} direction="top">{role}{s.name}</Tooltip>
          </CircleMarker>
        );
      })}
      <CircleMarker center={[trip.lat, trip.lng]} radius={20} pathOptions={{ stroke: false, fillColor: color, fillOpacity: 0.25 }} />
      <CircleMarker center={[trip.lat, trip.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 }}>
        <Tooltip permanent direction="bottom">{trip.plate}</Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
