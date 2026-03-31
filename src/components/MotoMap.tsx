import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Trash2, ChevronDown, ChevronUp, StickyNote, AlertTriangle, Wrench, ZoomIn } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
const DAMAGE_CATEGORIES = {
  'Superficial': {
    color: '#eab308',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    items: ['Risco Leve', 'Risco Profundo', 'Arranhão', 'Marca de Impacto'],
  },
  'Estrutural': {
    color: '#ef4444',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    items: ['Amassado', 'Trinca', 'Fratura', 'Deformação'],
  },
  'Pintura / Acabamento': {
    color: '#3b82f6',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    items: ['Descascamento', 'Bolha de Tinta', 'Fading (Desbotamento)', 'Lascamento'],
  },
  'Corrosão': {
    color: '#d97706',
    badge: 'bg-amber-600/15 text-amber-500 border-amber-600/30',
    items: ['Oxidação Superficial', 'Ferrugem Avançada', 'Corrosão por Eletrólito'],
  },
  'Mecânico / Funcional': {
    color: '#a855f7',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    items: ['Vazamento de Óleo', 'Vazamento de Fluido', 'Desgaste Excessivo', 'Folga Anormal', 'Ruído Anômalo'],
  },
  'Elétrico': {
    color: '#22d3ee',
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    items: ['Falha de Iluminação', 'Curto-circuito', 'Sensor Defeituoso', 'Fiação Danificada'],
  },
} as const;

type DamageCategory = keyof typeof DAMAGE_CATEGORIES;
type DamageType = typeof DAMAGE_CATEGORIES[DamageCategory]['items'][number];

const DAMAGE_META: Record<string, { color: string; badge: string; category: DamageCategory }> = {};
(Object.entries(DAMAGE_CATEGORIES) as [DamageCategory, { color: string; badge: string; items: readonly string[] }][])
  .forEach(([cat, meta]) => {
    meta.items.forEach(item => { DAMAGE_META[item] = { color: meta.color, badge: meta.badge, category: cat }; });
  });

const DEFAULT_DAMAGE: DamageType = 'Risco Leve';

const SEVERITY_LEVELS = [
  { id: '1', label: 'Leve',    color: '#22c55e', desc: 'Estético, não urgente' },
  { id: '2', label: 'Médio',   color: '#eab308', desc: 'Requer atenção' },
  { id: '3', label: 'Grave',   color: '#f97316', desc: 'Conserto necessário' },
  { id: '4', label: 'Crítico', color: '#ef4444', desc: 'Risco de segurança' },
] as const;
type SeverityId = typeof SEVERITY_LEVELS[number]['id'];

const SIDE_OPTIONS = ['Esquerdo', 'Direito', 'Frontal', 'Traseiro', 'Superior', 'Inferior', 'Central'] as const;
type SideOption = typeof SIDE_OPTIONS[number];

const ACTIONS = [
  'Polimento', 'Pintura parcial', 'Pintura total', 'Troca da peça',
  'Martelação', 'Solda', 'Tratamento anticorrosivo', 'Reparo elétrico',
  'Limpeza profunda', 'Verificação mecânica', 'Orçamento aprovado pelo cliente',
] as const;

