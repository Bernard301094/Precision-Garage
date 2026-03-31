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

const MOTO_ZONES = [
  {id:'farol',       label:'Farol',               cx:13, cy:42},
  {id:'carenagem_f', label:'Carenagem Frontal',   cx:21, cy:55},
  {id:'guidao',      label:'Guidão',              cx:28, cy:32},
  {id:'tanque',      label:'Tanque',              cx:50, cy:30},
  {id:'banco',       label:'Banco',               cx:67, cy:34},
  {id:'carenagem_l', label:'Carenagem Lateral',   cx:50, cy:64},
  {id:'motor',       label:'Motor',               cx:50, cy:78},
  {id:'escapamento', label:'Escapamento',         cx:68, cy:83},
  {id:'para_lama_t', label:'Para-lama Traseiro',  cx:80, cy:50},
  {id:'lanterna',    label:'Lanterna Traseira',   cx:88, cy:55},
  {id:'pneu_d',      label:'Pneu Dianteiro',      cx:16, cy:88},
  {id:'pneu_t',      label:'Pneu Traseiro',       cx:82, cy:88},
  {id:'suspensao_d', label:'Suspensão Dianteira', cx:22, cy:65},
  {id:'suspensao_t', label:'Suspensão Traseira',  cx:77, cy:65},
  {id:'para_lama_d', label:'Para-lama Dianteiro', cx:13, cy:65},
];

export interface DamagePin {
  id:string; x:number; y:number;
  damage:DamageType; label:string;
  zoneId?:string; number:number;
}
interface MotoMapProps { pins:DamagePin[]; onChange:(pins:DamagePin[])=>void; }

