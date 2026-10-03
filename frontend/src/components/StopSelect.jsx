import { useEffect, useRef, useState } from 'react';

// Dropdown of all stops. Click the box or the arrow to open the list, or type to search.
export default function StopSelect({ label, placeholder, stops, value, onChange }) {
  const sel = stops.find((s) => String(s.id) === String(value));
  const [text, setText] = useState(sel?.name || '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    if (sel) setText(sel.name);
    else if (!value && !open) setText('');
  }, [sel?.id, value]);
  useEffect(() => {
    const away = (e) => { if (!box.current?.contains(e.target)) { setOpen(false); setText(sel?.name || ''); } };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [sel]);

  const filtering = open && text !== (sel?.name || '');
  const q = text.trim().toLowerCase();
  const list = filtering ? stops.filter((s) => s.name.toLowerCase().includes(q)) : stops;

  const pick = (s) => { onChange(String(s.id)); setText(s.name); setOpen(false); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && open && list[hi]) { e.preventDefault(); pick(list[hi]); }
    else if (e.key === 'Escape') { setOpen(false); setText(sel?.name || ''); }
  };

  return (
    <div className="combo" ref={box}>
      <label>{label}
        <div className="inwrap">
          <input ref={input} value={text} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open}
            onFocus={(e) => { setOpen(true); e.target.select(); }}
            onClick={() => setOpen(true)}
            onChange={(e) => { setText(e.target.value); setOpen(true); setHi(0); if (value) onChange(''); }}
            onKeyDown={onKey} />
          <button type="button" className="caret" tabIndex={-1} aria-label="Show all stops"
            onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); input.current?.focus(); }}>▾</button>
        </div>
      </label>
      {open && (
        <ul className="opts" role="listbox">
          {stops.length === 0 && <li className="none">Stops could not be loaded. Start the backend (cd backend, then npm run dev), then refresh this page.</li>}
          {stops.length > 0 && list.length === 0 && <li className="none">No stop found</li>}
          {list.map((s, i) => (
            <li key={s.id} role="option" aria-selected={s.id === sel?.id} className={i === hi ? 'hi' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}>{s.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
