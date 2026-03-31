import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Phone, Calendar as CalendarIcon,
  PlusCircle, Trash2, Camera, Save, CheckCircle2,
  Fuel, Settings as SettingsIcon, Bike, GripVertical,
  Gauge, DollarSign, PenTool, AlertCircle
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, setDoc, doc,
  serverTimestamp, query, where, onSnapshot
} from 'firebase/firestore';
import { Button, Input, Select } from './UI';
import { handleFirestoreError, OperationType, uploadImage } from '../lib/utils';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';

interface MasterItem {
  id: string;
  name: string;
  type: 'mapping' | 'service';
}

const DAMAGE_TYPES = ['Risco Leve', 'Risco Profundo', 'Amassado', 'Pintura', 'Trinca', 'Oxidação'];
const DAMAGE_COLORS: Record<string, string> = {
  'Risco Leve':   'bg-yellow-500/20 text-yellow-400',
  'Risco Profundo':'bg-orange-500/20 text-orange-400',
  'Amassado':     'bg-red-500/20 text-red-400',
  'Pintura':      'bg-blue-500/20 text-blue-400',
  'Trinca':       'bg-red-700/20 text-red-600',
  'Oxidação':     'bg-amber-600/20 text-amber-500',
};

const VEHICLE_CATEGORIES = ['Naked', 'Trail / Adventure', 'Esportiva', 'Custom / Cruiser', 'Scooter', 'Touring', 'Outro'];

