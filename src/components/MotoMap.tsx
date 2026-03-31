import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ZoomIn } from 'lucide-react';

const DAMAGE_TYPES = ['Risco Leve', 'Risco Profundo', 'Amassado', 'Pintura', 'Trinca', 'Oxidação'];
const DAMAGE_COLORS: Record<string, string> = {
  'Risco Leve':     '#eab308',
  'Risco Profundo': '#f97316',
  'Amassado':       '#ef4444',
  'Pintura':        '#3b82f6',
  'Trinca':         '#dc2626',
  'Oxidação':       '#d97706',
};
const DAMAGE_BADGE: Record<string, string> = {
  'Risco Leve':     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Risco Profundo': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Amassado':       'bg-red-500/20 text-red-400 border-red-500/30',
  'Pintura':        'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Trinca':         'bg-red-700/20 text-red-500 border-red-700/30',
  'Oxidação':       'bg-amber-600/20 text-amber-500 border-amber-600/30',
};

export interface DamagePin {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  damage: string;
  label: string;
}

interface MotoMapProps {
  pins: DamagePin[];
  onChange: (pins: DamagePin[]) => void;
}

const MOTO_SVG = `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" fill="none">
  <!-- Rodas -->
  <circle cx="80" cy="170" r="38" stroke="#ff906d" stroke-width="3" fill="#1a1a1a"/>
  <circle cx="80" cy="170" r="22" stroke="#484847" stroke-width="2" fill="#0e0e0e"/>
  <circle cx="320" cy="170" r="38" stroke="#ff906d" stroke-width="3" fill="#1a1a1a"/>
  <circle cx="320" cy="170" r="22" stroke="#484847" stroke-width="2" fill="#0e0e0e"/>
  <!-- Suspensão dianteira -->
  <line x1="80" y1="132" x2="110" y2="95" stroke="#adaaaa" stroke-width="4" stroke-linecap="round"/>
  <line x1="90" y1="138" x2="118" y2="100" stroke="#adaaaa" stroke-width="3" stroke-linecap="round"/>
  <!-- Chassi principal -->
  <path d="M110 95 L150 70 L200 65 L260 72 L295 110 L320 132" stroke="#adaaaa" stroke-width="5" stroke-linecap="round" fill="none"/>
  <!-- Quadro inferior -->
  <path d="M110 95 L115 145 L200 150 L295 140 L320 132" stroke="#484847" stroke-width="3" stroke-linecap="round" fill="none"/>
  <!-- Motor -->
  <rect x="155" y="110" width="90" height="55" rx="8" fill="#20201f" stroke="#484847" stroke-width="2"/>
  <rect x="163" y="118" width="30" height="20" rx="4" fill="#2a2a2a" stroke="#484847" stroke-width="1"/>
  <rect x="207" y="118" width="30" height="20" rx="4" fill="#2a2a2a" stroke="#484847" stroke-width="1"/>
  <!-- Tanque -->
  <path d="M148 68 Q200 40 255 68 L260 95 L140 95 Z" fill="#20201f" stroke="#ff906d" stroke-width="2"/>
  <!-- Banco -->
  <path d="M200 63 Q240 55 285 70 L280 80 Q240 65 200 72 Z" fill="#2a2a2a" stroke="#484847" stroke-width="1.5"/>
  <!-- Carenagem frontal / farol -->
  <ellipse cx="100" cy="82" rx="18" ry="14" fill="#20201f" stroke="#1db1f1" stroke-width="2"/>
  <ellipse cx="100" cy="82" rx="9" ry="7" fill="#1db1f1" opacity="0.4"/>
  <!-- Guidão -->
  <line x1="118" y1="78" x2="148" y2="72" stroke="#adaaaa" stroke-width="4" stroke-linecap="round"/>
  <line x1="118" y1="74" x2="108" y2="66" stroke="#adaaaa" stroke-width="3" stroke-linecap="round"/>
  <line x1="108" y1="66" x2="90" y2="68" stroke="#adaaaa" stroke-width="3" stroke-linecap="round"/>
  <!-- Escapamento -->
  <path d="M200 155 Q230 162 290 158 Q310 156 325 148" stroke="#adaaaa" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M198 162 Q230 170 290 165 Q312 162 328 152" stroke="#484847" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <!-- Para-lama traseiro -->
  <path d="M280 100 Q310 105 325 130" stroke="#adaaaa" stroke-width="3" stroke-linecap="round" fill="none"/>
  <!-- Carenagem lateral -->
  <path d="M140 95 Q155 125 155 145 L200 150 L245 145 L245 110 L200 105 Z" fill="#1a1a1a" stroke="#484847" stroke-width="1.5" opacity="0.7"/>
  <!-- Para-choque / Lanterna traseira -->
  <rect x="288" y="98" width="16" height="10" rx="3" fill="#ef4444" opacity="0.7" stroke="#ef4444" stroke-width="1"/>
</svg>`;

