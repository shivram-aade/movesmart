import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';

const COLORS = { low: '#19A974', medium: '#F5A524', high: '#E5484D' };
const DEFAULT_CENTER = [12.975, 77.595];
const BUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>';

// One icon per route (so the marker element is never recreated and can glide smoothly)
const icons = {};
const iconFor = (route) => icons[route] || (icons[route] = L.divIcon({
  className: 'bus-marker',
  html: `<div class="busm">${BUS_SVG}<b>${String(route).replace(/[^\w+-]/g, '')}</b></div>`,
  iconSize: [64, 30], iconAnchor: [32, 15],
}));

// Zoom to the buses (or the selected bus route) when the view changes, not on every refresh
function Fit({ points, fitKey }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [map, fitKey]);
  return null;
}

// While the map zooms, markers must not glide (they would lag behind the map)
function ZoomClass() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const on = () => el.classList.add('zooming');
    const off = () => el.classList.remove('zooming');
    map.on('zoomstart', on); map.on('zoomend', off);
    return () => { map.off('zoomstart', on); map.off('zoomend', off); };
  }, [map]);
  return null;
}

function BusMarker({ b, selected, onSelect }) {
  const ref = useRef(null);
  const apply = () => {
    const el = ref.current?.getElement();
    const body = el?.firstChild;
    if (!body) return;
    body.style.setProperty('--c', COLORS[b.crowd]);
    body.classList.toggle('sel', selected);
  };
  useEffect(apply, [b.crowd, selected]);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.getElement()?.classList.add('glide'), 400); // glide after first placement
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker ref={ref} position={[b.lat, b.lng]} icon={iconFor(b.route_number)} zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(b.bus_id), add: apply }}>
      <Tooltip direction="top" offset={[0, -14]}>{b.plate} · Route {b.route_number}</Tooltip>
    </Marker>
  );
}

export default function LiveMap({ buses, selectedId, onSelect, filtered, fitKey }) {
  const sel = buses.find((b) => b.bus_id === selectedId);
  const routes = {};
  buses.forEach((b) => { if (!routes[b.route_number]) routes[b.route_number] = b.stops; });
  const pts = sel
    ? sel.stops.map((s) => [s.lat, s.lng])
    : buses.filter((b) => b.lat != null).map((b) => [b.lat, b.lng]);
  const part = sel && filtered
    ? sel.stops.filter((s) => s.seq >= sel.from_seq && s.seq <= sel.to_seq).map((s) => [s.lat, s.lng]) : null;

  return (
    <>
      <MapContainer center={DEFAULT_CENTER} zoom={13} className="map tall">
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <Fit points={pts} fitKey={fitKey} />
        <ZoomClass />
        {Object.entries(routes).map(([n, st]) => (
          <Polyline key={n} positions={st.map((s) => [s.lat, s.lng])} pathOptions={{ color: '#B8C2D6', weight: 3 }} />
        ))}
        {sel && <Polyline positions={sel.stops.map((s) => [s.lat, s.lng])} pathOptions={{ color: '#6C7BA6', weight: 5 }} />}
        {part && <Polyline positions={part} pathOptions={{ color: '#19C6A1', weight: 7 }} />}
        {sel && sel.stops.map((s) => {
          const role = filtered ? (s.seq === sel.from_seq ? 'Board: ' : s.seq === sel.to_seq ? 'Get off: ' : '') : '';
          return (
            <CircleMarker key={s.id} center={[s.lat, s.lng]} radius={role ? 9 : 5}
              pathOptions={{ color: role ? '#101B3D' : '#6B7899', weight: 3, fillColor: '#fff', fillOpacity: 1 }}>
              <Tooltip permanent={!!role} direction="top">{role}{s.name}</Tooltip>
            </CircleMarker>
          );
        })}
        {buses.filter((b) => b.lat != null).map((b) => (
          <BusMarker key={b.bus_id} b={b} selected={b.bus_id === selectedId} onSelect={onSelect} />
        ))}
      </MapContainer>
      <div className="legend">
        <span><i className="low" />Low crowd</span><span><i className="medium" />Medium crowd</span><span><i className="high" />High crowd</span>
        <span className="live">● moving live</span>
      </div>
    </>
  );
}
