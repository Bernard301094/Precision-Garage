import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Tipos de daño ───────────────────────────────────────────────────────────
const DAMAGE_TYPES = [
  'Risco Leve',
  'Risco Profundo',
  'Amassado',
  'Pintura',
  'Trinca',
  'Oxidação',
] as const;
type DamageType = typeof DAMAGE_TYPES[number];

const DAMAGE_META: Record<DamageType, { color: string; ring: string; badge: string; dot: string }> = {
  'Risco Leve':     { color: '#eab308', ring: 'rgba(234,179,8,0.3)',  badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  'Risco Profundo': { color: '#f97316', ring: 'rgba(249,115,22,0.3)', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  'Amassado':       { color: '#ef4444', ring: 'rgba(239,68,68,0.3)',  badge: 'bg-red-500/15 text-red-400 border-red-500/30',    dot: 'bg-red-400' },
  'Pintura':        { color: '#3b82f6', ring: 'rgba(59,130,246,0.3)', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   dot: 'bg-blue-400' },
  'Trinca':         { color: '#a855f7', ring: 'rgba(168,85,247,0.3)', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  'Oxidação':       { color: '#d97706', ring: 'rgba(217,119,6,0.3)',  badge: 'bg-amber-600/15 text-amber-500 border-amber-600/30', dot: 'bg-amber-500' },
};

// ─── Zonas da moto ────────────────────────────────────────────────────────────
const MOTO_ZONES: { id: string; label: string; cx: number; cy: number }[] = [
  { id: 'farol',        label: 'Farol',               cx: 12,  cy: 38 },
  { id: 'carenagem_f',  label: 'Carenagem Frontal',   cx: 20,  cy: 52 },
  { id: 'guidao',       label: 'Guidão',              cx: 26,  cy: 30 },
  { id: 'tanque',       label: 'Tanque',              cx: 50,  cy: 28 },
  { id: 'banco',        label: 'Banco',               cx: 66,  cy: 32 },
  { id: 'carenagem_l',  label: 'Carenagem Lateral',   cx: 50,  cy: 62 },
  { id: 'motor',        label: 'Motor',               cx: 50,  cy: 78 },
  { id: 'escapamento',  label: 'Escapamento',         cx: 66,  cy: 82 },
  { id: 'para_lama_t',  label: 'Para-lama Traseiro',  cx: 80,  cy: 48 },
  { id: 'lanterna',     label: 'Lanterna Traseira',   cx: 88,  cy: 53 },
  { id: 'pneu_d',       label: 'Pneu Dianteiro',      cx: 18,  cy: 88 },
  { id: 'pneu_t',       label: 'Pneu Traseiro',       cx: 82,  cy: 88 },
  { id: 'suspensao_d',  label: 'Suspensão Dianteira', cx: 22,  cy: 62 },
  { id: 'suspensao_t',  label: 'Suspensão Traseira',  cx: 78,  cy: 62 },
  { id: 'para_lama_d',  label: 'Para-lama Dianteiro', cx: 14,  cy: 62 },
];

// ─── Interface pública ────────────────────────────────────────────────────────
export interface DamagePin {
  id: string;
  x: number;
  y: number;
  damage: DamageType;
  label: string;
  zoneId?: string;
  number: number;
}

interface MotoMapProps {
  pins: DamagePin[];
  onChange: (pins: DamagePin[]) => void;
}

// ─── SVG da moto (naked sport, vista lateral, alta fidelidade) ────────────────
const MotoSVG = () => (
  <svg
    viewBox="0 0 520 280"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    fill="none"
  >
    <defs>
      <radialGradient id="wheel_grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#2a2a2a" />
        <stop offset="100%" stopColor="#111" />
      </radialGradient>
      <radialGradient id="tank_grad" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#2e2e2e" />
        <stop offset="100%" stopColor="#161616" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <linearGradient id="exhaust_grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#555" />
        <stop offset="100%" stopColor="#888" />
      </linearGradient>
    </defs>

    {/* ── Roda traseira ── */}
    <circle cx="400" cy="210" r="62" fill="url(#wheel_grad)" stroke="#ff906d" strokeWidth="3.5" />
    <circle cx="400" cy="210" r="44" fill="none" stroke="#333" strokeWidth="1.5" />
    <circle cx="400" cy="210" r="14" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
    {/* raios */}
    {[0,45,90,135,180,225,270,315].map(a => (
      <line key={a}
        x1={400 + 16 * Math.cos(a * Math.PI/180)}
        y1={210 + 16 * Math.sin(a * Math.PI/180)}
        x2={400 + 42 * Math.cos(a * Math.PI/180)}
        y2={210 + 42 * Math.sin(a * Math.PI/180)}
        stroke="#444" strokeWidth="1.5" strokeLinecap="round"
      />
    ))}
    {/* pneu traseiro */}
    <circle cx="400" cy="210" r="62" fill="none" stroke="#222" strokeWidth="10" />
    <circle cx="400" cy="210" r="62" fill="none" stroke="#333" strokeWidth="3" strokeDasharray="8 6" />

    {/* ── Roda dianteira ── */}
    <circle cx="100" cy="210" r="60" fill="url(#wheel_grad)" stroke="#ff906d" strokeWidth="3.5" />
    <circle cx="100" cy="210" r="43" fill="none" stroke="#333" strokeWidth="1.5" />
    <circle cx="100" cy="210" r="13" fill="#1a1a1a" stroke="#555" strokeWidth="2" />
    {[0,45,90,135,180,225,270,315].map(a => (
      <line key={a}
        x1={100 + 15 * Math.cos(a * Math.PI/180)}
        y1={210 + 15 * Math.sin(a * Math.PI/180)}
        x2={100 + 41 * Math.cos(a * Math.PI/180)}
        y2={210 + 41 * Math.sin(a * Math.PI/180)}
        stroke="#444" strokeWidth="1.5" strokeLinecap="round"
      />
    ))}
    <circle cx="100" cy="210" r="60" fill="none" stroke="#222" strokeWidth="10" />
    <circle cx="100" cy="210" r="60" fill="none" stroke="#333" strokeWidth="3" strokeDasharray="8 6" />

    {/* ── Suspensão dianteira (duplo tubo) ── */}
    <line x1="96"  y1="150" x2="126" y2="96" stroke="#888" strokeWidth="6" strokeLinecap="round" />
    <line x1="108" y1="153" x2="138" y2="100" stroke="#666" strokeWidth="4.5" strokeLinecap="round" />
    {/* detalhe mola */}
    <line x1="100" y1="140" x2="129" y2="108" stroke="#aaa" strokeWidth="1" strokeDasharray="3 3" />
    {/* eixo */}
    <line x1="94"  y1="152" x2="112" y2="155" stroke="#555" strokeWidth="3" strokeLinecap="round" />

    {/* ── Suspensão traseira / mono ── */}
    <line x1="368" y1="148" x2="350" y2="185" stroke="#888" strokeWidth="5" strokeLinecap="round" />
    <line x1="380" y1="150" x2="362" y2="188" stroke="#666" strokeWidth="3.5" strokeLinecap="round" />
    <ellipse cx="358" cy="165" rx="5" ry="12" fill="#444" stroke="#666" strokeWidth="1" transform="rotate(-20,358,165)" />

    {/* ── Chassi principal (backbone) ── */}
    <path
      d="M130 95 C145 75 170 62 210 58 C245 54 280 58 310 68 C335 76 355 92 372 118 L400 148"
      stroke="#aaa" strokeWidth="6" strokeLinecap="round" fill="none"
    />
    {/* Chassi inferior */}
    <path
      d="M130 95 L135 160 C145 178 175 185 220 186 C270 187 330 182 370 168 L400 148"
      stroke="#555" strokeWidth="4" strokeLinecap="round" fill="none"
    />
    {/* Cinto diagonal */}
    <line x1="210" y1="58"  x2="215" y2="186" stroke="#444" strokeWidth="3" strokeLinecap="round" />
    <line x1="310" y1="68"  x2="318" y2="180" stroke="#444" strokeWidth="3" strokeLinecap="round" />

    {/* ── Subquadro traseiro ── */}
    <path d="M310 68 L330 52 L380 60 L390 80 L372 118" stroke="#666" strokeWidth="3.5" strokeLinecap="round" fill="none" />

    {/* ── Motor (detalhado) ── */}
    <rect x="190" y="130" width="130" height="72" rx="10" fill="#1c1c1c" stroke="#444" strokeWidth="2" />
    {/* cilindros */}
    <rect x="200" y="118" width="36" height="30" rx="5" fill="#252525" stroke="#555" strokeWidth="1.5" />
    <rect x="244" y="118" width="36" height="30" rx="5" fill="#252525" stroke="#555" strokeWidth="1.5" />
    <rect x="288" y="120" width="28" height="26" rx="4" fill="#222" stroke="#555" strokeWidth="1.5" />
    {/* cárter */}
    <path d="M190 202 Q195 215 210 218 L310 218 Q322 215 320 202 Z" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
    {/* detalhe nervuras */}
    {[205,220,235,250,265,280,295,308].map(x => (
      <line key={x} x1={x} y1="130" x2={x} y2="200" stroke="#2a2a2a" strokeWidth="1" />
    ))}
    {/* tampa lateral */}
    <ellipse cx="185" cy="166" rx="12" ry="18" fill="#222" stroke="#444" strokeWidth="1.5" />
    <ellipse cx="322" cy="166" rx="10" ry="15" fill="#222" stroke="#444" strokeWidth="1.5" />

    {/* ── Tanque de combustível ── */}
    <path
      d="M175 60 C188 38 230 28 265 30 C300 32 328 46 335 65 L330 92 L170 92 Z"
      fill="url(#tank_grad)" stroke="#ff906d" strokeWidth="2.5"
    />
    {/* reflexo tanque */}
    <path d="M190 52 Q225 38 265 42" stroke="rgba(255,255,255,0.08)" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* tampa combustível */}
    <ellipse cx="248" cy="34" rx="14" ry="7" fill="#2a2a2a" stroke="#666" strokeWidth="1.5" />

    {/* ── Banco ── */}
    <path
      d="M268 58 C290 50 330 52 370 62 C380 66 382 72 380 78 C360 72 318 68 275 72 Z"
      fill="#1e1e1e" stroke="#555" strokeWidth="1.5"
    />
    {/* costura banco */}
    <path d="M275 68 C310 64 348 66 372 72" stroke="#333" strokeWidth="1" strokeDasharray="4 3" fill="none" />

    {/* ── Carenagem / Defletor ── */}
    <path
      d="M170 92 C165 110 168 148 172 170 L220 185 L320 185 L330 160 L330 92 Z"
      fill="#181818" stroke="#3a3a3a" strokeWidth="1.5" opacity="0.85"
    />
    {/* painel lateral detalhe */}
    <path d="M175 120 Q200 115 225 118 L225 165 L175 162 Z" fill="#1e1e1e" stroke="#ff906d" strokeWidth="1" opacity="0.5" />

    {/* ── Escape / Silencioso ── */}
    <path
      d="M320 185 Q350 190 390 180 Q415 172 430 160"
      stroke="url(#exhaust_grad)" strokeWidth="9" strokeLinecap="round" fill="none"
    />
    <path
      d="M320 185 Q350 196 390 188 Q416 180 432 166"
      stroke="#444" strokeWidth="5" strokeLinecap="round" fill="none"
    />
    {/* ponta do escape */}
    <ellipse cx="433" cy="163" rx="7" ry="10" fill="#555" stroke="#777" strokeWidth="1.5" transform="rotate(-30,433,163)" />
    {/* abraçadeiras */}
    {[335,360,385,408].map(x => (
      <line key={x} x1={x} y1={185 - (x-320)*0.06} x2={x} y2={192 - (x-320)*0.06}
        stroke="#666" strokeWidth="3" strokeLinecap="round" />
    ))}

    {/* ── Para-lama traseiro ── */}
    <path d="M358 100 C372 104 390 118 400 148" stroke="#777" strokeWidth="4" strokeLinecap="round" fill="none" />
    <path d="M362 104 C376 106 395 122 402 148" stroke="#444" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* ── Lanterna traseira ── */}
    <rect x="383" y="90" width="22" height="12" rx="3" fill="#ef4444" stroke="#ef4444" strokeWidth="1" opacity="0.85" filter="url(#glow)" />
    <rect x="385" y="92" width="8" height="8" rx="1.5" fill="#fca5a5" opacity="0.6" />

    {/* ── Guidão ── */}
    <line x1="136" y1="76" x2="172" y2="68" stroke="#999" strokeWidth="5" strokeLinecap="round" />
    {/* coluna direção */}
    <line x1="136" y1="76" x2="122" y2="62" stroke="#888" strokeWidth="4" strokeLinecap="round" />
    <line x1="122" y1="62" x2="104" y2="64" stroke="#888" strokeWidth="3.5" strokeLinecap="round" />
    {/* punho */}
    <rect x="168" y="65" width="16" height="6" rx="3" fill="#333" stroke="#666" strokeWidth="1" />
    <rect x="88"  y="61" width="16" height="6" rx="3" fill="#333" stroke="#666" strokeWidth="1" />
    {/* espelho */}
    <line x1="170" y1="65" x2="178" y2="56" stroke="#666" strokeWidth="1.5" />
    <ellipse cx="180" cy="54" rx="5" ry="3.5" fill="#1db1f1" stroke="#333" strokeWidth="1" opacity="0.7" />

    {/* ── Painel / Instrumento ── */}
    <rect x="148" y="64" width="22" height="14" rx="4" fill="#111" stroke="#444" strokeWidth="1.5" />
    <circle cx="155" cy="71" r="4" fill="none" stroke="#ff906d" strokeWidth="1" />
    <circle cx="163" cy="71" r="4" fill="none" stroke="#1db1f1" strokeWidth="1" />

    {/* ── Carenagem frontal / Farol ── */}
    <path
      d="M88 66 C80 70 72 76 68 84 C64 92 66 102 72 108 C80 116 95 118 108 112 C118 107 126 96 124 84 C122 74 116 66 108 62 Z"
      fill="#181818" stroke="#555" strokeWidth="2"
    />
    {/* farol LED */}
    <ellipse cx="80" cy="88" rx="11" ry="9" fill="#0a1520" stroke="#1db1f1" strokeWidth="2" filter="url(#glow)" />
    <ellipse cx="80" cy="88" rx="6"  ry="5"  fill="#1db1f1" opacity="0.5" />
    {/* DRL */}
    <path d="M70 100 Q80 104 92 100" stroke="#1db1f1" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />

    {/* ── Para-lama dianteiro ── */}
    <path d="M70 152 Q80 158 112 155" stroke="#666" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M68 158 Q80 165 114 160" stroke="#444" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* ── Estibo / Pedaleira ── */}
    <line x1="220" y1="202" x2="200" y2="218" stroke="#555" strokeWidth="3" strokeLinecap="round" />
    <line x1="200" y1="218" x2="170" y2="216" stroke="#666" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="310" y1="200" x2="330" y2="214" stroke="#555" strokeWidth="3" strokeLinecap="round" />
    <line x1="330" y1="214" x2="358" y2="212" stroke="#666" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// ─── Componente principal ─────────────────────────────────────────────────────
export const MotoMap: React.FC<MotoMapProps> = ({ pins, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingPos, setPendingPos]     = useState<{ x: number; y: number } | null>(null);
  const [selectedDamage, setSelectedDamage] = useState<DamageType>('Risco Leve');
  const [customLabel, setCustomLabel]   = useState('');
  const [nearestZone, setNearestZone]   = useState<string>('');
  const [activePin, setActivePin]       = useState<string | null>(null);
  const [showLegend, setShowLegend]     = useState(false);
  const nextNumber = pins.length > 0 ? Math.max(...pins.map(p => p.number)) + 1 : 1;

  // ── Encontra zona mais próxima ────────────────────────────────────────────
  const getNearest = (xPct: number, yPct: number) => {
    let best = MOTO_ZONES[0], bestDist = Infinity;
    MOTO_ZONES.forEach(z => {
      const d = Math.hypot(z.cx - xPct, z.cy - yPct);
      if (d < bestDist) { bestDist = d; best = z; }
    });
    return bestDist < 18 ? best : null;
  };

  // ── Click / Touch ─────────────────────────────────────────────────────────
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width)  * 100,
      y: ((clientY - rect.top)  / rect.height) * 100,
    };
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;
    const zone = getNearest(coords.x, coords.y);
    setNearestZone(zone?.label || '');
    setCustomLabel(zone?.label || '');
    setPendingPos(coords);
    setActivePin(null);
  };

  const confirmPin = () => {
    if (!pendingPos) return;
    const zone = getNearest(pendingPos.x, pendingPos.y);
    const newPin: DamagePin = {
      id: Date.now().toString(),
      x: pendingPos.x,
      y: pendingPos.y,
      damage: selectedDamage,
      label: customLabel.trim() || nearestZone || selectedDamage,
      zoneId: zone?.id,
      number: nextNumber,
    };
    onChange([...pins, newPin]);
    setPendingPos(null);
    setCustomLabel('');
  };

  const removePin = (id: string) => onChange(pins.filter(p => p.id !== id));
  const clearAll  = () => onChange([]);

  return (
    <div className="space-y-4">

      {/* ── CANVAS DA MOTO ───────────────────────────────────────────────── */}
      <div className="relative">
        {/* Grid de fundo sutil */}
        <div
          ref={containerRef}
          onClick={handleInteraction}
          onTouchStart={handleInteraction}
          className="relative w-full rounded-2xl overflow-hidden border border-[#282828] cursor-crosshair select-none touch-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 60%, #161616 0%, #0c0c0c 100%)',
            paddingBottom: '54%',
            backgroundImage: 'radial-gradient(ellipse at 50% 60%, #161616 0%, #0c0c0c 100%),  linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),  linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 20px 20px, 20px 20px',
          }}
        >
          {/* SVG da moto */}
          <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            <MotoSVG />
          </div>

          {/* Hotspots visuais das zonas (anéis finos) */}
          {MOTO_ZONES.map(z => (
            <div
              key={z.id}
              className="absolute opacity-0 hover:opacity-100 transition-opacity"
              style={{
                left: `${z.cx}%`,
                top:  `${z.cy}%`,
                transform: 'translate(-50%,-50%)',
                pointerEvents: 'none',
              }}
            >
              <span className="block w-8 h-8 rounded-full border border-[#ff906d]/20" />
            </div>
          ))}

          {/* Pins confirmados */}
          {pins.map(pin => (
            <div
              key={pin.id}
              className="absolute z-10"
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)' }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setActivePin(activePin === pin.id ? null : pin.id); }}
                className="relative group focus:outline-none"
                aria-label={`Dano ${pin.number}: ${pin.label}`}
              >
                {/* Anel pulsante */}
                <span
                  className="absolute -inset-2 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: DAMAGE_META[pin.damage]?.color }}
                />
                {/* Círculo numerado */}
                <span
                  className="relative flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black shadow-lg border-2 border-white/30 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: DAMAGE_META[pin.damage]?.color }}
                >
                  {pin.number}
                </span>

                {/* Tooltip no hover / tap */}
                <AnimatePresence>
                  {activePin === pin.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      onClick={e => e.stopPropagation()}
                      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 min-w-[140px] bg-[#111] border border-[#333] rounded-2xl p-3 shadow-2xl text-left pointer-events-auto"
                    >
                      <p className="font-bold text-xs text-white leading-tight">{pin.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: DAMAGE_META[pin.damage]?.color }}>
                        {pin.damage}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); removePin(pin.id); setActivePin(null); }}
                        className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> REMOVER
                      </button>
                      {/* seta */}
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111] border-r border-b border-[#333] rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          ))}

          {/* Pin pendente (ponto onde tocou) */}
          {pendingPos && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%`, transform: 'translate(-50%,-50%)' }}
            >
              <span className="block w-5 h-5 rounded-full bg-white/90 border-2 border-[#ff906d] shadow-xl animate-pulse" />
            </div>
          )}

          {/* Hint inicial */}
          {pins.length === 0 && !pendingPos && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#333]">
                <MapPin className="w-3 h-3 text-[#ff906d]" />
                Toque na moto para marcar um dano
              </span>
            </div>
          )}

          {/* Contador top-right */}
          {pins.length > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-[#333]">
              <MapPin className="w-3 h-3 text-[#ff906d]" />
              <span className="text-[10px] font-black text-white">{pins.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── PAINEL DE CONFIRMAÇÃO ────────────────────────────────────────── */}
      <AnimatePresence>
        {pendingPos && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#151515] border border-[#ff906d]/30 rounded-2xl overflow-hidden"
          >
            {/* header */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black" style={{ backgroundColor: DAMAGE_META[selectedDamage].color }}>
                  {nextNumber}
                </span>
                <p className="text-xs font-bold text-[#ff906d] uppercase tracking-widest">Novo Dano</p>
              </div>
              {nearestZone && (
                <span className="text-[9px] font-bold text-[#adaaaa] bg-[#1a1a1a] px-2 py-0.5 rounded-lg border border-[#282828]">
                  📍 {nearestZone}
                </span>
              )}
            </div>

            <div className="px-4 pb-4 space-y-3">
              {/* Seletor de tipo */}
              <div className="grid grid-cols-3 gap-1.5">
                {DAMAGE_TYPES.map(d => (
                  <button
                    key={d}
                    onClick={e => { e.stopPropagation(); setSelectedDamage(d); }}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                      selectedDamage === d
                        ? DAMAGE_META[d].badge + ' scale-[1.03] shadow-md'
                        : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                    }`}
                  >
                    <span
                      className="block w-2 h-2 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: DAMAGE_META[d].color }}
                    />
                    {d}
                  </button>
                ))}
              </div>

              {/* Campo componente */}
              <input
                type="text"
                placeholder="Componente (ex: Carenagem Lateral)"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-[#282828] focus:border-[#ff906d] placeholder:text-[#333] transition-colors"
              />

              {/* Ações */}
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); setPendingPos(null); setCustomLabel(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-[#adaaaa] text-xs font-bold border border-[#282828] hover:bg-[#222] transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={e => { e.stopPropagation(); confirmPin(); }}
                  className="flex-1 py-2.5 rounded-xl text-black text-xs font-bold transition-all hover:opacity-90 shadow-lg"
                  style={{ backgroundColor: DAMAGE_META[selectedDamage].color }}
                >
                  CONFIRMAR DANO #{nextNumber}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TABELA DE DANOS MARCADOS ─────────────────────────────────────── */}
      {pins.length > 0 && (
        <div className="bg-[#151515] border border-[#222] rounded-2xl overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
            <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">
              {pins.length} dano{pins.length > 1 ? 's' : ''} registrado{pins.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[9px] font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3" /> LIMPAR TUDO
            </button>
          </div>

          {/* lista */}
          <div className="divide-y divide-[#1e1e1e]">
            {pins.map(pin => (
              <motion.div
                key={pin.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors group"
              >
                {/* número */}
                <span
                  className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black"
                  style={{ backgroundColor: DAMAGE_META[pin.damage]?.color }}
                >
                  {pin.number}
                </span>
                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{pin.label}</p>
                  <p className="text-[9px] font-bold mt-0.5" style={{ color: DAMAGE_META[pin.damage]?.color }}>
                    {pin.damage}
                  </p>
                </div>
                {/* badge */}
                <span className={`hidden sm:block px-2 py-0.5 rounded-lg text-[9px] font-bold border flex-shrink-0 ${ DAMAGE_META[pin.damage]?.badge }`}>
                  {pin.damage}
                </span>
                {/* remover */}
                <button
                  onClick={() => removePin(pin.id)}
                  className="flex-shrink-0 p-1.5 text-[#484847] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Legenda de cores colapsável */}
          <div className="border-t border-[#1e1e1e]">
            <button
              onClick={() => setShowLegend(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest hover:bg-[#1a1a1a] transition-colors"
            >
              Legenda de Tipos de Dano
              {showLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {showLegend && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    {DAMAGE_TYPES.map(d => (
                      <div key={d} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: DAMAGE_META[d].color }} />
                        <span className="text-[10px] text-[#adaaaa]">{d}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
