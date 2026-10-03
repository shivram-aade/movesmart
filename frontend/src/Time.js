// clock time (HH:MM) from a time sent by the server
export const hm = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// delay in minutes -> [style, text]
export function status(delay) {
  if (delay >= 2) return ['late', `${delay} min late`];
  if (delay <= -2) return ['early', `${-delay} min early`];
  return ['ontime', 'On time'];
}

export const when = (min) => (min < 1 ? 'arriving now' : `in ${min} min`);