export const ChecklistScreen = ({
  onComplete,
  initialData
}: {
  onComplete: () => void;
  initialData?: any;
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [showSigPad, setShowSigPad] = useState(false);
  const sigPad = useRef<any>(null);

  const [formData, setFormData] = useState({
    logoUrl: initialData?.logoUrl || '',
    client: initialData?.client || { name: '', phone: '' },
    vehicle: initialData?.vehicle || {
      model: '', plate: '', color: '', category: '',
      entryDate: new Date().toISOString().split('T')[0],
      exitDate: '', mileage: '', fuel: '50',
      vin: '', engineNumber: '', insurance: '', year: ''
    },
    damageMapping: initialData?.damageMapping || [] as any[],
    processes: initialData?.processes || [] as any[],
    estimatedValue: initialData?.estimatedValue || '',
    notes: initialData?.notes || '',
    signature: initialData?.signature || '',
    photos: initialData?.photos || [] as string[]
  });

  const patchVehicle  = (k: string, v: string) =>
    setFormData(p => ({ ...p, vehicle: { ...p.vehicle, [k]: v } }));
  const patchClient   = (k: string, v: string) =>
    setFormData(p => ({ ...p, client: { ...p.client, [k]: v } }));

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'masterItems'),
      where('createdBy', '==', auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      setMasterItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterItem)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'masterItems'));
    return () => unsub();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    const promise = uploadImage(file, `checklists/${auth.currentUser.uid}/logo_${Date.now()}`);
    toast.promise(promise, { loading: 'Enviando...', success: 'Logo carregado!', error: 'Erro.' });
    const url = await promise;
    setFormData(p => ({ ...p, logoUrl: url }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    const promise = uploadImage(file, `checklists/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    toast.promise(promise, { loading: 'Enviando foto...', success: 'Foto enviada!', error: 'Erro.' });
    const url = await promise;
    setFormData(p => ({ ...p, photos: [...p.photos, url] }));
  };

  const handleSave = async (status: 'draft' | 'final') => {
    if (!auth.currentUser) return;
    setLoading(true);
    const signatureData = sigPad.current?.toDataURL() || formData.signature || '';
    try {
      const data = {
        ...formData,
        signature: signatureData,
        status,
        createdBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
        progress: status === 'final' ? 100 : 0
      };
      if (initialData?.id) {
        await setDoc(doc(db, 'checklists', initialData.id), data, { merge: true });
      } else {
        await addDoc(collection(db, 'checklists'), { ...data, createdAt: serverTimestamp() });
      }
      toast.success(status === 'final' ? 'Checklist finalizado!' : 'Rascunho salvo!');
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'checklists');
    } finally { setLoading(false); }
  };

  const generatePDF = () => {
    const pdf   = new jsPDF();
    const dark  = [14, 14, 14] as [number,number,number];
    const light = [255, 255, 255] as [number,number,number];
    const accent = [255, 144, 109] as [number,number,number];
    const muted = [173, 170, 170] as [number,number,number];
    const card  = [32, 32, 31] as [number,number,number];
    const border = [72, 72, 71] as [number,number,number];

    pdf.setFillColor(...dark); pdf.rect(0,0,210,297,'F');
    pdf.setFillColor(...card); pdf.rect(0,0,210,50,'F');

    if (formData.logoUrl || profile?.photoURL) {
      try { pdf.addImage(formData.logoUrl || profile?.photoURL, 'JPEG', 15, 10, 30, 30); } catch {}
    }
    pdf.setTextColor(...light); pdf.setFontSize(22); pdf.setFont('helvetica','bold');
    pdf.text('CHECKLIST', 105, 25, { align: 'center' });
    pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    pdf.text(profile?.garageName || 'Precision Garage', 105, 32, { align: 'center' });
    pdf.setFontSize(7); pdf.setTextColor(...muted);
    pdf.text(profile?.address || '', 105, 37, { align: 'center' });

    let y = 58;
    const drawRow = (cols: {label:string;value:string}[], rowY: number) => {
      const w = 170 / cols.length;
      cols.forEach((c,i) => {
        pdf.setDrawColor(...border);
        pdf.rect(20 + i*w, rowY, w, 12);
        pdf.setFontSize(6); pdf.setTextColor(...muted); pdf.setFont('helvetica','normal');
        pdf.text(c.label, 22+i*w, rowY+4);
        pdf.setFontSize(8); pdf.setTextColor(...light); pdf.setFont('helvetica','bold');
        pdf.text(c.value||'-', 22+i*w, rowY+9);
      });
      return rowY + 12;
    };

    y = drawRow([
      {label:'NOME:', value: formData.client.name},
      {label:'TEL:',  value: formData.client.phone},
      {label:'ENTRADA:', value: formData.vehicle.entryDate},
      {label:'SAÍDA:', value: formData.vehicle.exitDate}
    ], y);
    y = drawRow([
      {label:'VEÍCULO:', value: formData.vehicle.model},
      {label:'COR:',    value: formData.vehicle.color},
      {label:'PLACA:',  value: formData.vehicle.plate},
      {label:'CATEGORIA:', value: formData.vehicle.category}
    ], y);
    y += 8;

    // Mapeamento + Processos headers
    const drawSecHdr = (title: string, x: number, secY: number, w: number, color: [number,number,number]) => {
      pdf.setFillColor(...color); pdf.roundedRect(x,secY,w,8,3,3,'F');
      pdf.setTextColor(...dark); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
      pdf.text(title, x+w/2, secY+5.5, {align:'center'});
    };
    drawSecHdr('MAPEAMENTO', 20, y, 80, accent);
    drawSecHdr('PROCESSOS', 110, y, 80, [29,177,241]);
    let listY = y + 14;
    const max = Math.max(formData.damageMapping.length, formData.processes.length);
    for (let i=0; i<max; i++) {
      if (listY > 250) { pdf.addPage(); pdf.setFillColor(...dark); pdf.rect(0,0,210,297,'F'); listY = 20; }
      pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...light);
      if (formData.damageMapping[i]) {
        pdf.setDrawColor(...border); pdf.circle(25, listY-1, 1.5, 'S');
        pdf.text(`${formData.damageMapping[i].item} — ${formData.damageMapping[i].damage}`, 30, listY);
      }
      if (formData.processes[i]) {
        pdf.setDrawColor(...border); pdf.circle(115, listY-1, 1.5, 'S');
        pdf.text(formData.processes[i].name, 120, listY);
      }
      listY += 7;
    }

    y = Math.max(listY + 6, y + 30);
    if (y > 240) { pdf.addPage(); pdf.setFillColor(...dark); pdf.rect(0,0,210,297,'F'); y=20; }
    pdf.setFontSize(8); pdf.setTextColor(...muted);
    pdf.text(`KM: ${formData.vehicle.mileage||'-'}   |   COMBUSTÍVEL: ${formData.vehicle.fuel}%   |   VALOR: R$ ${formData.estimatedValue||'0,00'}`, 105, y, {align:'center'});

    // Signatures
    const sigY = 260;
    pdf.setDrawColor(...border);
    pdf.line(20, sigY, 90, sigY); pdf.line(120, sigY, 190, sigY);
    if (formData.signature) { try { pdf.addImage(formData.signature,'PNG',25,sigY-18,50,16); } catch {} }
    pdf.setFontSize(6); pdf.setTextColor(...muted);
    pdf.text('TÉCNICO RESPONSÁVEL',55,sigY+5,{align:'center'});
    pdf.text('CLIENTE',155,sigY+5,{align:'center'});
    pdf.text(`Precision Garage — ${new Date().toLocaleString('pt-BR')}`,105,290,{align:'center'});

    pdf.save(`checklist_${formData.vehicle.plate||'pendente'}.pdf`);
    toast.success('PDF gerado!');
  };

  const mappingOptions = [
    { label: 'Selecione...', value: '' },
    ...masterItems.filter(i => i.type === 'mapping').map(i => ({ label: i.name, value: i.name })),
    { label: 'Carenagem Lateral',   value: 'Carenagem Lateral' },
    { label: 'Carenagem Frontal',   value: 'Carenagem Frontal' },
    { label: 'Tanque',              value: 'Tanque' },
    { label: 'Banco / Assento',     value: 'Banco / Assento' },
    { label: 'Pneu Dianteiro',      value: 'Pneu Dianteiro' },
    { label: 'Pneu Traseiro',       value: 'Pneu Traseiro' },
    { label: 'Escapamento',         value: 'Escapamento' },
    { label: 'Parachoque',          value: 'Parachoque' },
    { label: 'Farol',               value: 'Farol' },
  ];

  const serviceOptions = [
    { label: 'Selecione...', value: '' },
    ...masterItems.filter(i => i.type === 'service').map(i => ({ label: i.name, value: i.name })),
    { label: 'Lavagem Técnica Detalhada',       value: 'Lavagem Técnica Detalhada' },
    { label: 'Descontaminação de Pintura',      value: 'Descontaminação de Pintura' },
    { label: 'Proteção Cerâmica (Ceramic Coating)', value: 'Proteção Cerâmica (Ceramic Coating)' },
    { label: 'Polimento',                       value: 'Polimento' },
    { label: 'Vitrificação de Pintura',         value: 'Vitrificação de Pintura' },
    { label: 'Lavagem Premium',                 value: 'Lavagem Premium' },
  ];

  return (
    <div className="pb-6 space-y-0">
      {/* Top header */}
      <div className="mb-5">
        <p className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-[0.2em]">Oficina de Alta Performance</p>
        <h2 className="font-headline text-2xl font-bold">Novo Checklist</h2>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <Button
          variant="secondary"
          className="flex-1 h-11"
          onClick={() => handleSave('draft')}
          disabled={loading}
        >
          <Save className="w-4 h-4" />
          Salvar Rascunho
        </Button>
        <Button
          className="flex-1 h-11"
          onClick={() => handleSave('final')}
          disabled={loading}
        >
          <CheckCircle2 className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Finalizar Registro'}
        </Button>
      </div>

      {/* Logo Upload */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4">
        <label className="flex flex-col items-center gap-3 cursor-pointer group">
          <div className="w-20 h-20 bg-[#0e0e0e] rounded-2xl border-2 border-dashed border-[#484847] group-hover:border-[#ff906d] transition-colors flex items-center justify-center overflow-hidden">
            {formData.logoUrl
              ? <img src={formData.logoUrl} className="w-full h-full object-cover" alt="logo" />
              : <Camera className="w-7 h-7 text-[#adaaaa] group-hover:text-[#ff906d] transition-colors" />}
          </div>
          <div className="text-center">
            <p className="font-headline font-bold text-sm">Upload de Logo</p>
            <p className="text-[#adaaaa] text-xs">Arraste a marca da oficina aqui (PNG ou JPG)</p>
          </div>
          <input type="file" className="hidden" accept="image/png,image/jpg,image/jpeg" onChange={handleLogoUpload} />
        </label>
      </div>

      {/* Dados do Veículo */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-[#ff906d] rounded-full" />
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Dados do Veículo</h3>
        </div>

        <Input
          label="Nome do Cliente"
          placeholder="Ex: Roberto Silva"
          icon={User}
          value={formData.client.name}
          onChange={(e: any) => patchClient('name', e.target.value)}
        />
        <Input
          label="Telefone"
          placeholder="(11) 98888-7777"
          icon={Phone}
          value={formData.client.phone}
          onChange={(e: any) => patchClient('phone', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data Entrada"
            type="date"
            icon={CalendarIcon}
            value={formData.vehicle.entryDate}
            onChange={(e: any) => patchVehicle('entryDate', e.target.value)}
          />
          <Input
            label="Previsão Saída"
            type="date"
            icon={CalendarIcon}
            value={formData.vehicle.exitDate}
            onChange={(e: any) => patchVehicle('exitDate', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Veículo"
            placeholder="Modelo"
            icon={Bike}
            value={formData.vehicle.model}
            onChange={(e: any) => patchVehicle('model', e.target.value)}
          />
          <Input
            label="Cor"
            placeholder="Cor"
            icon={PenTool}
            value={formData.vehicle.color}
            onChange={(e: any) => patchVehicle('color', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Placa"
            placeholder="ABC-1234"
            value={formData.vehicle.plate}
            onChange={(e: any) => patchVehicle('plate', e.target.value.toUpperCase())}
          />
          <Select
            label="Categoria"
            value={formData.vehicle.category}
            onChange={(e: any) => patchVehicle('category', e.target.value)}
            options={[
              { label: 'Categoria', value: '' },
              ...VEHICLE_CATEGORIES.map(c => ({ label: c, value: c }))
            ]}
          />
        </div>
      </div>

      {/* Mapeamento de Danos */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-[#ff906d] rounded-full" />
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Mapeamento de Danos</h3>
          </div>
          <button
            onClick={() => setFormData(p => ({
              ...p,
              damageMapping: [...p.damageMapping, { item: '', damage: '' }]
            }))}
            className="flex items-center gap-1 text-[#1db1f1] text-xs font-bold"
          >
            <PlusCircle className="w-4 h-4" /> Adicionar Item
          </button>
        </div>

        {formData.damageMapping.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-[#282828]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-4 py-2 bg-[#0e0e0e]">
              <span className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest">STATUS / COMPONENTE</span>
              <span className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest">TIPO DE DANO</span>
              <span className="w-6" />
            </div>

            <AnimatePresence>
              {formData.damageMapping.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center px-4 py-3 border-t border-[#282828]"
                >
                  <Select
                    value={item.item}
                    onChange={(e: any) => {
                      const n = [...formData.damageMapping];
                      n[idx].item = e.target.value;
                      setFormData(p => ({ ...p, damageMapping: n }));
                    }}
                    options={mappingOptions}
                  />
                  <Select
                    value={item.damage}
                    onChange={(e: any) => {
                      const n = [...formData.damageMapping];
                      n[idx].damage = e.target.value;
                      setFormData(p => ({ ...p, damageMapping: n }));
                    }}
                    options={[
                      { label: 'Tipo...', value: '' },
                      ...DAMAGE_TYPES.map(d => ({ label: d, value: d }))
                    ]}
                  />
                  {item.damage && (
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap hidden sm:block ${
                      DAMAGE_COLORS[item.damage] || 'bg-[#484847] text-white'
                    }`}>
                      {item.damage}
                    </span>
                  )}
                  <button
                    onClick={() => setFormData(p => ({
                      ...p,
                      damageMapping: p.damageMapping.filter((_,i) => i !== idx)
                    }))}
                    className="p-1.5 text-[#adaaaa] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {formData.damageMapping.length === 0 && (
          <div className="flex items-center gap-3 py-4 text-[#adaaaa]">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Nenhum dano mapeado ainda. Toque em "Adicionar Item" para começar.</p>
          </div>
        )}
      </div>

      {/* Processos */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-[#ff906d] rounded-full" />
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Processos</h3>
          <button
            onClick={() => setFormData(p => ({
              ...p,
              processes: [...p.processes, { name: '', status: 'PENDENTE' }]
            }))}
            className="ml-auto text-[#1db1f1] text-xs font-bold flex items-center gap-1"
          >
            Configurar Padrões
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {formData.processes.map((proc, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 py-3 border-b border-[#282828] last:border-0"
              >
                <GripVertical className="w-4 h-4 text-[#484847] flex-shrink-0" />
                <Select
                  className="flex-1"
                  value={proc.name}
                  onChange={(e: any) => {
                    const n = [...formData.processes];
                    n[idx].name = e.target.value;
                    setFormData(p => ({ ...p, processes: n }));
                  }}
                  options={serviceOptions}
                />
                <button
                  onClick={() => setFormData(p => ({
                    ...p,
                    processes: p.processes.filter((_,i) => i !== idx)
                  }))}
                  className="p-1.5 text-[#adaaaa] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setFormData(p => ({
            ...p,
            processes: [...p.processes, { name: '', status: 'PENDENTE' }]
          }))}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#484847] text-[#adaaaa] hover:text-white hover:border-[#ff906d] transition-colors text-sm font-headline font-bold"
        >
          <PlusCircle className="w-4 h-4" /> Inserir novo processo
        </button>
      </div>

      {/* Combustível + KM */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4 space-y-5">
        {/* Fuel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-[#adaaaa]" />
              <span className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest">Combustível</span>
            </div>
            <span className="text-[#ff906d] font-headline font-bold text-sm">{formData.vehicle.fuel}%</span>
          </div>
          <div className="relative">
            <div className="h-2 bg-[#0e0e0e] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ff906d] to-[#ffb347] rounded-full transition-all duration-300"
                style={{ width: `${formData.vehicle.fuel}%` }}
              />
            </div>
            <input
              type="range" min="0" max="100"
              value={formData.vehicle.fuel}
              onChange={e => patchVehicle('fuel', e.target.value)}
              className="absolute inset-0 w-full opacity-0 h-2 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-[#adaaaa] uppercase">
            <span>Vazio</span><span>Cheio</span>
          </div>
        </div>

        {/* KM */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#adaaaa]" />
            <span className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest">Quilometragem</span>
          </div>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              placeholder="45230"
              value={formData.vehicle.mileage}
              onChange={e => patchVehicle('mileage', e.target.value)}
              className="flex-1 bg-transparent text-3xl font-headline font-bold text-white outline-none placeholder:text-[#484847]"
            />
            <span className="text-[#adaaaa] font-headline font-bold text-sm">KM</span>
          </div>
        </div>
      </div>

      {/* Fotos */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-[#1db1f1] rounded-full" />
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Fotos do Veículo</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {formData.photos.map((url, i) => (
            <div key={i} className="aspect-square bg-[#0e0e0e] rounded-xl overflow-hidden relative group">
              <img src={url} className="w-full h-full object-cover" alt={`foto ${i+1}`} />
              <button
                onClick={() => setFormData(p => ({ ...p, photos: p.photos.filter((_,ii) => ii !== i) }))}
                className="absolute top-1.5 right-1.5 p-1 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          <label className="aspect-square bg-[#0e0e0e] rounded-xl border-2 border-dashed border-[#484847] hover:border-[#ff906d] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group">
            <Camera className="w-5 h-5 text-[#adaaaa] group-hover:text-[#ff906d] transition-colors" />
            <span className="text-[9px] font-bold text-[#adaaaa] uppercase">Foto</span>
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </div>
      </div>

      {/* Assinatura */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-[#1db1f1] rounded-full" />
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Assinatura do Cliente</h3>
          </div>
          <button
            onClick={() => setShowSigPad(v => !v)}
            className="text-[#1db1f1] text-xs font-bold"
          >
            {showSigPad ? 'OCULTAR' : 'ABRIR PAD'}
          </button>
        </div>
        <AnimatePresence>
          {showSigPad && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-xl overflow-hidden h-36 relative">
                <SignatureCanvas
                  ref={sigPad}
                  penColor="black"
                  canvasProps={{ className: 'w-full h-full' }}
                />
                <button
                  onClick={() => sigPad.current?.clear()}
                  className="absolute bottom-2 right-2 px-2 py-1 bg-gray-200 text-gray-800 text-xs font-bold rounded-lg"
                >
                  LIMPAR
                </button>
              </div>
              <p className="text-[10px] text-[#adaaaa] italic mt-2">
                Ao assinar, o cliente concorda com o estado atual do veículo conforme mapeado.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Valor Total */}
      <div className="bg-gradient-to-br from-[#ff906d]/20 to-[#1db1f1]/10 rounded-2xl p-5 mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#ff906d]" />
          <span className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest">Valor Total Estimado</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[#adaaaa] font-headline font-bold text-lg">R$</span>
          <input
            type="text"
            placeholder="1.850,00"
            value={formData.estimatedValue}
            onChange={e => setFormData(p => ({ ...p, estimatedValue: e.target.value }))}
            className="flex-1 bg-transparent text-4xl font-headline font-bold text-white outline-none placeholder:text-[#484847]"
          />
        </div>
        <p className="text-[10px] text-[#adaaaa]">Inclui taxas de materiais de detalhamento e mão de obra especializada.</p>
      </div>

      {/* Generate PDF & Final buttons */}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={generatePDF}>
          <PenTool className="w-4 h-4" /> GERAR PDF
        </Button>
        <Button className="flex-1" onClick={() => handleSave('final')} disabled={loading}>
          <CheckCircle2 className="w-4 h-4" />
          {loading ? 'PROCESSANDO...' : 'FINALIZAR'}
        </Button>
      </div>
    </div>
  );
};