// ═══════════════════════════════════════════════════════════════════
// ZONAS — hotspots visíveis na imagem
// ═══════════════════════════════════════════════════════════════════
const MOTO_ZONES = [
  { id: 'farol',        label: 'Farol Dianteiro',       cx: 13, cy: 42, icon: '🔦' },
  { id: 'para_lama_d',  label: 'Para-lama Dianteiro',   cx: 14, cy: 65, icon: '🔽' },
  { id: 'pneu_d',       label: 'Pneu Dianteiro',        cx: 17, cy: 82, icon: '⚪' },
  { id: 'suspensao_d',  label: 'Suspensão Dianteira',   cx: 22, cy: 58, icon: '🔧' },
  { id: 'guidao',       label: 'Guidão / Manoplas',     cx: 28, cy: 28, icon: '🎮' },
  { id: 'painel',       label: 'Painel / Instrumentos', cx: 35, cy: 33, icon: '📊' },
  { id: 'tanque',       label: 'Tanque de Combustível', cx: 47, cy: 28, icon: '⛽' },
  { id: 'carenagem_l',  label: 'Carenagem Lateral',     cx: 50, cy: 56, icon: '🛡️' },
  { id: 'motor',        label: 'Motor / Bloco',         cx: 50, cy: 70, icon: '⚙️' },
  { id: 'banco',        label: 'Banco / Assento',       cx: 62, cy: 32, icon: '🚪' },
  { id: 'escapamento',  label: 'Escapamento',           cx: 68, cy: 75, icon: '💨' },
  { id: 'suspensao_t',  label: 'Suspensão Traseira',    cx: 75, cy: 58, icon: '🔧' },
  { id: 'para_lama_t',  label: 'Para-lama Traseiro',    cx: 78, cy: 46, icon: '🔽' },
  { id: 'lanterna',     label: 'Lanterna Traseira',     cx: 85, cy: 38, icon: '💡' },
  { id: 'pneu_t',       label: 'Pneu Traseiro',         cx: 85, cy: 82, icon: '⚪' },
];

export interface DamagePin {
  id: string; x: number; y: number;
  damage: string; category: DamageCategory;
  severity: SeverityId; side?: SideOption;
  actions: string[]; notes: string;
  label: string; zoneId?: string; number: number;
}

interface MotoMapProps { pins: DamagePin[]; onChange: (pins: DamagePin[]) => void; }

const MOTO_IMAGE_URL =
  'https://user-gen-media-assets.s3.amazonaws.com/gemini_images/97bb322c-9792-493b-b8db-08ac63d7c08e.png';

