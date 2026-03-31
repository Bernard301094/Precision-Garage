import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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

// Zonas calibradas para o SVG real (viewBox 0 0 64 64, escalado para %)
const MOTO_ZONES = [
  {id:'farol',       label:'Farol',               cx:20,  cy:26},
  {id:'guidao',      label:'Guidão',              cx:30,  cy:18},
  {id:'painel',      label:'Painel / Instrumento', cx:37,  cy:22},
  {id:'tanque',      label:'Tanque',              cx:44,  cy:28},
  {id:'banco',       label:'Banco',               cx:57,  cy:30},
  {id:'carenagem_l', label:'Carenagem Lateral',   cx:50,  cy:48},
  {id:'motor',       label:'Motor',               cx:50,  cy:60},
  {id:'escapamento', label:'Escapamento',         cx:65,  cy:70},
  {id:'para_lama_t', label:'Para-lama Traseiro',  cx:74,  cy:42},
  {id:'lanterna',    label:'Lanterna Traseira',   cx:80,  cy:36},
  {id:'pneu_d',      label:'Pneu Dianteiro',      cx:18,  cy:82},
  {id:'pneu_t',      label:'Pneu Traseiro',       cx:84,  cy:82},
  {id:'suspensao_d', label:'Suspensão Dianteira', cx:25,  cy:62},
  {id:'suspensao_t', label:'Suspensão Traseira',  cx:76,  cy:60},
  {id:'para_lama_d', label:'Para-lama Dianteiro', cx:15,  cy:60},
];

export interface DamagePin {
  id:string; x:number; y:number;
  damage:DamageType; label:string;
  zoneId?:string; number:number;
}
interface MotoMapProps { pins:DamagePin[]; onChange:(pins:DamagePin[])=>void; }

