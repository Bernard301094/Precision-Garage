import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Trash2, ChevronDown, ChevronUp,
  StickyNote, AlertTriangle, Wrench, Plus, X,
  ImagePlus, MapPin, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '../lib/utils';
import { auth } from '../lib/firebase';

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
export interface DamagePin {
  id: string; x: number; y: number;
  damage: string; category: DamageCategory;
  severity: SeverityId; side?: SideOption;
  actions: string[]; notes: string;
  label: string; zoneId?: string; number: number;
}

export interface MotoMapProps {
  pins: DamagePin[];
  onChange: (pins: DamagePin[]) => void;
  photoUrl?: string;
  onPhotoChange?: (url: string) => void;
}

// ═══════════════════════════════════════════════════════════════════
export const MotoMap: React.FC<MotoMapProps> = ({ pins, onChange, photoUrl, onPhotoChange }) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [uploading, setUploading]       = useState(false);
  const [pendingPos, setPendingPos]     = useState<{ x: number; y: number } | null>(null);
  const [activePin, setActivePin]       = useState<string | null>(null);
  const [expandedPin, setExpandedPin]   = useState<string | null>(null);
  const [ripple, setRipple]             = useState<{ x: number; y: number; key: number } | null>(null);

  // Form state
  const [selCategory, setSelCategory]   = useState<DamageCategory>('Superficial');
  const [selDamage, setSelDamage]       = useState<string>('Risco Leve');
  const [selSeverity, setSelSeverity]   = useState<SeverityId>('2');
  const [selSide, setSelSide]           = useState<SideOption | ''>('');
  const [selActions, setSelActions]     = useState<string[]>([]);
  const [notes, setNotes]               = useState('');
  const [customLabel, setCustomLabel]   = useState('');

  const nextNumber   = pins.length > 0 ? Math.max(...pins.map(p => p.number)) + 1 : 1;
  const currentColor = DAMAGE_CATEGORIES[selCategory]?.color ?? '#ff906d';

  // ── Upload da foto ───────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, `motomap/${auth.currentUser.uid}/${Date.now()}`);
      onPhotoChange?.(url);
      onChange([]); // limpa pins ao trocar foto
      toast.success('Foto da moto carregada!');
    } catch {
      // erro já tratado pelo uploadImage
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Coordenadas do toque/click ──────────────────────────────
  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const rect    = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x:  ((clientX - rect.left)  / rect.width)  * 100,
      y:  ((clientY - rect.top)   / rect.height) * 100,
      px: clientX - rect.left,
      py: clientY - rect.top,
    };
  }, []);

  // ── Toque na imagem ───────────────────────────────────────────
  const handleImageTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!photoUrl) return;
    e.preventDefault();
    const coords = getCoords(e);
    if (!coords) return;

    setRipple({ x: coords.px, y: coords.py, key: Date.now() });
    setTimeout(() => setRipple(null), 600);

    setActivePin(null);
    setPendingPos({ x: coords.x, y: coords.y });
    setSelCategory('Superficial');
    setSelDamage('Risco Leve');
    setSelSeverity('2');
    setSelSide('');
    setSelActions([]);
    setNotes('');
    setCustomLabel('');
  };

  // ── Confirmar pin ─────────────────────────────────────────────
  const confirmPin = () => {
    if (!pendingPos) return;
    onChange([...pins, {
      id: Date.now().toString(),
      x: pendingPos.x,
      y: pendingPos.y,
      damage: selDamage,
      category: selCategory,
      severity: selSeverity,
      side: selSide || undefined,
      actions: selActions,
      notes: notes.trim(),
      label: customLabel.trim() || selDamage,
      number: nextNumber,
    }]);
    setPendingPos(null);
    setCustomLabel('');
  };

  const removePin    = (id: string) => onChange(pins.filter(p => p.id !== id));
  const clearAll     = () => { onChange([]); };
  const toggleAction = (a: string) =>
    setSelActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  return (
    <div className="space-y-4">

      {/* ── UPLOAD PROMPT (sem foto) ── */}
      {!photoUrl && (
        <label className={`flex flex-col items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          uploading
            ? 'border-accent/40 bg-accent/5'
            : 'border-border hover:border-accent/50 hover:bg-accent/5 bg-surface'
        }`}
          style={{ minHeight: 200 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
          />
          {uploading ? (
            <>
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-accent text-xs font-bold uppercase tracking-widest">Enviando foto...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
                <Camera className="w-8 h-8 text-accent" />
              </div>
              <div className="text-center space-y-1 px-4">
                <p className="text-text-main font-bold text-sm">Fotografar a Moto</p>
                <p className="text-text-muted text-xs">Tire uma foto ou escolha da galeria.</p>
                <p className="text-[#555] text-[10px]">Os pontos de dano serão marcados sobre a sua foto real.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-text-on-accent text-xs font-black uppercase tracking-widest">
                <ImagePlus className="w-4 h-4" /> ABRIR CÂMERA / GALERIA
              </div>
            </>
          )}
        </label>
      )}

      {/* ── CANVAS: foto + pins ── */}
      {photoUrl && (
        <>
          {/* Toolbar acima da foto */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                Toque na foto para marcar dano
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-border bg-surface text-text-muted hover:text-text-main hover:border-[#444] transition-all cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
              />
              {uploading
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Enviando...</>
                : <><Camera className="w-3 h-3" /> Trocar foto</>}
            </label>
          </div>

          {/* Container da imagem com pins overlay */}
          <div
            ref={containerRef}
            onClick={handleImageTap}
            onTouchStart={handleImageTap}
            className="relative w-full rounded-2xl overflow-hidden border-2 border-border hover:border-accent/40 transition-colors cursor-crosshair select-none touch-none"
            style={{ paddingBottom: '62%', minHeight: 180 }}
          >
            {/* Foto real da moto */}
            <img
              src={photoUrl}
              alt="Moto — foto real"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Véu sutil para contraste dos pins */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.25) 100%)' }}
            />

            {/* ── Pins confirmados ── */}
            {pins.map(pin => {
              const pinColor = DAMAGE_META[pin.damage]?.color ?? '#ff906d';
              const sv       = SEVERITY_LEVELS.find(s => s.id === pin.severity);
              return (
                <div
                  key={pin.id}
                  className="absolute z-20"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); setActivePin(activePin === pin.id ? null : pin.id); setPendingPos(null); }}
                    className="relative focus:outline-none group"
                  >
                    {/* Pulso */}
                    <span
                      className="absolute -inset-2 rounded-full animate-ping opacity-25 pointer-events-none"
                      style={{ backgroundColor: pinColor }}
                    />
                    {/* Botão */}
                    <motion.span
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.85 }}
                      className="relative flex items-center justify-center w-8 h-8 rounded-full font-black text-[11px] text-black border-2 border-white/60 shadow-2xl"
                      style={{ backgroundColor: pinColor }}
                    >
                      {pin.number}
                    </motion.span>
                    {/* Ícone de alerta para grave/crítico */}
                    {parseInt(pin.severity) >= 3 && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-bg flex items-center justify-center"
                        style={{ backgroundColor: sv?.color }}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-black" />
                      </span>
                    )}

                    {/* Popup do pin */}
                    <AnimatePresence>
                      {activePin === pin.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            onClick={e => e.stopPropagation()}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 w-56 bg-surface glass border border-border rounded-2xl p-3 shadow-2xl text-left pointer-events-auto"
                          >
                          <p className="font-bold text-xs text-text-main leading-tight">{pin.label}</p>
                          <p className="text-[10px] mt-0.5 font-semibold" style={{ color: pinColor }}>{pin.damage}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                              style={{ backgroundColor: sv?.color + '22', color: sv?.color }}
                            >{sv?.label}</span>
                            {pin.side && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-surface text-text-muted">{pin.side}</span>
                            )}
                          </div>
                          {pin.actions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {pin.actions.map(a => (
                                <span key={a} className="text-[8px] px-1.5 py-0.5 rounded bg-surface text-text-muted border border-[#2a2a2a] flex items-center gap-0.5">
                                  <Wrench className="w-2 h-2" />{a}
                                </span>
                              ))}
                            </div>
                          )}
                          {pin.notes && (
                            <p className="text-[9px] text-text-muted mt-1.5 italic leading-relaxed border-t border-border/50 pt-1.5">{pin.notes}</p>
                          )}
                          <button
                            onClick={() => { removePin(pin.id); setActivePin(null); }}
                            className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />REMOVER
                          </button>
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface border-r border-b border-border rotate-45" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              );
            })}

            {/* ── Pin pendente (cursor de posição) ── */}
            {pendingPos && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%`, transform: 'translate(-50%,-50%)' }}
              >
                <motion.span
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="block w-8 h-8 rounded-full border-2 border-accent shadow-xl"
                  style={{ background: 'rgba(255,144,109,0.3)' }}
                />
              </div>
            )}

            {/* ── Ripple de clique ── */}
            <AnimatePresence>
              {ripple && (
                <motion.span
                  key={ripple.key}
                  initial={{ width: 0, height: 0, opacity: 0.7, x: ripple.x, y: ripple.y }}
                  animate={{ width: 90, height: 90, opacity: 0, x: ripple.x - 45, y: ripple.y - 45 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute z-30 rounded-full border-2 border-accent pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* ── Hint inicial ── */}
            {pins.length === 0 && !pendingPos && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                  <motion.span
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-text-main uppercase tracking-widest bg-surface/80 glass-sm px-3 py-1.5 rounded-full border border-border"
                  >
                  <MapPin className="w-3 h-3 text-accent" />Toque para marcar dano
                </motion.span>
              </div>
            )}

            {/* ── Contador top-right ── */}
            {pins.length > 0 && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-surface/80 glass-sm px-2.5 py-1 rounded-xl border border-border">
                <MapPin className="w-3 h-3 text-accent" />
                <span className="text-[10px] font-black text-text-main">{pins.length}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAINEL DE REGISTRO DE DANO (abre após toque na foto)
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {pendingPos && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="bg-surface border border-accent/30 rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black text-black flex-shrink-0"
                  style={{ backgroundColor: currentColor }}
                >{nextNumber}</span>
                <p className="text-xs font-black text-accent uppercase tracking-widest">Registrar Dano #{nextNumber}</p>
              </div>
              <button
                onClick={() => setPendingPos(null)}
                className="p-1.5 rounded-xl bg-surface-hover text-text-muted hover:text-text-main hover:bg-border transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-5">

              {/* 1 · CATEGORIA */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">1 · Categoria</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(Object.entries(DAMAGE_CATEGORIES) as [DamageCategory, any][]).map(([cat, meta]) => (
                    <button key={cat}
                      onClick={() => { setSelCategory(cat); setSelDamage(meta.items[0]); }}
                      className={`py-2 px-2.5 rounded-xl text-[10px] font-bold border text-left transition-all ${
                        selCategory === cat ? `${meta.badge} scale-[1.02]` : 'bg-surface-hover text-text-muted border-border hover:border-border-strong'
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
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">2 · Tipo de Dano</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAMAGE_CATEGORIES[selCategory].items.map((item: string) => (
                    <button key={item} onClick={() => setSelDamage(item)}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        selDamage === item
                          ? `${DAMAGE_CATEGORIES[selCategory].badge} scale-[1.03]`
                          : 'bg-surface-hover text-text-muted border-border hover:border-border-strong'
                      }`}
                    >{item}</button>
                  ))}
                </div>
              </div>

              {/* 3 · SEVERIDADE */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">3 · Severidade</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {SEVERITY_LEVELS.map(sv => (
                    <button key={sv.id} onClick={() => setSelSeverity(sv.id as SeverityId)}
                      className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-[9px] font-bold transition-all ${
                        selSeverity === sv.id ? 'border-transparent scale-[1.05] shadow-lg' : 'bg-surface-hover text-text-muted border-border'
                      }`}
                      style={selSeverity === sv.id
                        ? { backgroundColor: sv.color + '22', color: sv.color, borderColor: sv.color + '55' }
                        : {}}
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
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">4 · Lado / Posição</p>
                <div className="flex flex-wrap gap-1.5">
                  {SIDE_OPTIONS.map(side => (
                    <button key={side} onClick={() => setSelSide(selSide === side ? '' : side)}
                      className={`py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all ${
                        selSide === side
                          ? 'bg-[#1db1f1]/15 text-[#1db1f1] border-[#1db1f1]/40 scale-[1.03]'
                          : 'bg-surface-hover text-text-muted border-border hover:border-border-strong'
                      }`}
                    >{side}</button>
                  ))}
                </div>
              </div>

              {/* 5 · AÇÕES */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench className="w-3 h-3" />5 · Ações Recomendadas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIONS.map(action => (
                    <button key={action} onClick={() => toggleAction(action)}
                      className={`py-1.5 px-2.5 rounded-xl text-[10px] font-bold border transition-all ${
                        selActions.includes(action)
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 scale-[1.03]'
                          : 'bg-surface-hover text-text-muted border-border hover:border-border-strong'
                      }`}
                    >{selActions.includes(action) ? '✓ ' : ''}{action}</button>
                  ))}
                </div>
              </div>

              {/* 6 · LABEL & NOTAS */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <StickyNote className="w-3 h-3" />6 · Componente & Observações
                </p>
                <input
                  type="text"
                  placeholder="Ex: Carenagem Lateral Direita"
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  className="w-full bg-bg rounded-xl px-3 py-2.5 text-sm text-text-main outline-none border border-border focus:border-accent placeholder:text-text-muted/40"
                />
                <textarea
                  placeholder="Observações adicionais..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-bg rounded-xl px-3 py-2.5 text-sm text-text-main outline-none border border-border focus:border-[#1db1f1] placeholder:text-text-muted/40 resize-none leading-relaxed"
                />
              </div>

              {/* Resumo inline */}
              <div className="flex flex-wrap gap-1.5 items-center p-3 bg-bg rounded-xl border border-border">
                <span className="text-[9px] font-bold text-text-muted uppercase mr-1">Resumo:</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border"
                  style={{ backgroundColor: currentColor + '20', color: currentColor, borderColor: currentColor + '40' }}
                >{selDamage}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-md font-bold"
                  style={{
                    backgroundColor: SEVERITY_LEVELS.find(s => s.id === selSeverity)?.color + '20',
                    color: SEVERITY_LEVELS.find(s => s.id === selSeverity)?.color,
                  }}
                >{SEVERITY_LEVELS.find(s => s.id === selSeverity)?.label}</span>
                {selSide && <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#1db1f1]/15 text-[#1db1f1]">{selSide}</span>}
                {selActions.length > 0 && <span className="text-[9px] text-text-muted">· {selActions.length} ação(ões)</span>}
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPendingPos(null)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-hover text-text-muted text-xs font-bold border border-border hover:bg-border-strong transition-colors"
                >CANCELAR</button>
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
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
              {pins.length} dano{pins.length > 1 ? 's' : ''} registrado{pins.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[9px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3" />LIMPAR TUDO
            </button>
          </div>
          <div className="divide-y divide-border">
            {pins.map(pin => {
              const pinColor   = DAMAGE_META[pin.damage]?.color ?? '#ff906d';
              const sv         = SEVERITY_LEVELS.find(s => s.id === pin.severity);
              const isExpanded = expandedPin === pin.id;
              return (
                <div key={pin.id} className="hover:bg-surface-hover transition-colors">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedPin(isExpanded ? null : pin.id)}
                  >
                    <span
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black text-black"
                      style={{ backgroundColor: pinColor }}
                    >{pin.number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text-main truncate">{pin.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[9px] font-bold" style={{ color: pinColor }}>{pin.damage}</p>
                        {sv && (
                          <span className="text-[8px] px-1.5 rounded font-bold"
                            style={{ backgroundColor: sv.color + '22', color: sv.color }}
                          >{sv.label}</span>
                        )}
                        {pin.side && <span className="text-[8px] text-text-muted">· {pin.side}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {pin.actions.length > 0 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] font-bold">{pin.actions.length}x</span>
                      )}
                      {parseInt(pin.severity) >= 3 && (
                        <AlertTriangle className="w-3 h-3" style={{ color: sv?.color }} />
                      )}
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-[#444]" /> : <ChevronDown className="w-3 h-3 text-[#444]" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-2.5 border-t border-border pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[9px] px-2 py-0.5 rounded-md font-bold border"
                              style={{ backgroundColor: pinColor + '20', color: pinColor, borderColor: pinColor + '40' }}
                            >{pin.category}</span>
                            {pin.side && (
                              <span className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-[#1db1f1]/10 text-[#1db1f1] border border-[#1db1f1]/20">{pin.side}</span>
                            )}
                          </div>
                          {pin.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {pin.actions.map(a => (
                                <span key={a} className="text-[8px] px-2 py-0.5 rounded-lg bg-surface text-text-muted border border-[#2a2a2a] flex items-center gap-0.5">
                                  <Wrench className="w-2 h-2" />{a}
                                </span>
                              ))}
                            </div>
                          )}
                          {pin.notes && (
                            <p className="text-[10px] text-text-muted italic leading-relaxed">{pin.notes}</p>
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
