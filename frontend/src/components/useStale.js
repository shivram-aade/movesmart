import { useEffect, useRef, useState } from 'react';

// True when bus positions have not changed for ~12 seconds (usually: the simulator is not running)
export default function useStale(list) {
  const last = useRef('');
  const same = useRef(0);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (!list || !list.length) return;
    const sig = list.map((b) => `${b.bus_id}:${b.lat}:${b.lng}`).join('|');
    if (sig === last.current) same.current += 1; else { same.current = 0; last.current = sig; }
    setStale(same.current >= 3);
  }, [list]);
  return stale;
}