/*
  SVG original: MIT License — joypixels/emojione (https://github.com/joypixels/emojione)
  Modificado: fill trocado de #000 para cores do tema Precision Garage
*/
const MotoSVG = () => (
  <svg
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    className="w-full h-full"
    preserveAspectRatio="xMidYMid meet"
    style={{filter:'drop-shadow(0 4px 24px rgba(0,0,0,0.8))'}}
  >
    <defs>
      <linearGradient id="mg_body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c0c0c0"/>
        <stop offset="100%" stopColor="#666"/>
      </linearGradient>
      <linearGradient id="mg_dark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#888"/>
        <stop offset="100%" stopColor="#444"/>
      </linearGradient>
      <filter id="mg_glow">
        <feGaussianBlur stdDeviation="0.5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    {/* Sombra no chão */}
    <ellipse cx="32" cy="63" rx="28" ry="2" fill="rgba(0,0,0,0.5)"/>

    {/* Detalhe pequeno esquerdo (guidao/espelho) */}
    <path
      d="M13.895 39.35h-2.52c-1.754.23 1.685 1.96 1.685 1.96s1.685-1.239 1.685-1.614c-.001-.375-.85-.346-.85-.346"
      fill="#aaa"
    />
    {/* Detalhes de escudo/cabeçote */}
    <path
      d="M26.766 51.159c-.466.269-.93.875-1.03 1.346l-.19.894c-.1.472.009 1.028.241 1.236c.232.209.545 0 .694-.461l.86-2.661c.151-.464-.109-.624-.575-.354"
      fill="#777"
    />
    <path
      d="M38.883 50.143c-.465.271-.93.875-1.029 1.348l-.191.892c-.1.472.01 1.028.242 1.238c.232.208.545.001.695-.463l.859-2.659c.148-.466-.111-.625-.576-.356"
      fill="#777"
    />

    {/* Corpo principal da moto */}
    <path
      d="M52.625 43.558a9.41 9.41 0 0 0-7.074 3.182l-.646-.286c.207-.189.43-.385.689-.59c.41-.322.566-.688.574-1.051l12.426-5.883a3.774 3.774 0 0 0-.602-2.211c1.729-2.172 1.758-4.762 1.758-4.904V30.34h-1.5c-2.23 0-3.977.048-6.145.673c-1.482.428-2.537.888-3.318 1.386c.221-1.014.082-2.19-.785-3.442c0 0-5.709-5.956-12.273-7.799c1.965-1.562 2.613-3.287 2.613-6.885C38.342 7.505 32.745 2 25.865 2c-6.879 0-12.476 5.505-12.476 12.272c0 .49.032.925.087 1.322l-.017.006c-1.198.428 1.03 6.574 2.308 6.636c1.832 4.296 4.56 5.27 6.648 5.27c1.069 0 2.205-.282 3.319-.792l.342 4.041l-2.033 1.078l-.094-.084l-1.413-1.268l-.43-.387h-.581c-4.539 0-8.794 2.188-11.383 5.851l-.205.288c-1.218 1.707-2 2.915-1.781 4.1c.097.521.391.97.83 1.263c.401.27.97.646 1.618 1.074a10.353 10.353 0 0 0-5.775 2.272l1.386.142C3.676 46.732 2 49.563 2 52.779C2 57.873 6.197 62 11.375 62c4.079 0 7.539-2.565 8.829-6.143l.002.089a2.721 2.721 0 0 0 2.74 2.747c.087 0 .176-.003.267-.012l.038-.002l.038-.006l18.366-2.505l1.428-.194l-.141-1.41c-.014-.135-.016-.27-.02-.406a8.956 8.956 0 0 0-.037-.672a15.023 15.023 0 0 1-.061-1.934l.486.201a9.372 9.372 0 0 0-.061 1.025c0 5.094 4.197 9.221 9.375 9.221S62 57.873 62 52.779s-4.197-9.221-9.375-9.221m-7.756-4.788c4.592-2.287 1.193-4.477 7.658-6.342c1.986-.572 3.58-.613 5.723-.613c0 0 0 3.746-3.215 5.475c-6.537 3.516-11.785 3.834-11.785 3.834s-.059-1.519 1.619-2.354m-6.668 5.592a3.665 3.665 0 0 1 1.186 1.915c-1.242.205-1.855 1.041-2.24 1.568c-.012.018-.02.025-.031.041l1.085-3.524M25.382 24.699c-1.012.548-2.037.839-2.968.839c-2.376 0-3.855-1.9-4.767-3.986c3.711-1.563 8.254-4.11 10.052-5.979a2 2 0 0 0 .55.085c1.102 0 1.994-.879 1.994-1.961c0-1.083-.893-1.961-1.994-1.961c-.928 0-1.7.625-1.923 1.47c-2.677-.134-7.309.712-10.907 1.764a7.877 7.877 0 0 1-.031-.697c0-5.682 4.7-10.305 10.476-10.305c5.777 0 10.477 4.623 10.477 10.305c0 4.682-.797 5.097-6.999 8.33a255.278 255.278 0 0 0-3.96 2.096m-1.009 12.437c.09-.222.136-.438.153-.657l6.07-2.73a1.667 1.667 0 0 0 .843-1.848h.01l-.145-1.701l4.137 3.615c-.129-.018-.256-.045-.387-.045c-.252 0-.498.033-.73.1c-1.014.289-2.478.854-3.895 1.4c-.784.303-1.525.588-2.074.781c-1.199.418-1.977 1.377-1.977 2.44v.188a70.492 70.492 0 0 0-2.756-.568c.343-.269.587-.575.751-.975m9.621-1.613l-1.04 4.082l-1.77.416a45.073 45.073 0 0 0-3.307-.979v-.552c0-.466.461-.87.981-1.052c1.309-.458 3.564-1.384 5.136-1.915M19.677 32.92l.743-.311c.142-.061.288-.088.433-.088c.413 0 .803.23.975.619l.641 1.473c.953 2.183.953 2.183-1.975 3.409c-.401.169-.75.237-1.053.237c-1.194 0-1.661-1.07-1.761-1.301c-.771-1.76.375-2.646 1.335-3.128c.024-.383.268-.746.662-.91m-3.614 19.859c0 .212-.035.414-.063.619l1.913-.126a6.314 6.314 0 0 1-.625 2.294l-1.578-1.039a4.58 4.58 0 0 1-.643 1.063l1.723.834a6.56 6.56 0 0 1-1.71 1.682l-.847-1.695a4.64 4.64 0 0 1-1.033.617l1.071 1.537a6.625 6.625 0 0 1-2.394.645l.128-1.882c-.208.028-.414.062-.629.062c-.199 0-.388-.033-.581-.057l.147 1.88a6.625 6.625 0 0 1-2.401-.618l1.057-1.553a4.645 4.645 0 0 1-1.081-.631l-.847 1.695a6.576 6.576 0 0 1-1.71-1.682l1.723-.833a4.6 4.6 0 0 1-.643-1.063l-1.578 1.039a6.314 6.314 0 0 1-.625-2.294l1.913.126c-.028-.205-.063-.407-.063-.619c0-.197.035-.383.059-.572l-1.912.145a6.313 6.313 0 0 1 .628-2.359l1.578 1.039c.155-.371.367-.71.61-1.025l-1.73-.818a6.54 6.54 0 0 1 1.749-1.737l.848 1.695a4.617 4.617 0 0 1 1.081-.633l-1.057-1.553a6.578 6.578 0 0 1 2.333-.614l-.128 1.882c.208-.027.414-.063.629-.063s.421.035.629.063l-.127-1.882a6.594 6.594 0 0 1 1.859.417l-1.659 3.344a2.85 2.85 0 0 0-.701-.098c-1.554 0-2.813 1.238-2.813 2.768s1.259 2.766 2.813 2.766c1.553 0 2.813-1.236 2.813-2.766c0-.8-.349-1.514-.899-2.019l2.145-3.017c.514.401.984.855 1.357 1.391l-1.723.834c.247.313.468.645.627 1.015l1.563-1.054c.361.721.59 1.514.655 2.355l-1.913-.125c.026.205.062.407.062.62m25.33.864c.039.357.021.715.057 1.064l-18.368 2.506a1.581 1.581 0 0 1-.136.006c-.8 0-1.24-.633-1.24-1.295c0 0-.098-6.318-.956-7.871c-.439-.795-2.773-2.322-2.809-2.346c0 0-6.095-3.979-8.11-5.331c-.745-.499.669-2.354 1.543-3.589a12.35 12.35 0 0 1 7.092-4.842c-.31.248-.563.553-.725.908c-1.137.729-1.61 1.592-1.756 2.402c-.291.262-.58.545-.86.867c-.392.448-1.699 2.363 0 2.363c.332 0 .986.044 1.861.133a3.202 3.202 0 0 0 2.455 1.117c.527 0 1.08-.121 1.643-.357l.363-.152c3.213.525 7.029 1.342 10.084 2.486c.297.111.564.219.806.324l-1.556 6.113l-.705-.174a3.614 3.614 0 0 0-1.471-.056c.09-.108.033-.271-.223-.461l-6.418-4.747c-.441-.326-.803-.229-.803.217s.359 1.078.797 1.408l4.144 3.115c.439.33 1.249.6 1.8.6h.156c-1.08.357-1.948 1.215-2.232 2.365l8.163 2.017c.947.233 1.898-.312 2.123-1.224l.307-1.228c2.166-.263 1.76-2.276 3.551-2.276c.691 0 1.299.103 1.83.244c-.427 1.42-.599 3.889-.407 5.694m-.651-9.03l-.652-.287l3.65-1.768a25.284 25.284 0 0 0 2.982-.524l-1.502.937c-.199-.209-.352-.336-.352-.336l-4.126 1.978m8.178 2.84l.496.994l-1.109-.49c.199-.174.392-.355.613-.504m8.393 5.326c0 .212-.035.414-.063.619l1.912-.126a6.314 6.314 0 0 1-.625 2.294l-1.578-1.039a4.546 4.546 0 0 1-.643 1.063l1.723.833a6.525 6.525 0 0 1-1.709 1.682l-.848-1.694c-.318.242-.656.46-1.031.616l1.07 1.537a6.624 6.624 0 0 1-2.395.645l.127-1.882c-.207.028-.414.062-.629.062c-.199 0-.389-.033-.58-.057l.146 1.88a6.62 6.62 0 0 1-2.4-.618l1.057-1.553a4.652 4.652 0 0 1-1.082-.631l-.846 1.695a6.525 6.525 0 0 1-1.709-1.682l1.723-.834a4.559 4.559 0 0 1-.643-1.063l-1.578 1.039a6.294 6.294 0 0 1-.625-2.294l1.057.069l3.623 1.5a2.815 2.815 0 0 0 1.857.703c1.553 0 2.813-1.236 2.813-2.766c0-1.385-1.035-2.521-2.385-2.725l-2.799-1.237c.189-.114.387-.218.594-.302L49.79 46.96a6.59 6.59 0 0 1 2.332-.614l-.127 1.882c.207-.027.414-.063.629-.063s.422.035.629.063l-.127-1.882a6.61 6.61 0 0 1 2.332.614l-1.057 1.553c.377.152.721.361 1.043.601l.828-1.702a6.537 6.537 0 0 1 1.768 1.721l-1.723.833c.246.313.467.646.627 1.016l1.563-1.054c.361.721.59 1.514.654 2.355l-1.911-.123c.027.204.063.406.063.619"
      fill="url(#mg_body)"
    />

    {/* Farol — azul ciano */}
    <ellipse cx="22" cy="17" rx="4" ry="4.5" fill="#0a1a28" stroke="#1db1f1" strokeWidth="0.4" filter="url(#mg_glow)"/>
    <ellipse cx="22" cy="17" rx="2.2" ry="2.6" fill="#1db1f1" opacity="0.7" filter="url(#mg_glow)"/>

    {/* Lanterna traseira — vermelho */}
    <rect x="57" y="24" width="4" height="2.5" rx="0.8" fill="#ef4444" opacity="0.9" filter="url(#mg_glow)"/>
    <rect x="57.4" y="24.3" width="1.8" height="1.5" rx="0.4" fill="#fca5a5" opacity="0.8"/>

    {/* Tanque — accent da app */}
    <path
      d="M33 14 C36 10 44 10 47 14 L46 20 L32 20 Z"
      fill="#1e1e1e" stroke="#ff906d" strokeWidth="0.5" opacity="0.7"
    />

    {/* Escape — gradiente metálico */}
    <path
      d="M42 47 Q52 49 58 45"
      stroke="#888" strokeWidth="1.8" strokeLinecap="round" fill="none"
    />
    <path
      d="M42 47 Q52 50.5 58 46.5"
      stroke="#555" strokeWidth="1" strokeLinecap="round" fill="none"
    />
    <ellipse cx="58.5" cy="45.8" rx="1" ry="1.5" fill="#666" stroke="#888" strokeWidth="0.4" transform="rotate(-20,58.5,45.8)"/>
  </svg>
);

