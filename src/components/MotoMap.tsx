import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// ── Tipos de dano
const DAMAGE_TYPES = ['Risco Leve','Risco Profundo','Amassado','Pintura','Trinca','Oxidação'] as const;
type DamageType = typeof DAMAGE_TYPES[number];

const DAMAGE_META: Record<DamageType,{color:string;badge:string}> = {
  'Risco Leve':     {color:'#eab308', badge:'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'},
  'Risco Profundo': {color:'#f97316', badge:'bg-orange-500/15 text-orange-400 border-orange-500/30'},
  'Amassado':       {color:'#ef4444', badge:'bg-red-500/15 text-red-400 border-red-500/30'},
  'Pintura':        {color:'#3b82f6', badge:'bg-blue-500/15 text-blue-400 border-blue-500/30'},
  'Trinca':         {color:'#a855f7', badge:'bg-purple-500/15 text-purple-400 border-purple-500/30'},
  'Oxidação':       {color:'#d97706', badge:'bg-amber-600/15 text-amber-500 border-amber-600/30'},
};

// ── Zonas calibradas para a imagem 16:9 da moto (% do container)
// A moto ocupa aprox. 85% da largura centrada, iniciando ~8% do topo e terminando ~92% da altura
const MOTO_ZONES = [
  {id:'farol',       label:'Farol',               cx:13,  cy:42},
  {id:'para_lama_d', label:'Para-lama Dianteiro', cx:14,  cy:65},
  {id:'pneu_d',      label:'Pneu Dianteiro',      cx:17,  cy:82},
  {id:'suspensao_d', label:'Suspensão Dianteira', cx:22,  cy:58},
  {id:'guidao',      label:'Guidão',              cx:28,  cy:28},
  {id:'painel',      label:'Painel / Instrumento', cx:35,  cy:32},
  {id:'tanque',      label:'Tanque',              cx:46,  cy:28},
  {id:'carenagem_l', label:'Carenagem Lateral',   cx:50,  cy:55},
  {id:'motor',       label:'Motor',               cx:50,  cy:68},
  {id:'banco',       label:'Banco',               cx:62,  cy:32},
  {id:'escapamento', label:'Escapamento',         cx:68,  cy:74},
  {id:'suspensao_t', label:'Suspensão Traseira',  cx:75,  cy:58},
  {id:'para_lama_t', label:'Para-lama Traseiro',  cx:78,  cy:45},
  {id:'lanterna',    label:'Lanterna Traseira',   cx:84,  cy:38},
  {id:'pneu_t',      label:'Pneu Traseiro',       cx:85,  cy:82},
];

export interface DamagePin {
  id:string; x:number; y:number;
  damage:DamageType; label:string;
  zoneId?:string; number:number;
}
interface MotoMapProps { pins:DamagePin[]; onChange:(pins:DamagePin[])=>void; }

// ── URL da imagem gerada por IA (moto naked sport vista lateral, fundo preto)
const MOTO_IMAGE_URL = 'https://user-gen-media-assets.s3.amazonaws.com/gemini_images/97bb322c-9792-493b-b8db-08ac63d7c08e.png';

