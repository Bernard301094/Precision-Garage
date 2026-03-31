import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2, ChevronDown, ChevronUp,
  StickyNote, AlertTriangle, Wrench, Plus, X
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// CATEGORIAS DE DANO
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
    badge: 'bg-amber-600/15 text-amber-600 border-amber-600/30',
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

const DAMAGE_META: Record<string, { color: string; badge: string; category: DamageCategory }> = {};
(Object.entries(DAMAGE_CATEGORIES) as [DamageCategory, { color: string; badge: string; items: readonly string[] }][])
  .forEach(([cat, meta]) => {
    meta.items.forEach(item => { DAMAGE_META[item] = { color: meta.color, badge: meta.badge, category: cat }; });
  });

const SEVERITY_LEVELS = [
  { id: '1', label: 'Leve',    color: '#22c55e', desc: 'Estético' },
  { id: '2', label: 'Médio',   color: '#eab308', desc: 'Atenção' },
  { id: '3', label: 'Grave',   color: '#f97316', desc: 'Conserto' },
  { id: '4', label: 'Crítico', color: '#ef4444', desc: 'Urgente' },
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
// ZONAS — agrupadas por área da moto
// ═══════════════════════════════════════════════════════════════════
const ZONE_GROUPS = [
  {
    group: 'Dianteiro',
    color: '#1db1f1',
    zones: [
      { id: 'farol',       label: 'Farol',           icon: '🔦' },
      { id: 'guidao',      label: 'Guidão',          icon: '🎮' },
      { id: 'painel',      label: 'Painel',          icon: '📊' },
      { id: 'suspensao_d', label: 'Suspensão Diant.', icon: '🔧' },
      { id: 'para_lama_d', label: 'Para-lama Diant.', icon: '🔽' },
      { id: 'pneu_d',      label: 'Pneu Diant.',     icon: '⚪' },
    ],
  },
  {
    group: 'Central',
    color: '#ff906d',
    zones: [
      { id: 'tanque',      label: 'Tanque',          icon: '⛽' },
      { id: 'carenagem_l', label: 'Carenagem',       icon: '🛡️' },
      { id: 'banco',       label: 'Banco',           icon: '🪑' },
    ],
  },
  {
    group: 'Motor / Escapamento',
    color: '#a855f7',
    zones: [
      { id: 'motor',       label: 'Motor / Bloco',   icon: '⚙️' },
      { id: 'escapamento', label: 'Escapamento',     icon: '💨' },
    ],
  },
  {
    group: 'Traseiro',
    color: '#22c55e',
    zones: [
      { id: 'suspensao_t', label: 'Suspensão Tras.', icon: '🔧' },
      { id: 'para_lama_t', label: 'Para-lama Tras.', icon: '🔽' },
      { id: 'lanterna',    label: 'Lanterna',        icon: '💡' },
      { id: 'pneu_t',      label: 'Pneu Tras.',      icon: '⚪' },
    ],
  },
];

const ALL_ZONES = ZONE_GROUPS.flatMap(g => g.zones);

// ═══════════════════════════════════════════════════════════════════
// TIPOS EXPORTADOS
// ═══════════════════════════════════════════════════════════════════
export interface DamagePin {
  id: string; x: number; y: number;
  damage: string; category: DamageCategory;
  severity: SeverityId; side?: SideOption;
  actions: string[]; notes: string;
  label: string; zoneId?: string; number: number;
}

interface MotoMapProps { pins: DamagePin[]; onChange: (pins: DamagePin[]) => void; }

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export const MotoMap: React.FC<MotoMapProps> = ({ pins, onChange }) => {
  const [activeZone, setActiveZone]     = useState<string | null>(null);
  const [expandedPin, setExpandedPin]   = useState<string | null>(null);

  // Form state
  const [selCategory, setSelCategory]   = useState<DamageCategory>('Superficial');
  const [selDamage, setSelDamage]       = useState<string>('Risco Leve');
  const [selSeverity, setSelSeverity]   = useState<SeverityId>('2');
  const [selSide, setSelSide]           = useState<SideOption | ''>('');
  const [selActions, setSelActions]     = useState<string[]>([]);
  const [notes, setNotes]               = useState('');
  const [customLabel, setCustomLabel]   = useState('');

  const nextNumber  = pins.length > 0 ? Math.max(...pins.map(p => p.number)) + 1 : 1;
  const currentColor = DAMAGE_CATEGORIES[selCategory]?.color ?? '#ff906d';

  const openZone = (zoneId: string) => {
    const zone = ALL_ZONES.find(z => z.id === zoneId);
    setActiveZone(zoneId);
    setCustomLabel(zone?.label ?? '');
    setSelCategory('Superficial');
    setSelDamage('Risco Leve');
    setSelSeverity('2');
    setSelSide('');
    setSelActions([]);
    setNotes('');
  };

  const confirmPin = () => {
    if (!activeZone) return;
    onChange([...pins, {
      id: Date.now().toString(),
      x: 0, y: 0,
      damage: selDamage, category: selCategory,
      severity: selSeverity, side: selSide || undefined,
      actions: selActions, notes: notes.trim(),
      label: customLabel.trim() || ALL_ZONES.find(z => z.id === activeZone)?.label || selDamage,
      zoneId: activeZone, number: nextNumber,
    }]);
    setActiveZone(null);
    setCustomLabel('');
  };

  const removePin  = (id: string) => onChange(pins.filter(p => p.id !== id));
  const clearAll   = () => onChange([]);
  const toggleAction = (a: string) =>
    setSelActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const activeZoneData = ALL_ZONES.find(z => z.id === activeZone);

  return (
    <div className="space-y-4">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest">
          Selecione uma zona para registrar dano
        </p>
        {pins.length > 0 && (
          <span className="px-2.5 py-1 bg-[#ff906d]/10 text-[#ff906d] text-[10px] font-bold rounded-lg border border-[#ff906d]/20">
            {pins.length} dano{pins.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── GRID DE ZONAS ── */}
      <div className="space-y-3">
        {ZONE_GROUPS.map(group => (
          <div key={group.group}>
            {/* Título do grupo */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: group.color }}>
                {group.group}
              </span>
              <div className="flex-1 h-px bg-[#1e1e1e]" />
            </div>

            {/* Cards das zonas */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {group.zones.map(zone => {
                const zonePins     = pins.filter(p => p.zoneId === zone.id);
                const hasPin       = zonePins.length > 0;
                const isActive     = activeZone === zone.id;

                return (
                  <motion.button
                    key={zone.id}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => openZone(zone.id)}
                    className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border text-center transition-all duration-200 ${
                      isActive
                        ? 'border-[#ff906d] bg-[#ff906d]/10 shadow-lg shadow-[#ff906d]/10'
                        : hasPin
                          ? 'border-[#ff906d]/40 bg-[#ff906d]/5'
                          : 'bg-[#0e0e0e] border-[#1e1e1e] hover:border-[#333] hover:bg-[#141414]'
                    }`}
                  >
                    {/* Badge contador */}
                    {hasPin && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#ff906d] text-black text-[9px] font-black flex items-center justify-center shadow-md">
                        {zonePins.length}
                      </span>
                    )}

                    {/* Ícone */}
                    <span className="text-xl leading-none">{zone.icon}</span>

                    {/* Label */}
                    <span className={`text-[8px] font-bold leading-tight ${
                      isActive ? 'text-[#ff906d]' : hasPin ? 'text-[#ff906d]/80' : 'text-[#555]'
                    }`}>
                      {zone.label}
                    </span>

                    {/* Indicador ativo */}
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#ff906d] rounded-full" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PAINEL DE REGISTRO DE DANO
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeZone && (
          <motion.div
            key={activeZone}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="bg-[#111] border border-[#ff906d]/30 rounded-2xl overflow-hidden"
          >
            {/* Header do painel */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#1e1e1e]">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black text-black flex-shrink-0"
                  style={{ backgroundColor: currentColor }}
                >{nextNumber}</span>
                <div>
                  <p className="text-xs font-black text-[#ff906d] uppercase tracking-widest">Registrar Dano</p>
                  <p className="text-[10px] text-[#adaaaa] font-bold">
                    {activeZoneData?.icon} {activeZoneData?.label}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveZone(null)}
                className="p-1.5 rounded-xl bg-[#1a1a1a] text-[#555] hover:text-white hover:bg-[#222] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-5">

              {/* 1 · CATEGORIA */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">1 · Categoria</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(Object.entries(DAMAGE_CATEGORIES) as [DamageCategory, any][]).map(([cat, meta]) => (
                    <button key={cat}
                      onClick={() => { setSelCategory(cat); setSelDamage(meta.items[0]); }}
                      className={`py-2 px-2.5 rounded-xl text-[10px] font-bold border text-left transition-all ${
                        selCategory === cat ? `${meta.badge} scale-[1.02]` : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}
                    >
                      <span className="block w-2 h-2 rounded-full mb-1" style={{ backgroundColor: meta.color }} />
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 · TIPO DE DANO */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">2 · Tipo de Dano</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAMAGE_CATEGORIES[selCategory].items.map((item: string) => (
                    <button key={item} onClick={() => setSelDamage(item)}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        selDamage === item
                          ? `${DAMAGE_CATEGORIES[selCategory].badge} scale-[1.03]`
                          : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}
                    >{item}</button>
                  ))}
                </div>
              </div>

              {/* 3 · SEVERIDADE */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">3 · Severidade</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SEVERITY_LEVELS.map(sv => (
                    <button key={sv.id} onClick={() => setSelSeverity(sv.id as SeverityId)}
                      className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-[9px] font-bold transition-all ${
                        selSeverity === sv.id ? 'border-transparent scale-[1.05] shadow-lg' : 'bg-[#0e0e0e] text-[#555] border-[#222]'
                      }`}
                      style={selSeverity === sv.id ? { backgroundColor: sv.color + '22', color: sv.color, borderColor: sv.color + '55' } : {}}
                    >
                      <span className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: sv.color }} />
                      <span>{sv.label}</span>
                      <span className="text-[8px] opacity-60 font-normal leading-tight text-center mt-0.5">{sv.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 · LADO */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">4 · Lado / Posição</p>
                <div className="flex flex-wrap gap-1.5">
                  {SIDE_OPTIONS.map(side => (
                    <button key={side} onClick={() => setSelSide(selSide === side ? '' : side)}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        selSide === side
                          ? 'bg-[#1db1f1]/15 text-[#1db1f1] border-[#1db1f1]/40 scale-[1.03]'
                          : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}
                    >{side}</button>
                  ))}
                </div>
              </div>

              {/* 5 · AÇÕES */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench className="w-3 h-3" />5 · Ações Recomendadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIONS.map(action => (
                    <button key={action} onClick={() => toggleAction(action)}
                      className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold border transition-all ${
                        selActions.includes(action)
                          ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30 scale-[1.03]'
                          : 'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                      }`}
                    >{selActions.includes(action) ? '✓ ' : ''}{action}</button>
                  ))}
                </div>
              </div>

              {/* 6 · COMPONENTE & NOTAS */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest flex items-center gap-1.5">
                  <StickyNote className="w-3 h-3" />6 · Componente & Observações
                </p>
                <input
                  type="text"
                  placeholder="Componente (ex: Carenagem Lateral Direita)"
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-[#282828] focus:border-[#ff906d] placeholder:text-[#333]"
                />
                <textarea
                  placeholder="Observações adicionais..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-[#282828] focus:border-[#1db1f1] placeholder:text-[#333] resize-none leading-relaxed"
                />
              </div>

              {/* Resumo inline */}
              <div className="flex flex-wrap gap-1.5 items-center p-3 bg-[#0e0e0e] rounded-xl border border-[#1e1e1e]">
                <span className="text-[9px] font-bold text-[#adaaaa] uppercase mr-1">Resumo:</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border"
                  style={{ backgroundColor: currentColor + '20', color: currentColor, borderColor: currentColor + '40' }}>
                  {selDamage}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-md font-bold"
                  style={{
                    backgroundColor: SEVERITY_LEVELS.find(s => s.id === selSeverity)?.color + '20',
                    color: SEVERITY_LEVELS.find(s => s.id === selSeverity)?.color,
                  }}>
                  {SEVERITY_LEVELS.find(s => s.id === selSeverity)?.label}
                </span>
                {selSide && (
                  <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#1db1f1]/15 text-[#1db1f1]">{selSide}</span>
                )}
                {selActions.length > 0 && (
                  <span className="text-[9px] text-[#adaaaa]">· {selActions.length} ação(ões)</span>
                )}
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setActiveZone(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-[#adaaaa] text-xs font-bold border border-[#282828] hover:bg-[#222] transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={confirmPin}
                  className="flex-2 flex-grow-[2] py-2.5 rounded-xl text-black text-xs font-bold shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: currentColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  CONFIRMAR DANO #{nextNumber}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LISTA DE DANOS REGISTRADOS ── */}
      {pins.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
            <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">
              {pins.length} dano{pins.length > 1 ? 's' : ''} registrado{pins.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[9px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3" />LIMPAR TUDO
            </button>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {pins.map(pin => {
              const pinColor   = DAMAGE_META[pin.damage]?.color ?? '#ff906d';
              const sv         = SEVERITY_LEVELS.find(s => s.id === pin.severity);
              const isExpanded = expandedPin === pin.id;
              const zoneData   = ALL_ZONES.find(z => z.id === pin.zoneId);
              return (
                <div key={pin.id} className="hover:bg-[#161616] transition-colors">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedPin(isExpanded ? null : pin.id)}
                  >
                    {/* Número */}
                    <span
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black text-black"
                      style={{ backgroundColor: pinColor }}
                    >{pin.number}</span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {zoneData && <span className="text-sm leading-none">{zoneData.icon}</span>}
                        <p className="text-xs font-bold text-white truncate">{pin.label}</p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] font-bold" style={{ color: pinColor }}>{pin.damage}</p>
                        {sv && (
                          <span className="text-[8px] px-1.5 rounded font-bold"
                            style={{ backgroundColor: sv.color + '22', color: sv.color }}>
                            {sv.label}
                          </span>
                        )}
                        {pin.side && <span className="text-[8px] text-[#666]">· {pin.side}</span>}
                      </div>
                    </div>

                    {/* Expand */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {pin.actions.length > 0 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] font-bold">
                          {pin.actions.length}x
                        </span>
                      )}
                      {parseInt(pin.severity) >= 3 && (
                        <AlertTriangle className="w-3 h-3" style={{ color: sv?.color }} />
                      )}
                      {isExpanded
                        ? <ChevronUp className="w-3 h-3 text-[#444]" />
                        : <ChevronDown className="w-3 h-3 text-[#444]" />}
                    </div>
                  </button>

                  {/* Detalhes expandidos */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-2.5 border-t border-[#1e1e1e] pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border"
                              style={{ backgroundColor: pinColor + '20', color: pinColor, borderColor: pinColor + '40' }}>
                              {pin.category}
                            </span>
                            {pin.side && (
                              <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#1db1f1]/10 text-[#1db1f1] border border-[#1db1f1]/20">
                                {pin.side}
                              </span>
                            )}
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
                          {pin.notes && (
                            <p className="text-[10px] text-[#666] italic leading-relaxed">{pin.notes}</p>
                          )}
                          <button
                            onClick={() => { removePin(pin.id); setExpandedPin(null); }}
                            className="flex items-center gap-1.5 text-[9px] font-bold text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors border border-red-500/20"
                          >
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
        </div>
      )}
    </div>
  );
};