// ══ COMPONENTE PRINCIPAL ════════════════════════════════════════════════════════════
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
    return bestDist<22 ? best : null;
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

      {/* ─ CANVAS ──────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
        className="relative w-full rounded-2xl overflow-hidden border border-[#282828] cursor-crosshair select-none touch-none"
        style={{
          paddingBottom:'100%',
          background:'radial-gradient(ellipse at 50% 70%, #161616 0%, #080808 100%)',
        }}
      >
        {/* grid sutil */}
        <div className="absolute inset-0"
          style={{
            backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
            backgroundSize:'16px 16px',
          }}
        />

        {/* SVG */}
        <div className="absolute inset-0 flex items-center justify-center p-4" style={{pointerEvents:'none'}}>
          <MotoSVG/>
        </div>

        {/* Pins confirmados */}
        {pins.map(pin=>(
          <div key={pin.id} className="absolute z-10"
            style={{left:`${pin.x}%`,top:`${pin.y}%`,transform:'translate(-50%,-50%)'}}>
            <button
              onClick={e=>{e.stopPropagation();setActivePin(activePin===pin.id?null:pin.id);}}
              className="relative group focus:outline-none"
            >
              <span className="absolute -inset-2 rounded-full animate-ping opacity-25"
                style={{backgroundColor:DAMAGE_META[pin.damage]?.color}}/>
              <span
                className="relative flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black text-black shadow-xl border-2 border-black/30 transition-transform group-hover:scale-125"
                style={{backgroundColor:DAMAGE_META[pin.damage]?.color}}
              >{pin.number}</span>
              <AnimatePresence>
                {activePin===pin.id&&(
                  <motion.div
                    initial={{opacity:0,scale:0.85,y:4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.85}}
                    onClick={e=>e.stopPropagation()}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 min-w-[148px] bg-[#111] border border-[#333] rounded-2xl p-3 shadow-2xl text-left pointer-events-auto"
                  >
                    <p className="font-bold text-xs text-white leading-tight">{pin.label}</p>
                    <p className="text-[10px] mt-0.5" style={{color:DAMAGE_META[pin.damage]?.color}}>{pin.damage}</p>
                    <button
                      onClick={e=>{e.stopPropagation();removePin(pin.id);setActivePin(null);}}
                      className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20"
                    ><Trash2 className="w-3 h-3"/>REMOVER</button>
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111] border-r border-b border-[#333] rotate-45"/>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        ))}

        {/* Pin pendente */}
        {pendingPos&&(
          <div className="absolute z-20 pointer-events-none"
            style={{left:`${pendingPos.x}%`,top:`${pendingPos.y}%`,transform:'translate(-50%,-50%)'}}>
            <span className="block w-5 h-5 rounded-full bg-white/90 border-2 border-[#ff906d] shadow-xl animate-pulse"/>
          </div>
        )}

        {/* Hint */}
        {pins.length===0&&!pendingPos&&(
          <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#333]">
              <MapPin className="w-3 h-3 text-[#ff906d]"/>Toque na moto para marcar um dano
            </span>
          </div>
        )}

        {/* Contador */}
        {pins.length>0&&(
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-[#333]">
            <MapPin className="w-3 h-3 text-[#ff906d]"/>
            <span className="text-[10px] font-black text-white">{pins.length}</span>
          </div>
        )}
      </div>

      {/* ─ PAINEL CONFIRMAÇÃO ────────────────────────────────────────── */}
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
                      selectedDamage===d?DAMAGE_META[d].badge+' scale-[1.03] shadow-md':'bg-[#0e0e0e] text-[#555] border-[#222] hover:border-[#444]'
                    }`}>
                    <span className="block w-2 h-2 rounded-full mx-auto mb-1" style={{backgroundColor:DAMAGE_META[d].color}}/>
                    {d}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Componente (ex: Carenagem Lateral)"
                value={customLabel} onChange={e=>setCustomLabel(e.target.value)}
                onClick={e=>e.stopPropagation()}
                className="w-full bg-[#0e0e0e] rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-[#282828] focus:border-[#ff906d] placeholder:text-[#333] transition-colors"/>
              <div className="flex gap-2">
                <button onClick={e=>{e.stopPropagation();setPendingPos(null);setCustomLabel('');}}
                  className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-[#adaaaa] text-xs font-bold border border-[#282828] hover:bg-[#222]">CANCELAR</button>
                <button onClick={e=>{e.stopPropagation();confirmPin();}}
                  className="flex-1 py-2.5 rounded-xl text-black text-xs font-bold hover:opacity-90 shadow-lg"
                  style={{backgroundColor:DAMAGE_META[selectedDamage].color}}>CONFIRMAR DANO #{nextNumber}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─ LISTA DE DANOS ────────────────────────────────────────────── */}
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