export const MotoMap: React.FC<MotoMapProps> = ({ pins, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [selectedDamage, setSelectedDamage] = useState(DAMAGE_TYPES[0]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
  };

  const confirmPin = () => {
    if (!pendingPin) return;
    const newPin: DamagePin = {
      id: Date.now().toString(),
      x: pendingPin.x,
      y: pendingPin.y,
      damage: selectedDamage,
      label: selectedLabel || selectedDamage,
    };
    onChange([...pins, newPin]);
    setPendingPin(null);
    setSelectedLabel('');
  };

  const removePin = (id: string) => {
    onChange(pins.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Mapa */}
      <div
        ref={containerRef}
        onClick={handleMapClick}
        className="relative w-full rounded-2xl overflow-hidden border-2 border-[#282828] cursor-crosshair select-none"
        style={{ background: '#111111', paddingBottom: '55%' }}
      >
        {/* SVG da moto */}
        <div
          className="absolute inset-0 p-3"
          dangerouslySetInnerHTML={{ __html: MOTO_SVG }}
          style={{ pointerEvents: 'none' }}
        />

        {/* Pins existentes */}
        {pins.map((pin) => (
          <div
            key={pin.id}
            className="absolute z-10"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); removePin(pin.id); }}
              onMouseEnter={() => setTooltip(pin.id)}
              onMouseLeave={() => setTooltip(null)}
              className="relative group"
            >
              {/* Pulse ring */}
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-60"
                style={{ backgroundColor: DAMAGE_COLORS[pin.damage] }}
              />
              {/* Dot */}
              <span
                className="relative block w-4 h-4 rounded-full border-2 border-white/40 shadow-lg"
                style={{ backgroundColor: DAMAGE_COLORS[pin.damage] }}
              />
              {/* Tooltip */}
              <AnimatePresence>
                {tooltip === pin.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#000] text-white text-[10px] font-bold px-2 py-1 rounded-lg z-20 pointer-events-none"
                  >
                    {pin.label}
                    <span className="block text-center" style={{ color: DAMAGE_COLORS[pin.damage] }}>{pin.damage}</span>
                    <span className="block text-center text-[#adaaaa] text-[9px]">Toque para remover</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        ))}

        {/* Pending pin (onde o user tocou) */}
        {pendingPin && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            <span className="block w-5 h-5 rounded-full bg-white/80 border-2 border-[#ff906d] shadow-xl animate-pulse" />
          </div>
        )}

        {/* Hint */}
        {pins.length === 0 && !pendingPin && (
          <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
            <span className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full">
              Toque na moto para marcar um dano
            </span>
          </div>
        )}
      </div>

      {/* Painel de confirmação do pin */}
      <AnimatePresence>
        {pendingPin && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-[#1a1a1a] border border-[#ff906d]/40 rounded-2xl p-4 space-y-3"
          >
            <p className="text-[10px] font-bold text-[#ff906d] uppercase tracking-widest">Confirmar dano marcado</p>
            <div className="flex flex-wrap gap-2">
              {DAMAGE_TYPES.map(d => (
                <button
                  key={d}
                  onClick={(e) => { e.stopPropagation(); setSelectedDamage(d); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedDamage === d
                      ? DAMAGE_BADGE[d] + ' scale-105'
                      : 'bg-[#0e0e0e] text-[#adaaaa] border-[#282828]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Componente afetado (ex: Carenagem Lateral)"
              value={selectedLabel}
              onChange={e => setSelectedLabel(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2 text-sm text-white outline-none border border-[#282828] focus:border-[#ff906d] placeholder:text-[#484847]"
            />
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setPendingPin(null); }}
                className="flex-1 py-2 rounded-xl bg-[#282828] text-[#adaaaa] text-xs font-bold"
              >
                CANCELAR
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); confirmPin(); }}
                className="flex-1 py-2 rounded-xl bg-[#ff906d] text-[#000] text-xs font-bold"
              >
                CONFIRMAR
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de pins */}
      {pins.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest">{pins.length} dano(s) marcado(s)</p>
          <div className="flex flex-wrap gap-2">
            {pins.map(pin => (
              <span
                key={pin.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                  DAMAGE_BADGE[pin.damage] || 'bg-[#1a1a1a] text-white border-[#282828]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DAMAGE_COLORS[pin.damage] }} />
                {pin.label}
                <button onClick={() => removePin(pin.id)} className="ml-1 opacity-60 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