// ═══════════════════════════════════════════════════════════════════════════
export const MotoMap: React.FC<MotoMapProps> = ({ pins, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingPos, setPendingPos]         = useState<{x:number;y:number}|null>(null);
  const [selectedDamage, setSelectedDamage] = useState<DamageType>('Risco Leve');
  const [customLabel, setCustomLabel]       = useState('');
  const [nearestZone, setNearestZone]       = useState('');
  const [activePin, setActivePin]           = useState<string|null>(null);
  const [showLegend, setShowLegend]         = useState(false);

  const nextNumber = pins.length > 0 ? Math.max(...pins.map(p=>p.number))+1 : 1;

  const getNearest = (xPct:number, yPct:number) => {
    let best=MOTO_ZONES[0], bestDist=Infinity;
    MOTO_ZONES.forEach(z=>{ const d=Math.hypot(z.cx-xPct,z.cy-yPct); if(d<bestDist){bestDist=d;best=z;} });
    return bestDist<20 ? best : null;
  };

  const getCoords = (e:React.MouseEvent|React.TouchEvent) => {
    if(!containerRef.current) return null;
    const rect=containerRef.current.getBoundingClientRect();
    const clientX='touches' in e?e.touches[0].clientX:e.clientX;
    const clientY='touches' in e?e.touches[0].clientY:e.clientY;
    return { x:((clientX-rect.left)/rect.width)*100, y:((clientY-rect.top)/rect.height)*100 };
  };

  const handleInteraction = (e:React.MouseEvent|React.TouchEvent) => {
    e.preventDefault();
    const coords=getCoords(e); if(!coords) return;
    const zone=getNearest(coords.x,coords.y);
    setNearestZone(zone?.label||'');
    setCustomLabel(zone?.label||'');
    setPendingPos(coords);
    setActivePin(null);
  };

  const confirmPin = () => {
    if(!pendingPos) return;
    const zone=getNearest(pendingPos.x,pendingPos.y);
    onChange([...pins,{
      id:Date.now().toString(),
      x:pendingPos.x, y:pendingPos.y,
      damage:selectedDamage,
      label:customLabel.trim()||nearestZone||selectedDamage,
      zoneId:zone?.id,
      number:nextNumber,
    }]);
    setPendingPos(null); setCustomLabel('');
  };

  const removePin=(id:string)=>onChange(pins.filter(p=>p.id!==id));
  const clearAll=()=>onChange([]);

  return (
    <div className="space-y-4">

      {/* ─ CANVAS DA MOTO ─────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
        className="relative w-full rounded-2xl overflow-hidden border border-[#282828] cursor-crosshair select-none touch-none"
        style={{ paddingBottom:'56.25%', background:'#080808' }}
      >
        {/* Imagem da moto (IA-generated) */}
        <img
          src={MOTO_IMAGE_URL}
          alt="Moto — Vista Lateral"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
          style={{userSelect:'none'}}
        />

        {/* Véu de contraste sutil para os pins aparecerem melhor */}
        <div className="absolute inset-0 pointer-events-none"
          style={{background:'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.35) 100%)'}}
        />

        {/* Pins confirmados */}
        {pins.map(pin=>(
          <div key={pin.id} className="absolute z-10"
            style={{left:`${pin.x}%`,top:`${pin.y}%`,transform:'translate(-50%,-50%)'}}>
            <button
              onClick={e=>{e.stopPropagation();setActivePin(activePin===pin.id?null:pin.id);}}
              className="relative group focus:outline-none"
            >
              {/* Anel pulsante */}
              <span className="absolute -inset-2 rounded-full animate-ping opacity-30"
                style={{backgroundColor:DAMAGE_META[pin.damage]?.color}}/>
              {/* Círculo numerado */}
              <span
                className="relative flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black text-black shadow-2xl border-2 border-white/40 transition-transform group-hover:scale-125"
                style={{backgroundColor:DAMAGE_META[pin.damage]?.color}}
              >{pin.number}</span>

              {/* Popup ao tocar */}
              <AnimatePresence>
                {activePin===pin.id&&(
                  <motion.div
                    initial={{opacity:0,scale:0.85,y:4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.85}}
                    onClick={e=>e.stopPropagation()}
                    className="absolute bottom-9 left-1/2 -translate-x-1/2 z-30 min-w-[152px] bg-[#111] border border-[#383838] rounded-2xl p-3 shadow-2xl text-left pointer-events-auto"
                  >
                    <p className="font-bold text-xs text-white leading-tight">{pin.label}</p>
                    <p className="text-[10px] mt-0.5 font-semibold" style={{color:DAMAGE_META[pin.damage]?.color}}>{pin.damage}</p>
                    <button
                      onClick={e=>{e.stopPropagation();removePin(pin.id);setActivePin(null);}}
                      className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                    ><Trash2 className="w-3 h-3"/>REMOVER</button>
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111] border-r border-b border-[#383838] rotate-45"/>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        ))}

        {/* Pin pendente (onde tocou) */}
        {pendingPos&&(
          <div className="absolute z-20 pointer-events-none"
            style={{left:`${pendingPos.x}%`,top:`${pendingPos.y}%`,transform:'translate(-50%,-50%)'}}>
            <span className="block w-6 h-6 rounded-full bg-white/90 border-2 border-[#ff906d] shadow-xl animate-pulse"/>
          </div>
        )}

        {/* Hint inicial */}
        {pins.length===0&&!pendingPos&&(
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#333]">
              <MapPin className="w-3 h-3 text-[#ff906d]"/>Toque na moto para marcar um dano
            </span>
          </div>
        )}

        {/* Contador top-right */}
        {pins.length>0&&(
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-[#333]">
            <MapPin className="w-3 h-3 text-[#ff906d]"/>
            <span className="text-[10px] font-black text-white">{pins.length}</span>
          </div>
        )}
      </div>

      {/* ─ PAINEL CONFIRMAÇÃO ───────────────────────────────────────────── */}
      <AnimatePresence>
        {pendingPos&&(
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
            className="bg-[#151515] border border-[#ff906d]/30 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black"
                  style={{backgroundColor:DAMAGE_META[selectedDamage].color}}>{nextNumber}</span>
                <p className="text-xs font-bold text-[#ff906d] uppercase tracking-widest">Novo Dano</p>
              </div>
              {nearestZone&&(
                <span className="text-[9px] font-bold text-[#adaaaa] bg-[#1a1a1a] px-2 py-0.5 rounded-lg border border-[#282828]">
                  📍 {nearestZone}
                </span>
              )}
            </div>
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {DAMAGE_TYPES.map(d=>(
                  <button key={d} onClick={e=>{e.stopPropagation();setSelectedDamage(d);}}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all ${
                      selectedDamage===d?DAMAGE_META[d].badge+' scale-[1.03]':'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                    }`}>
                    <span className="block w-2 h-2 rounded-full mx-auto mb-1" style={{backgroundColor:DAMAGE_META[d].color}}/>
                    {d}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Componente (ex: Carenagem Lateral)"
                value={customLabel} onChange={e=>setCustomLabel(e.target.value)}
                onClick={e=>e.stopPropagation()}
                className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-[#282828] focus:border-[#ff906d] placeholder:text-[#333]"/>
              <div className="flex gap-2">
                <button onClick={e=>{e.stopPropagation();setPendingPos(null);setCustomLabel('');}}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-[#adaaaa] text-xs font-bold border border-[#282828]">CANCELAR</button>
                <button onClick={e=>{e.stopPropagation();confirmPin();}}
                  className="flex-1 py-2.5 rounded-xl text-black text-xs font-bold shadow-lg"
                  style={{backgroundColor:DAMAGE_META[selectedDamage].color}}>CONFIRMAR DANO #{nextNumber}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─ LISTA DE DANOS ──────────────────────────────────────────────── */}
      {pins.length>0&&(
        <div className="bg-[#151515] border border-[#222] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
            <p className="text-[10px] font-black text-[#adaaaa] uppercase tracking-widest">
              {pins.length} dano{pins.length>1?'s':''} registrado{pins.length>1?'s':''}
            </p>
            <button onClick={clearAll}
              className="flex items-center gap-1 text-[9px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10">
              <Trash2 className="w-3 h-3"/>LIMPAR TUDO
            </button>
          </div>
          <div className="divide-y divide-[#1e1e1e]">
            {pins.map(pin=>(
              <motion.div key={pin.id}
                initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] transition-colors group">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black"
                  style={{backgroundColor:DAMAGE_META[pin.damage]?.color}}>{pin.number}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{pin.label}</p>
                  <p className="text-[9px] font-bold mt-0.5" style={{color:DAMAGE_META[pin.damage]?.color}}>{pin.damage}</p>
                </div>
                <span className={`hidden sm:block px-2 py-0.5 rounded-lg text-[9px] font-bold border flex-shrink-0 ${DAMAGE_META[pin.damage]?.badge}`}>
                  {pin.damage}
                </span>
                <button onClick={()=>removePin(pin.id)}
                  className="flex-shrink-0 p-1.5 text-[#484847] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </motion.div>
            ))}
          </div>
          <div className="border-t border-[#1e1e1e]">
            <button onClick={()=>setShowLegend(v=>!v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest hover:bg-[#1a1a1a] transition-colors">
              Legenda de Tipos de Dano
              {showLegend?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>}
            </button>
            <AnimatePresence>
              {showLegend&&(
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    {DAMAGE_TYPES.map(d=>(
                      <div key={d} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:DAMAGE_META[d].color}}/>
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