// ═══════════════════════════════════════════════════════════════════
export const MotoMap: React.FC<MotoMapProps> = ({ pins, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [pendingPos, setPendingPos]       = useState<{ x: number; y: number } | null>(null);
  const [hoveredZone, setHoveredZone]     = useState<string | null>(null);
  const [ripple, setRipple]               = useState<{ x: number; y: number; key: number } | null>(null);
  const [showHotspots, setShowHotspots]   = useState(true);

  // Form state
  const [selCategory, setSelCategory]   = useState<DamageCategory>('Superficial');
  const [selDamage, setSelDamage]       = useState<string>(DEFAULT_DAMAGE);
  const [selSeverity, setSelSeverity]   = useState<SeverityId>('2');
  const [selSide, setSelSide]           = useState<SideOption | ''>('');
  const [selActions, setSelActions]     = useState<string[]>([]);
  const [notes, setNotes]               = useState('');
  const [customLabel, setCustomLabel]   = useState('');
  const [nearestZone, setNearestZone]   = useState('');

  // List state
  const [activePin, setActivePin]       = useState<string | null>(null);
  const [showLegend, setShowLegend]     = useState(false);
  const [expandedPin, setExpandedPin]   = useState<string | null>(null);

  const nextNumber  = pins.length > 0 ? Math.max(...pins.map(p => p.number)) + 1 : 1;
  const currentColor = DAMAGE_CATEGORIES[selCategory]?.color ?? '#ff906d';

  const getNearest = (xPct: number, yPct: number) => {
    let best = MOTO_ZONES[0], bestDist = Infinity;
    MOTO_ZONES.forEach(z => {
      const d = Math.hypot(z.cx - xPct, z.cy - yPct);
      if (d < bestDist) { bestDist = d; best = z; }
    });
    return bestDist < 22 ? best : null;
  };

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
      px: clientX - rect.left,
      py: clientY - rect.top,
    };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getCoords(e);
    if (!coords) return;
    const zone = getNearest(coords.x, coords.y);
    setHoveredZone(zone?.id ?? null);
  }, []);

  const handleMouseLeave = () => setHoveredZone(null);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;

    // Ripple feedback visual
    setRipple({ x: coords.px, y: coords.py, key: Date.now() });
    setTimeout(() => setRipple(null), 600);

    const zone = getNearest(coords.x, coords.y);
    setNearestZone(zone?.label ?? '');
    setCustomLabel(zone?.label ?? '');
    setPendingPos({ x: coords.x, y: coords.y });
    setActivePin(null);
    setSelCategory('Superficial');
    setSelDamage('Risco Leve');
    setSelSeverity('2');
    setSelSide('');
    setSelActions([]);
    setNotes('');
  };

  // Clicar diretamente num hotspot de zona
  const handleZoneClick = (e: React.MouseEvent, zone: typeof MOTO_ZONES[number]) => {
    e.stopPropagation();
    setNearestZone(zone.label);
    setCustomLabel(zone.label);
    setPendingPos({ x: zone.cx, y: zone.cy });
    setActivePin(null);
    setSelCategory('Superficial');
    setSelDamage('Risco Leve');
    setSelSeverity('2');
    setSelSide('');
    setSelActions([]);
    setNotes('');
    setRipple({ x: zone.cx * (containerRef.current?.clientWidth ?? 0) / 100, y: zone.cy * (containerRef.current?.clientHeight ?? 0) / 100, key: Date.now() });
    setTimeout(() => setRipple(null), 600);
  };

  const confirmPin = () => {
    if (!pendingPos) return;
    const zone = getNearest(pendingPos.x, pendingPos.y);
    onChange([...pins, {
      id: Date.now().toString(),
      x: pendingPos.x, y: pendingPos.y,
      damage: selDamage, category: selCategory,
      severity: selSeverity, side: selSide || undefined,
      actions: selActions, notes: notes.trim(),
      label: customLabel.trim() || nearestZone || selDamage,
      zoneId: zone?.id, number: nextNumber,
    }]);
    setPendingPos(null);
    setCustomLabel('');
  };

  const removePin = (id: string) => onChange(pins.filter(p => p.id !== id));
  const clearAll  = () => onChange([]);
  const toggleAction = (a: string) =>
    setSelActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  return (
    <div className="space-y-4">

      {/* ── Toolbar: toggle hotspots ── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest">
          Toque em uma zona ou na imagem
        </p>
        <button
          onClick={() => setShowHotspots(v => !v)}
          className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
            showHotspots
              ? 'bg-[#ff906d]/10 text-[#ff906d] border-[#ff906d]/30'
              : 'bg-[#1a1a1a] text-[#555] border-[#282828]'
          }`}
        >
          <ZoomIn className="w-3 h-3" />
          {showHotspots ? 'OCULTAR ZONAS' : 'MOSTRAR ZONAS'}
        </button>
      </div>

      {/* ── CANVAS DA MOTO ──────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full rounded-2xl overflow-hidden border-2 border-[#282828] hover:border-[#ff906d]/40 transition-colors cursor-pointer select-none touch-none"
        style={{ paddingBottom: '62%', background: '#060606', minHeight: 180 }}
      >
        {/* Imagem */}
        <img
          src={MOTO_IMAGE_URL}
          alt="Moto — Vista Lateral"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
          style={{ userSelect: 'none' }}
        />

        {/* Véu de contraste */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.4) 100%)' }}
        />

        {/* ── HOTSPOTS — botões de zona clícaveis ── */}
        {showHotspots && MOTO_ZONES.map(zone => {
          const isHovered   = hoveredZone === zone.id;
          const hasDamage   = pins.some(p => p.zoneId === zone.id);
          const damageCount = pins.filter(p => p.zoneId === zone.id).length;
          return (
            <button
              key={zone.id}
              onClick={e => handleZoneClick(e, zone)}
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              className="absolute z-10 group focus:outline-none"
              style={{ left: `${zone.cx}%`, top: `${zone.cy}%`, transform: 'translate(-50%,-50%)' }}
            >
              {/* Anel externo pulsante (sempre visível se tiver dano) */}
              {hasDamage && (
                <span className="absolute -inset-3 rounded-full animate-ping opacity-20 bg-[#ff906d]" />
              )}

              {/* Botão zona */}
              <motion.span
                whileHover={{ scale: 1.4 }}
                whileTap={{ scale: 0.9 }}
                className={`relative flex items-center justify-center rounded-full border-2 transition-all duration-150 shadow-lg ${
                  hasDamage
                    ? 'w-6 h-6 bg-[#ff906d] border-white/60 text-black'
                    : isHovered
                      ? 'w-6 h-6 bg-white/90 border-[#ff906d] text-black'
                      : 'w-4 h-4 bg-white/20 border-white/30 backdrop-blur-sm'
                }`}
              >
                {hasDamage
                  ? <span className="text-[9px] font-black">{damageCount}</span>
                  : isHovered
                    ? <span className="text-[8px]">+</span>
                    : <span className="w-1.5 h-1.5 rounded-full bg-white/70" />}
              </motion.span>

              {/* Label tooltip ao hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    transition={{ duration: 0.12 }}
                    className="absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 pointer-events-none"
                  >
                    <span className="block px-2 py-1 bg-[#111] border border-[#383838] rounded-xl text-[9px] font-bold text-white shadow-xl">
                      {zone.icon} {zone.label}
                    </span>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#111] border-r border-b border-[#383838] rotate-45" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}

        {/* ── Pins de dano confirmados ── */}
        {pins.map(pin => {
          const pinColor = DAMAGE_META[pin.damage]?.color ?? '#ff906d';
          return (
            <div key={pin.id} className="absolute z-20"
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)' }}>
              <button
                onClick={e => { e.stopPropagation(); setActivePin(activePin === pin.id ? null : pin.id); }}
                className="relative group focus:outline-none"
              >
                <span className="absolute -inset-2 rounded-full animate-ping opacity-25"
                  style={{ backgroundColor: pinColor }} />
                <motion.span
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.85 }}
                  className="relative flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-black text-black shadow-2xl border-2 border-white/50"
                  style={{ backgroundColor: pinColor }}
                >{pin.number}</motion.span>
                {parseInt(pin.severity) >= 3 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black flex items-center justify-center"
                    style={{ backgroundColor: SEVERITY_LEVELS.find(s => s.id === pin.severity)?.color }}>
                    <AlertTriangle className="w-2 h-2 text-black" />
                  </span>
                )}
                <AnimatePresence>
                  {activePin === pin.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      onClick={e => e.stopPropagation()}
                      className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-56 bg-[#111] border border-[#383838] rounded-2xl p-3 shadow-2xl text-left pointer-events-auto"
                    >
                      <p className="font-bold text-xs text-white leading-tight">{pin.label}</p>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: pinColor }}>{pin.damage}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                          style={{ backgroundColor: SEVERITY_LEVELS.find(s=>s.id===pin.severity)?.color+'22',
                                   color: SEVERITY_LEVELS.find(s=>s.id===pin.severity)?.color }}>
                          {SEVERITY_LEVELS.find(s => s.id === pin.severity)?.label}
                        </span>
                        {pin.side && <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-[#1a1a1a] text-[#adaaaa]">{pin.side}</span>}
                      </div>
                      {pin.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pin.actions.map(a => (
                            <span key={a} className="text-[8px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#adaaaa] border border-[#2a2a2a] flex items-center gap-0.5">
                              <Wrench className="w-2 h-2" />{a}
                            </span>
                          ))}
                        </div>
                      )}
                      {pin.notes && (
                        <p className="text-[9px] text-[#666] mt-1.5 italic leading-relaxed border-t border-[#222] pt-1.5">{pin.notes}</p>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); removePin(pin.id); setActivePin(null); }}
                        className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                      ><Trash2 className="w-3 h-3" />REMOVER</button>
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111] border-r border-b border-[#383838] rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          );
        })}

        {/* ── Pin pendente (onde tocou) ── */}
        {pendingPos && (
          <div className="absolute z-20 pointer-events-none"
            style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%`, transform: 'translate(-50%,-50%)' }}>
            <motion.span
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="block w-7 h-7 rounded-full border-2 border-[#ff906d] shadow-xl"
              style={{ background: 'rgba(255,144,109,0.25)' }}
            />
          </div>
        )}

        {/* ── Ripple de clique ── */}
        <AnimatePresence>
          {ripple && (
            <motion.span
              key={ripple.key}
              initial={{ width: 0, height: 0, opacity: 0.6, x: ripple.x, y: ripple.y }}
              animate={{ width: 80, height: 80, opacity: 0, x: ripple.x - 40, y: ripple.y - 40 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute z-30 rounded-full border-2 border-[#ff906d] pointer-events-none"
              style={{ position: 'absolute' }}
            />
          )}
        </AnimatePresence>

        {/* ── Hint inicial ── */}
        {pins.length === 0 && !pendingPos && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#333]"
            >
              <MapPin className="w-3 h-3 text-[#ff906d]" />Toque num ponto ou zona
            </motion.span>
          </div>
        )}

        {/* ── Contador top-right ── */}
        {pins.length > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-[#333]">
            <MapPin className="w-3 h-3 text-[#ff906d]" />
            <span className="text-[10px] font-black text-white">{pins.length}</span>
          </div>
        )}

        {/* ── Label da zona sendo hover (desktop) ── */}
        {hoveredZone && !pendingPos && (
          <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-black/80 px-2.5 py-1 rounded-xl border border-[#333]">
              {MOTO_ZONES.find(z => z.id === hoveredZone)?.icon}{' '}
              {MOTO_ZONES.find(z => z.id === hoveredZone)?.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Grid de zonas clícaveis (alternativa mobile) ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
        {MOTO_ZONES.map(zone => {
          const damageCount = pins.filter(p => p.zoneId === zone.id).length;
          return (
            <button
              key={zone.id}
              onClick={e => handleZoneClick(e as any, zone)}
              className={`relative flex flex-col items-center gap-1 py-2 px-1.5 rounded-xl border text-center transition-all ${
                damageCount > 0
                  ? 'bg-[#ff906d]/10 border-[#ff906d]/40 text-[#ff906d]'
                  : 'bg-[#0e0e0e] border-[#1e1e1e] text-[#555] hover:border-[#444] hover:text-[#adaaaa]'
              }`}
            >
              <span className="text-base leading-none">{zone.icon}</span>
              <span className="text-[8px] font-bold leading-tight">{zone.label.split(' ')[0]}</span>
              {damageCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff906d] text-black text-[8px] font-black flex items-center justify-center">
                  {damageCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PAINEL DE DETALHES DO DANO
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {pendingPos && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="bg-[#111] border border-[#ff906d]/30 rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#1e1e1e]">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black flex-shrink-0"
                  style={{ backgroundColor: currentColor }}>{nextNumber}</span>
                <p className="text-xs font-bold text-[#ff906d] uppercase tracking-widest">Registrar Dano #{nextNumber}</p>
              </div>
              {nearestZone && (
                <span className="text-[9px] font-bold text-[#adaaaa] bg-[#1a1a1a] px-2 py-0.5 rounded-lg border border-[#282828]">
                  📍 {nearestZone}
                </span>
              )}
            </div>

            <div className="px-4 py-4 space-y-5">

              {/* 1. CATEGORIA */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">1 · Categoria</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(Object.entries(DAMAGE_CATEGORIES) as [DamageCategory, any][]).map(([cat, meta]) => (
                    <button key={cat}
                      onClick={() => { setSelCategory(cat); setSelDamage(meta.items[0]); }}
                      className={`py-2 px-2.5 rounded-xl text-[10px] font-bold border text-left transition-all ${
                        selCategory === cat ? `${meta.badge} scale-[1.02]` : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}>
                      <span className="block w-2 h-2 rounded-full mb-1" style={{ backgroundColor: meta.color }} />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. TIPO */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">2 · Tipo de Dano</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAMAGE_CATEGORIES[selCategory].items.map((item: string) => (
                    <button key={item} onClick={() => setSelDamage(item)}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        selDamage === item ? `${DAMAGE_CATEGORIES[selCategory].badge} scale-[1.03]` : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}>{item}</button>
                  ))}
                </div>
              </div>

              {/* 3. SEVERIDADE */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">3 · Severidade</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SEVERITY_LEVELS.map(sv => (
                    <button key={sv.id} onClick={() => setSelSeverity(sv.id as SeverityId)}
                      className={`flex flex-col items-center py-2 px-1 rounded-xl border text-[9px] font-bold transition-all ${
                        selSeverity === sv.id ? 'border-transparent scale-[1.05] shadow-lg' : 'bg-[#0e0e0e] text-[#555] border-[#222]'
                      }`}
                      style={selSeverity === sv.id ? { backgroundColor: sv.color+'22', color: sv.color, borderColor: sv.color+'55' } : {}}>
                      <span className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: sv.color }} />
                      <span>{sv.label}</span>
                      <span className="text-[8px] opacity-60 font-normal leading-tight text-center mt-0.5">{sv.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. LADO */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">4 · Lado / Posição</p>
                <div className="flex flex-wrap gap-1.5">
                  {SIDE_OPTIONS.map(side => (
                    <button key={side} onClick={() => setSelSide(selSide === side ? '' : side)}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        selSide === side ? 'bg-[#1db1f1]/15 text-[#1db1f1] border-[#1db1f1]/40 scale-[1.03]' : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}>{side}</button>
                  ))}
                </div>
              </div>

              {/* 5. AÇÕES */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench className="w-3 h-3" />5 · Ações Recomendadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIONS.map(action => (
                    <button key={action} onClick={() => toggleAction(action)}
                      className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold border transition-all ${
                        selActions.includes(action) ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30 scale-[1.03]' : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}>{selActions.includes(action) ? '✓ ' : ''}{action}</button>
                  ))}
                </div>
              </div>

              {/* 6. COMPONENTE + NOTAS */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest flex items-center gap-1.5">
                  <StickyNote className="w-3 h-3" />6 · Componente &amp; Observações
                </p>
                <input type="text" placeholder="Componente (ex: Carenagem Lateral)"
                  value={customLabel} onChange={e => setCustomLabel(e.target.value)} onClick={e => e.stopPropagation()}
                  className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-[#282828] focus:border-[#ff906d] placeholder:text-[#333]"
                />
                <textarea placeholder="Observações adicionais..."
                  value={notes} onChange={e => setNotes(e.target.value)} onClick={e => e.stopPropagation()} rows={2}
                  className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-[#282828] focus:border-[#1db1f1] placeholder:text-[#333] resize-none leading-relaxed"
                />
              </div>

              {/* Resumo */}
              <div className="flex flex-wrap gap-1.5 items-center p-3 bg-[#0e0e0e] rounded-xl border border-[#1e1e1e]">
                <span className="text-[9px] font-bold text-[#adaaaa] uppercase mr-1">Resumo:</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border"
                  style={{ backgroundColor: currentColor+'20', color: currentColor, borderColor: currentColor+'40' }}>{selDamage}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md font-bold"
                  style={{ backgroundColor: SEVERITY_LEVELS.find(s=>s.id===selSeverity)?.color+'20', color: SEVERITY_LEVELS.find(s=>s.id===selSeverity)?.color }}>
                  {SEVERITY_LEVELS.find(s=>s.id===selSeverity)?.label}
                </span>
                {selSide && <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#1db1f1]/15 text-[#1db1f1]">{selSide}</span>}
                {selActions.length > 0 && <span className="text-[9px] text-[#adaaaa]">· {selActions.length} ação(ões)</span>}
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setPendingPos(null); setCustomLabel(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-[#adaaaa] text-xs font-bold border border-[#282828] hover:bg-[#222] transition-colors">
                  CANCELAR
                </button>
                <button onClick={confirmPin}
                  className="flex-2 flex-grow-[2] py-2.5 rounded-xl text-black text-xs font-bold shadow-lg transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: currentColor }}>
                  ✓ CONFIRMAR DANO #{nextNumber}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LISTA DE DANOS ──────────────────────────────────────────── */}
      {pins.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
            <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">
              {pins.length} dano{pins.length > 1 ? 's' : ''} registrado{pins.length > 1 ? 's' : ''}
            </p>
            <button onClick={clearAll}
              className="flex items-center gap-1 text-[9px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10">
              <Trash2 className="w-3 h-3" />LIMPAR TUDO
            </button>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {pins.map(pin => {
              const pinColor   = DAMAGE_META[pin.damage]?.color ?? '#ff906d';
              const sv         = SEVERITY_LEVELS.find(s => s.id === pin.severity);
              const isExpanded = expandedPin === pin.id;
              return (
                <div key={pin.id} className="hover:bg-[#161616] transition-colors">
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedPin(isExpanded ? null : pin.id)}>
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black"
                      style={{ backgroundColor: pinColor }}>{pin.number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{pin.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] font-bold" style={{ color: pinColor }}>{pin.damage}</p>
                        {sv && <span className="text-[8px] px-1.5 rounded font-bold" style={{ backgroundColor: sv.color+'22', color: sv.color }}>{sv.label}</span>}
                        {pin.side && <span className="text-[8px] text-[#666]">· {pin.side}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {pin.actions.length > 0 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] font-bold">{pin.actions.length}x</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-[#444]" /> : <ChevronDown className="w-3 h-3 text-[#444]" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
                        <div className="px-4 pb-3 space-y-2.5 border-t border-[#1e1e1e] pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border"
                              style={{ backgroundColor: pinColor+'20', color: pinColor, borderColor: pinColor+'40' }}>{pin.category}</span>
                            {pin.side && <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#1db1f1]/10 text-[#1db1f1] border border-[#1db1f1]/20">{pin.side}</span>}
                          </div>
                          {pin.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {pin.actions.map(a => (
                                <span key={a} className="text-[8px] px-2 py-0.5 rounded-lg bg-[#1e1e1e] text-[#adaaaa] border border-[#2a2a2a] flex items-center gap-0.5">
                                  <Wrench className="w-2 h-2" />{a}
                                </span>
                              ))}
                            </div>
                          )}
                          {pin.notes && <p className="text-[10px] text-[#666] italic leading-relaxed">{pin.notes}</p>}
                          <button onClick={() => { removePin(pin.id); setExpandedPin(null); }}
                            className="flex items-center gap-1.5 text-[9px] font-bold text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors border border-red-500/20">
                            <Trash2 className="w-3 h-3" />REMOVER DANO #{pin.number}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <div className="border-t border-[#1e1e1e]">
            <button onClick={() => setShowLegend(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest hover:bg-[#161616] transition-colors">
              Legenda de Categorias
              {showLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {showLegend && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 pb-4">
                    {(Object.entries(DAMAGE_CATEGORIES) as [DamageCategory, any][]).map(([cat, meta]) => (
                      <div key={cat} className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: meta.color }} />
                        <div>
                          <p className="text-[10px] font-bold text-[#adaaaa]">{cat}</p>
                          <p className="text-[9px] text-[#555]">{(meta.items as string[]).slice(0,2).join(', ')}…</p>
                        </div>
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