/* ═══════════════════════════════════════════════════════════════════════════
   SVG — Moto Naked Sport — Vista Lateral Direita — Totalmente Redesenhada
   ViewBox: 0 0 600 300
═══════════════════════════════════════════════════════════════════════════ */
const MotoSVG = () => (
  <svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" fill="none">
    <defs>
      {/* Pneu */}
      <radialGradient id="rg_tire" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#2c2c2c"/>
        <stop offset="70%" stopColor="#181818"/>
        <stop offset="100%" stopColor="#0a0a0a"/>
      </radialGradient>
      {/* Aro */}
      <radialGradient id="rg_rim" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#4a4a4a"/>
        <stop offset="100%" stopColor="#1a1a1a"/>
      </radialGradient>
      {/* Tanque */}
      <linearGradient id="lg_tank" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3a3a3a"/>
        <stop offset="40%" stopColor="#242424"/>
        <stop offset="100%" stopColor="#141414"/>
      </linearGradient>
      {/* Carenagem lateral */}
      <linearGradient id="lg_fairing" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2a2a2a"/>
        <stop offset="100%" stopColor="#111"/>
      </linearGradient>
      {/* Motor */}
      <linearGradient id="lg_engine" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#303030"/>
        <stop offset="100%" stopColor="#161616"/>
      </linearGradient>
      {/* Escape */}
      <linearGradient id="lg_exhaust" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#383838"/>
        <stop offset="60%" stopColor="#606060"/>
        <stop offset="100%" stopColor="#888"/>
      </linearGradient>
      {/* Chassi */}
      <linearGradient id="lg_frame" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#b0b0b0"/>
        <stop offset="100%" stopColor="#606060"/>
      </linearGradient>
      {/* Reflexo tanque */}
      <linearGradient id="lg_tank_shine" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.12)"/>
        <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
      </linearGradient>
      {/* Farol glow */}
      <radialGradient id="rg_headlight" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#60d0ff" stopOpacity="0.9"/>
        <stop offset="100%" stopColor="#1d8bb1" stopOpacity="0.3"/>
      </radialGradient>
      {/* Lanterna glow */}
      <radialGradient id="rg_taillight" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ff5555" stopOpacity="1"/>
        <stop offset="100%" stopColor="#aa0000" stopOpacity="0.4"/>
      </radialGradient>
      {/* Sombra projetada no chão */}
      <radialGradient id="rg_shadow" cx="50%" cy="50%" rx="50%" ry="50%">
        <stop offset="0%" stopColor="rgba(0,0,0,0.55)"/>
        <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
      </radialGradient>
      {/* Glow filter */}
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow_sm" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      {/* Drop shadow suave */}
      <filter id="dshadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.6"/>
      </filter>
    </defs>

    {/* ══ SOMBRA NO CHÃO ══════════════════════════════════════════════════ */}
    <ellipse cx="300" cy="276" rx="220" ry="14" fill="url(#rg_shadow)" opacity="0.7"/>

    {/* ══ RODA TRASEIRA ══════════════════════════════════════════════════ */}
    {/* pneu externo */}
    <circle cx="460" cy="224" r="68" fill="url(#rg_tire)"/>
    {/* textura pneu */}
    <circle cx="460" cy="224" r="68" fill="none" stroke="#111" strokeWidth="12"/>
    <circle cx="460" cy="224" r="68" fill="none" stroke="#2a2a2a" strokeWidth="2.5"/>
    <circle cx="460" cy="224" r="62" fill="none" stroke="#222" strokeWidth="1" strokeDasharray="5 4"/>
    {/* aro */}
    <circle cx="460" cy="224" r="52" fill="url(#rg_rim)" stroke="#ff906d" strokeWidth="2.5"/>
    <circle cx="460" cy="224" r="46" fill="none" stroke="#3a3a3a" strokeWidth="1"/>
    {/* raios — 9 raios cruzados */}
    {Array.from({length:9},(_,i)=>i*(180/9)).map(a=>(
      <g key={a}>
        <line
          x1={460+18*Math.cos((a-6)*Math.PI/180)} y1={224+18*Math.sin((a-6)*Math.PI/180)}
          x2={460+50*Math.cos((a+6)*Math.PI/180)} y2={224+50*Math.sin((a+6)*Math.PI/180)}
          stroke="#555" strokeWidth="1.8" strokeLinecap="round"/>
        <line
          x1={460+18*Math.cos((a+186)*Math.PI/180)} y1={224+18*Math.sin((a+186)*Math.PI/180)}
          x2={460+50*Math.cos((a+174)*Math.PI/180)} y2={224+50*Math.sin((a+174)*Math.PI/180)}
          stroke="#555" strokeWidth="1.8" strokeLinecap="round"/>
      </g>
    ))}
    {/* cubo */}
    <circle cx="460" cy="224" r="12" fill="#222" stroke="#666" strokeWidth="2"/>
    <circle cx="460" cy="224" r="5"  fill="#444" stroke="#888" strokeWidth="1"/>
    {/* brilho aro */}
    <path d="M416 188 Q430 178 450 178" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeLinecap="round" fill="none"/>

    {/* ══ RODA DIANTEIRA ════════════════════════════════════════════════ */}
    <circle cx="118" cy="224" r="65" fill="url(#rg_tire)"/>
    <circle cx="118" cy="224" r="65" fill="none" stroke="#111" strokeWidth="11"/>
    <circle cx="118" cy="224" r="65" fill="none" stroke="#2a2a2a" strokeWidth="2.5"/>
    <circle cx="118" cy="224" r="59" fill="none" stroke="#222" strokeWidth="1" strokeDasharray="5 4"/>
    <circle cx="118" cy="224" r="50" fill="url(#rg_rim)" stroke="#ff906d" strokeWidth="2.5"/>
    <circle cx="118" cy="224" r="44" fill="none" stroke="#3a3a3a" strokeWidth="1"/>
    {Array.from({length:9},(_,i)=>i*(180/9)).map(a=>(
      <g key={a}>
        <line
          x1={118+17*Math.cos((a-6)*Math.PI/180)} y1={224+17*Math.sin((a-6)*Math.PI/180)}
          x2={118+48*Math.cos((a+6)*Math.PI/180)} y2={224+48*Math.sin((a+6)*Math.PI/180)}
          stroke="#555" strokeWidth="1.8" strokeLinecap="round"/>
        <line
          x1={118+17*Math.cos((a+186)*Math.PI/180)} y1={224+17*Math.sin((a+186)*Math.PI/180)}
          x2={118+48*Math.cos((a+174)*Math.PI/180)} y2={224+48*Math.sin((a+174)*Math.PI/180)}
          stroke="#555" strokeWidth="1.8" strokeLinecap="round"/>
      </g>
    ))}
    <circle cx="118" cy="224" r="12" fill="#222" stroke="#666" strokeWidth="2"/>
    <circle cx="118" cy="224" r="5"  fill="#444" stroke="#888" strokeWidth="1"/>
    <path d="M78 192 Q90 182 108 180" stroke="rgba(255,255,255,0.12)" strokeWidth="4" strokeLinecap="round" fill="none"/>

    {/* ══ SUSPENSÃO DIANTEIRA (garfo telescópico) ═══════════════════════ */}
    {/* tubo externo esquerdo */}
    <path d="M110 160 C108 178 112 200 118 220" stroke="#888" strokeWidth="7" strokeLinecap="round" fill="none"/>
    {/* tubo externo direito */}
    <path d="M124 158 C122 176 126 200 128 220" stroke="#777" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
    {/* brilho garfo */}
    <path d="M111 162 C110 178 113 202 118 222" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* cursor (parte superior) */}
    <path d="M110 160 C112 148 120 140 130 132" stroke="#aaa" strokeWidth="6.5" strokeLinecap="round" fill="none"/>
    <path d="M124 158 C126 148 132 140 142 133" stroke="#888" strokeWidth="5" strokeLinecap="round" fill="none"/>
    {/* canopla */}
    <rect x="108" y="156" width="22" height="8" rx="4" fill="#333" stroke="#555" strokeWidth="1"/>
    {/* eixo dianteiro */}
    <line x1="106" y1="222" x2="130" y2="222" stroke="#666" strokeWidth="3.5" strokeLinecap="round"/>

    {/* ══ CHASSI PRINCIPAL (backbone tubular) ══════════════════════════ */}
    {/* tubo superior principal */}
    <path
      d="M142 130 C158 108 185 92 222 82 C258 72 295 72 328 80 C358 88 382 104 400 128"
      stroke="url(#lg_frame)" strokeWidth="8" strokeLinecap="round" fill="none" filter="url(#dshadow)"/>
    {/* tubo inferior (craddle) */}
    <path
      d="M148 138 C150 165 155 188 162 200 C175 215 210 222 258 222 C306 222 360 218 392 205 L408 180"
      stroke="#555" strokeWidth="5" strokeLinecap="round" fill="none"/>
    {/* tubo diagonal motor */}
    <path d="M222 82 L228 222" stroke="#4a4a4a" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    <path d="M328 80 L336 218" stroke="#4a4a4a" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    {/* cinto central */}
    <path d="M228 150 L336 148" stroke="#404040" strokeWidth="3" strokeLinecap="round" fill="none"/>
    {/* subquadro traseiro */}
    <path d="M328 80 C345 68 375 65 405 75 C420 82 428 95 425 112 L408 130 L400 128"
      stroke="#666" strokeWidth="4" strokeLinecap="round" fill="none"/>
    <path d="M375 65 L380 112" stroke="#555" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

    {/* ══ CARENAGEM LATERAL (corpo da moto) ════════════════════════════ */}
    <path
      d="M162 138 C158 160 158 188 162 200 L222 210 L336 208 L344 180 L340 138 L310 130 L228 128 Z"
      fill="url(#lg_fairing)" stroke="#303030" strokeWidth="1.5" opacity="0.9"/>
    {/* painel esportivo lateral esquerdo */}
    <path
      d="M165 155 C163 175 164 195 168 205 L222 210 L228 165 Z"
      fill="#1e1e1e" stroke="#ff906d" strokeWidth="1" opacity="0.6"/>
    {/* detalhe ventilação */}
    {[170,178,186].map(y=>(
      <path key={y} d={`M170 ${y} Q190 ${y-2} 210 ${y}`} stroke="#333" strokeWidth="1" fill="none"/>
    ))}

    {/* ══ MOTOR (twin-cylinder) ════════════════════════════════════════ */}
    {/* bloco principal */}
    <rect x="220" y="148" width="148" height="76" rx="10" fill="url(#lg_engine)" stroke="#3a3a3a" strokeWidth="2" filter="url(#dshadow)"/>
    {/* nervuras de resfriamento */}
    {[160,170,180,190,200].map(y=>(
      <path key={y} d={`M222 ${y} L366 ${y}`} stroke="#262626" strokeWidth="0.8"/>
    ))}
    {/* cilindro 1 */}
    <rect x="234" y="128" width="42" height="32" rx="6" fill="#282828" stroke="#4a4a4a" strokeWidth="1.5"/>
    <rect x="237" y="131" width="36" height="8" rx="3" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
    <path d="M237 143 Q255 140 272 143" stroke="#333" strokeWidth="1" fill="none"/>
    {/* cilindro 2 */}
    <rect x="290" y="128" width="42" height="32" rx="6" fill="#282828" stroke="#4a4a4a" strokeWidth="1.5"/>
    <rect x="293" y="131" width="36" height="8" rx="3" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
    <path d="M293 143 Q311 140 328 143" stroke="#333" strokeWidth="1" fill="none"/>
    {/* válvulas */}
    <rect x="244" y="124" width="8" height="6" rx="2" fill="#1a1a1a" stroke="#444" strokeWidth="1"/>
    <rect x="258" y="124" width="8" height="6" rx="2" fill="#1a1a1a" stroke="#444" strokeWidth="1"/>
    <rect x="300" y="124" width="8" height="6" rx="2" fill="#1a1a1a" stroke="#444" strokeWidth="1"/>
    <rect x="314" y="124" width="8" height="6" rx="2" fill="#1a1a1a" stroke="#444" strokeWidth="1"/>
    {/* cárter */}
    <path d="M220 224 C222 234 230 240 248 242 L340 242 C356 240 364 234 368 224 Z"
      fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1.5"/>
    {/* tampa alternador esq */}
    <ellipse cx="214" cy="186" rx="14" ry="20" fill="#222" stroke="#3a3a3a" strokeWidth="1.5"/>
    <ellipse cx="214" cy="186" rx="8"  ry="12" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
    <circle  cx="214" cy="186" r="3"   fill="#2a2a2a" stroke="#555" strokeWidth="1"/>
    {/* tampa embreagem dir */}
    <ellipse cx="374" cy="184" rx="12" ry="17" fill="#222" stroke="#3a3a3a" strokeWidth="1.5"/>
    <ellipse cx="374" cy="184" rx="7"  ry="10" fill="#1a1a1a" stroke="#333" strokeWidth="1"/>
    {/* corrente / transmissão */}
    <path d="M368 210 Q400 214 440 208" stroke="#333" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M368 216 Q400 220 440 214" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* pinhão */}
    <circle cx="370" cy="213" r="10" fill="#222" stroke="#444" strokeWidth="1.5"/>
    <circle cx="442" cy="211" r="22" fill="none" stroke="#333" strokeWidth="2"/>

    {/* ══ TANQUE DE COMBUSTÍVEL ═════════════════════════════════════════ */}
    {/* corpo */}
    <path
      d="M198 84 C210 54 248 40 285 38 C318 36 352 50 365 72 C372 84 368 108 362 118 L204 118 C196 108 192 96 198 84 Z"
      fill="url(#lg_tank)" stroke="#ff906d" strokeWidth="2" filter="url(#dshadow)"/>
    {/* reflexo superior */}
    <path
      d="M215 70 C232 52 265 44 295 46 C318 48 340 58 352 72"
      fill="none" stroke="url(#lg_tank_shine)" strokeWidth="10" strokeLinecap="round"/>
    {/* faixa decorativa */}
    <path d="M204 118 L210 105 L358 105 L362 118 Z" fill="#ff906d" opacity="0.12"/>
    <path d="M210 105 L358 105" stroke="#ff906d" strokeWidth="1" opacity="0.4"/>
    {/* logotipo placeholder */}
    <rect x="255" y="72" width="48" height="18" rx="4" fill="rgba(0,0,0,0.4)" stroke="rgba(255,144,109,0.3)" strokeWidth="1"/>
    <path d="M262 81 L278 81 M271 77 L271 85" stroke="rgba(255,144,109,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
    {/* tampa combustível */}
    <ellipse cx="290" cy="42" rx="16" ry="8" fill="#282828" stroke="#555" strokeWidth="1.5"/>
    <ellipse cx="290" cy="42" rx="10" ry="5" fill="#1e1e1e" stroke="#444" strokeWidth="1"/>
    <line x1="282" y1="42" x2="298" y2="42" stroke="#555" strokeWidth="1"/>

    {/* ══ BANCO ════════════════════════════════════════════════════════ */}
    {/* base estrutural */}
    <path
      d="M308 80 C335 68 370 66 405 76 C418 82 422 92 418 100 L404 108 C380 100 345 96 314 100 Z"
      fill="#1e1e1e" stroke="#3a3a3a" strokeWidth="1.5"/>
    {/* couro */}
    <path
      d="M312 82 C336 72 368 70 400 80 C412 85 415 93 411 99 L402 105 C376 97 342 94 316 98 Z"
      fill="#242424" stroke="#444" strokeWidth="1"/>
    {/* costura */}
    <path d="M318 90 C348 82 376 82 402 90" stroke="#333" strokeWidth="1" strokeDasharray="3 2.5" fill="none"/>
    <path d="M316 96 C346 88 374 88 403 96" stroke="#333" strokeWidth="1" strokeDasharray="3 2.5" fill="none"/>
    {/* reflexo */}
    <path d="M324 78 C348 70 374 70 398 78" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" fill="none"/>

    {/* ══ SUSPENSÃO TRASEIRA (mono-amortecedor) ════════════════════════ */}
    <path d="M408 180 C415 165 418 148 412 132" stroke="#888" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
    <path d="M416 178 C423 163 426 146 420 130" stroke="#666" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    {/* corpo amortecedor */}
    <ellipse cx="412" cy="155" rx="6" ry="18" fill="#2a2a2a" stroke="#555" strokeWidth="1.5" transform="rotate(-8,412,155)"/>
    <ellipse cx="412" cy="155" rx="4" ry="10" fill="#ff906d" opacity="0.25" transform="rotate(-8,412,155)"/>
    {/* braço oscilante */}
    <path d="M408 180 C424 185 444 188 460 188" stroke="#777" strokeWidth="5" strokeLinecap="round" fill="none"/>
    <path d="M410 186 C426 190 446 192 460 192" stroke="#555" strokeWidth="3" strokeLinecap="round" fill="none"/>

    {/* ══ PARA-LAMA TRASEIRO ═══════════════════════════════════════════ */}
    <path
      d="M400 110 C412 118 430 134 445 156 C452 168 455 184 460 190"
      stroke="#888" strokeWidth="5" strokeLinecap="round" fill="none"/>
    <path
      d="M406 112 C418 120 436 136 450 160 C456 170 459 184 462 190"
      stroke="#444" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    {/* detalhe borda */}
    <path d="M398 108 C404 112 408 116 410 120" stroke="#ff906d" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>

    {/* ══ LANTERNA TRASEIRA ════════════════════════════════════════════ */}
    <path d="M420 100 C425 95 438 92 448 96 L452 108 C440 112 426 110 420 106 Z"
      fill="#2a0000" stroke="#ef4444" strokeWidth="1.5" filter="url(#glow_sm)"/>
    <path d="M423 102 C428 98 436 96 444 99 L447 107 C437 110 428 108 423 105 Z"
      fill="url(#rg_taillight)" opacity="0.85"/>
    {/* LED strip */}
    <path d="M425 103 L443 101" stroke="#ff8888" strokeWidth="1.5" strokeLinecap="round" opacity="0.9"/>

    {/* ══ GUIÑÓN ═══════════════════════════════════════════════════════ */}
    {/* haste direção */}
    <path d="M148 122 C150 112 155 100 162 90" stroke="#999" strokeWidth="6" strokeLinecap="round" fill="none"/>
    {/* tê superior */}
    <rect x="148" y="86" width="40" height="10" rx="5" fill="#2a2a2a" stroke="#555" strokeWidth="1.5"/>
    {/* manubrio */}
    <path d="M152 91 C162 82 175 76 195 72" stroke="#888" strokeWidth="5" strokeLinecap="round" fill="none"/>
    <path d="M152 91 C145 88 132 84 118 82" stroke="#888" strokeWidth="5" strokeLinecap="round" fill="none"/>
    {/* punhos */}
    <rect x="190" y="67" width="18" height="8" rx="4" fill="#333" stroke="#555" strokeWidth="1"/>
    <rect x="100" y="77" width="18" height="8" rx="4" fill="#333" stroke="#555" strokeWidth="1"/>
    {/* alavanca freio */}
    <path d="M198 68 L205 60" stroke="#666" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* retrovisor */}
    <line x1="196" y1="68" x2="206" y2="56" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="208" cy="53" rx="7" ry="4.5" fill="#0a1520" stroke="#444" strokeWidth="1"/>
    <ellipse cx="208" cy="53" rx="5" ry="3" fill="#1db1f1" opacity="0.4"/>

    {/* ══ PAINEL DE INSTRUMENTOS ══════════════════════════════════════ */}
    <rect x="168" y="75" width="28" height="16" rx="5" fill="#0d0d0d" stroke="#3a3a3a" strokeWidth="1.5"/>
    {/* tela */}
    <rect x="170" y="77" width="24" height="12" rx="3" fill="#060f14" stroke="#1db1f1" strokeWidth="0.5" opacity="0.8"/>
    {/* velocímetro */}
    <circle cx="176" cy="83" r="4" fill="none" stroke="#ff906d" strokeWidth="1" opacity="0.8"/>
    <path d="M174 83 L177 80" stroke="#ff906d" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="188" cy="83" r="4" fill="none" stroke="#1db1f1" strokeWidth="1" opacity="0.8"/>
    <path d="M186 85 L190 81" stroke="#1db1f1" strokeWidth="1" strokeLinecap="round"/>

    {/* ══ CARENAGEM FRONTAL + FAROL ════════════════════════════════════ */}
    {/* corpo carenagem */}
    <path
      d="M100 82 C90 90 82 100 78 112 C74 124 76 138 84 148 C92 158 106 164 122 162 C136 160 148 150 152 138 C158 122 154 104 146 92 C138 80 124 72 110 72 C106 72 102 76 100 82 Z"
      fill="#181818" stroke="#333" strokeWidth="2"/>
    {/* detalhe aerodinâmico */}
    <path d="M88 100 C92 110 96 124 98 140" stroke="#ff906d" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    <path d="M126 74 C134 80 144 90 148 102" stroke="#444" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
    {/* farol principal */}
    <path d="M82 104 C82 94 90 86 100 84 C112 82 122 88 124 98 C126 108 118 118 108 118 C96 118 84 114 82 104 Z"
      fill="#050d14" stroke="#1db1f1" strokeWidth="1.5" filter="url(#glow)"/>
    <path d="M86 104 C86 96 92 90 100 88 C110 86 118 92 120 100 C122 108 116 114 108 114 C98 114 86 112 86 104 Z"
      fill="url(#rg_headlight)" opacity="0.9"/>
    {/* DRL (daytime running light) */}
    <path d="M84 120 C92 126 106 128 122 124" stroke="#60d0ff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" filter="url(#glow_sm)"/>
    <path d="M86 124 C94 128 108 130 120 127" stroke="#1db1f1" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>

    {/* ══ PARA-LAMA DIANTEIRO ══════════════════════════════════════════ */}
    <path d="M76 162 C80 172 96 178 120 174 C138 172 152 164 154 156"
      stroke="#777" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
    <path d="M78 168 C82 176 98 182 122 178 C138 176 152 168 154 162"
      stroke="#404040" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    {/* borda laranja */}
    <path d="M76 161 C77 160 88 158 100 158" stroke="#ff906d" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>

    {/* ══ ESCAPE / SILENCIOSO ══════════════════════════════════════════ */}
    {/* coletor saindo do motor */}
    <path d="M340 212 C355 218 372 222 388 220" stroke="#555" strokeWidth="6" strokeLinecap="round" fill="none"/>
    <path d="M388 220 C406 218 424 214 438 206 C450 200 458 192 460 182"
      stroke="url(#lg_exhaust)" strokeWidth="10" strokeLinecap="round" fill="none"/>
    {/* cano interno */}
    <path d="M388 220 C406 218 424 214 438 206 C450 200 458 192 460 182"
      stroke="url(#lg_exhaust)" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5"/>
    {/* abas do coletor */}
    {[352,368,384].map(x=>(
      <ellipse key={x} cx={x} cy={215+(x-352)*0.05} rx="4" ry="6"
        fill="#333" stroke="#555" strokeWidth="1"
        transform={`rotate(-15,${x},${215+(x-352)*0.05})`}/>
    ))}
    {/* silencioso (corpo) */}
    <path
      d="M440 178 C450 172 462 170 474 172 C482 174 486 180 484 188 C482 196 474 200 464 200 C454 200 442 196 440 188 Z"
      fill="#383838" stroke="#666" strokeWidth="1.5"/>
    <path d="M442 180 C454 175 468 175 478 180" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" fill="none"/>
    {/* ponta */}
    <ellipse cx="484" cy="184" rx="5" ry="8" fill="#555" stroke="#777" strokeWidth="1.5"/>
    <ellipse cx="484" cy="184" rx="2.5" ry="4" fill="#222" stroke="#444" strokeWidth="1"/>

    {/* ══ PEDALEIRA / ESTRIBOS ════════════════════════════════════════ */}
    {/* dianteiro */}
    <line x1="244" y1="218" x2="228" y2="236" stroke="#555" strokeWidth="3.5" strokeLinecap="round"/>
    <line x1="228" y1="236" x2="194" y2="234" stroke="#555" strokeWidth="3" strokeLinecap="round"/>
    <rect x="176" y="231" width="20" height="5" rx="2" fill="#333" stroke="#555" strokeWidth="1"/>
    {/* traseiro */}
    <line x1="358" y1="216" x2="372" y2="232" stroke="#555" strokeWidth="3.5" strokeLinecap="round"/>
    <line x1="372" y1="232" x2="406" y2="230" stroke="#555" strokeWidth="3" strokeLinecap="round"/>
    <rect x="406" y="227" width="20" height="5" rx="2" fill="#333" stroke="#555" strokeWidth="1"/>
    {/* alavanca câmbio */}
    <path d="M242 218 C238 225 232 230 224 232" stroke="#555" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <rect x="218" y="230" width="12" height="4" rx="2" fill="#333" stroke="#444" strokeWidth="1"/>

    {/* ══ DETALHE: VÁLVULA PNEU ═══════════════════════════════════════ */}
    <line x1="118" y1="159" x2="115" y2="152" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="114" cy="150" r="2.5" fill="#444" stroke="#666" strokeWidth="1"/>
    <line x1="460" y1="156" x2="463" y2="149" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="464" cy="148" r="2.5" fill="#444" stroke="#666" strokeWidth="1"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
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

      {/* ─ CANVAS ─────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
        className="relative w-full rounded-2xl overflow-hidden border border-[#282828] cursor-crosshair select-none touch-none"
        style={{
          paddingBottom:'50%',
          background:'radial-gradient(ellipse at 50% 65%, #181818 0%, #0a0a0a 100%)',
        }}
      >
        {/* grid de fundo */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)',
            backgroundSize:'24px 24px',
          }}/>

        {/* SVG */}
        <div className="absolute inset-0" style={{pointerEvents:'none'}}>
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
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[#333]">
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
