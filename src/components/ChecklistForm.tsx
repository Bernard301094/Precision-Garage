import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Phone, Calendar as CalendarIcon,
  PlusCircle, Trash2, Camera, Save, CheckCircle2,
  Fuel, Settings as SettingsIcon, Bike, GripVertical,
  Gauge, DollarSign, PenTool, AlertCircle, ChevronDown, ChevronUp, Map
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { Button, Input, Select } from './UI';
import { handleFirestoreError, OperationType, uploadImage } from '../lib/utils';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { MotoMap, DamagePin } from './MotoMap';

interface MasterItem { id:string; name:string; type:'mapping'|'service'; price?:number; }
interface ProcessItem { name:string; status:'PENDENTE'|'EM ANDAMENTO'|'CONCLUÍDO'; price:string; }

const DAMAGE_TYPES = ['Risco Leve','Risco Profundo','Amassado','Pintura','Trinca','Oxidação'];
const VEHICLE_CATEGORIES = ['Naked','Trail / Adventure','Esportiva','Custom / Cruiser','Scooter','Touring','Outro'];
const PROCESS_STATUSES: ProcessItem['status'][] = ['PENDENTE','EM ANDAMENTO','CONCLUÍDO'];
const STATUS_STYLE: Record<string,string> = {
  'PENDENTE':     'bg-[#1db1f1]/10 text-[#1db1f1] border-[#1db1f1]/30',
  'EM ANDAMENTO': 'bg-[#ff906d]/10 text-[#ff906d] border-[#ff906d]/30',
  'CONCLUÍDO':    'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/30',
};

const fmt = (v:number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const toNum = (s:string) => { const n=parseFloat(s.replace(',','.')); return isNaN(n)?0:n; };

export const ChecklistScreen = ({ onComplete, initialData }: { onComplete:()=>void; initialData?:any }) => {
  const { profile } = useAuth();
  const [loading, setLoading]           = useState(false);
  const [masterItems, setMasterItems]   = useState<MasterItem[]>([]);
  const [showSigPad, setShowSigPad]     = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showMotoMap, setShowMotoMap]   = useState(false);
  const sigPad = useRef<any>(null);
  const dragIdx = useRef<number|null>(null);

  const [formData, setFormData] = useState({
    logoUrl: initialData?.logoUrl || '',
    client:  initialData?.client  || { name:'', phone:'' },
    vehicle: initialData?.vehicle || {
      model:'', plate:'', color:'', category:'',
      entryDate: new Date().toISOString().split('T')[0],
      exitDate:'', mileage:'', fuel:'50',
      vin:'', engineNumber:'', insurance:'', year:''
    },
    damageMapping: initialData?.damageMapping || [] as any[],
    damagePins:   (initialData?.damagePins   || []) as DamagePin[],
    // → URL da foto real da moto usada no MotoMap (Opção D)
    motoMapPhotoUrl: (initialData?.motoMapPhotoUrl || '') as string,
    processes:    (initialData?.processes    || []).map((p:any)=>({...p,status:p.status||'PENDENTE',price:p.price!=null?String(p.price):''})) as ProcessItem[],
    laborFee: initialData?.laborFee!=null ? String(initialData.laborFee) : '',
    notes:    initialData?.notes    || '',
    signature:initialData?.signature|| '',
    photos:   initialData?.photos   || [] as string[]
  });

  const servicesTotal = formData.processes.reduce((sum,p)=>sum+toNum(p.price),0);
  const laborFeeNum   = toNum(formData.laborFee);
  const grandTotal    = servicesTotal + laborFeeNum;

  const patchVehicle = (k:string,v:string) => setFormData(p=>({...p,vehicle:{...p.vehicle,[k]:v}}));
  const patchClient  = (k:string,v:string) => setFormData(p=>({...p,client:{...p.client,[k]:v}}));

  useEffect(()=>{
    if(!auth.currentUser) return;
    const q=query(collection(db,'masterItems'),where('createdBy','==',auth.currentUser.uid));
    const unsub=onSnapshot(q,snap=>{
      setMasterItems(snap.docs.map(d=>({id:d.id,...d.data()}as MasterItem)));
    },err=>handleFirestoreError(err,OperationType.LIST,'masterItems'));
    return ()=>unsub();
  },[]);

  const handleProcessNameChange=(idx:number,name:string)=>{
    const master=masterItems.find(m=>m.type==='service'&&m.name===name);
    setFormData(p=>{
      const procs=[...p.processes];
      procs[idx]={...procs[idx],name,price:master?.price!=null?String(master.price):procs[idx].price};
      return {...p,processes:procs};
    });
  };

  const cycleStatus=(idx:number)=>{
    setFormData(p=>{
      const procs=[...p.processes];
      const cur=PROCESS_STATUSES.indexOf(procs[idx].status);
      procs[idx]={...procs[idx],status:PROCESS_STATUSES[(cur+1)%PROCESS_STATUSES.length]};
      return {...p,processes:procs};
    });
  };

  const onDragStart=(idx:number)=>{dragIdx.current=idx;};
  const onDragOver=(e:React.DragEvent,idx:number)=>{
    e.preventDefault();
    if(dragIdx.current===null||dragIdx.current===idx) return;
    setFormData(p=>{
      const procs=[...p.processes];
      const [moved]=procs.splice(dragIdx.current!,1);
      procs.splice(idx,0,moved);
      dragIdx.current=idx;
      return {...p,processes:procs};
    });
  };
  const onDragEnd=()=>{dragIdx.current=null;};

  const handleLogoUpload=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file||!auth.currentUser) return;
    const promise=uploadImage(file,`checklists/${auth.currentUser.uid}/logo_${Date.now()}`);
    toast.promise(promise,{loading:'Enviando...',success:'Logo carregado!',error:'Erro.'});
    const url=await promise; setFormData(p=>({...p,logoUrl:url}));
  };

  const handlePhotoUpload=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file||!auth.currentUser) return;
    const promise=uploadImage(file,`checklists/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    toast.promise(promise,{loading:'Enviando foto...',success:'Foto enviada!',error:'Erro.'});
    const url=await promise; setFormData(p=>({...p,photos:[...p.photos,url]}));
  };

  const handleSave=async(status:'draft'|'final')=>{
    if(!auth.currentUser) return; setLoading(true);
    const signatureData=sigPad.current?.toDataURL()||formData.signature||'';
    try{
      const processesToSave=formData.processes.map(p=>({...p,price:toNum(p.price)}));
      const data={
        ...formData,
        processes:processesToSave,
        laborFee:laborFeeNum,
        estimatedValue:grandTotal,
        signature:signatureData,
        status,
        createdBy:auth.currentUser.uid,
        updatedAt:serverTimestamp(),
        progress:status==='final'?100:Math.round(
          (formData.processes.filter(p=>p.status==='CONCLUÍDO').length/Math.max(formData.processes.length,1))*100
        )
      };
      if(initialData?.id){ await setDoc(doc(db,'checklists',initialData.id),data,{merge:true}); }
      else { await addDoc(collection(db,'checklists'),{...data,createdAt:serverTimestamp()}); }
      toast.success(status==='final'?'Checklist finalizado!':'Rascunho salvo!');
      onComplete();
    } catch(error){ handleFirestoreError(error,OperationType.CREATE,'checklists'); }
    finally{ setLoading(false); }
  };

  const generatePDF=()=>{
    const pdf=new jsPDF();
    const dark=[14,14,14] as [number,number,number];
    const light=[255,255,255] as [number,number,number];
    const accent=[255,144,109] as [number,number,number];
    const muted=[173,170,170] as [number,number,number];
    const card=[32,32,31] as [number,number,number];
    const border=[72,72,71] as [number,number,number];
    const green=[74,222,128] as [number,number,number];
    pdf.setFillColor(...dark); pdf.rect(0,0,210,297,'F');
    pdf.setFillColor(...card); pdf.rect(0,0,210,50,'F');
    if(formData.logoUrl||profile?.photoURL){
      try{ pdf.addImage(formData.logoUrl||profile?.photoURL,'JPEG',15,10,30,30); }catch{}
    }
    pdf.setTextColor(...light); pdf.setFontSize(22); pdf.setFont('helvetica','bold');
    pdf.text('CHECKLIST',105,25,{align:'center'});
    pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    pdf.text(profile?.garageName||'Precision Garage',105,32,{align:'center'});
    pdf.setFontSize(7); pdf.setTextColor(...muted);
    pdf.text(profile?.address||'',105,37,{align:'center'});
    let y=58;
    const drawRow=(cols:{label:string;value:string}[],rowY:number)=>{
      const w=170/cols.length;
      cols.forEach((c,i)=>{
        pdf.setDrawColor(...border); pdf.rect(20+i*w,rowY,w,12);
        pdf.setFontSize(6); pdf.setTextColor(...muted); pdf.setFont('helvetica','normal');
        pdf.text(c.label,22+i*w,rowY+4);
        pdf.setFontSize(8); pdf.setTextColor(...light); pdf.setFont('helvetica','bold');
        pdf.text(c.value||'-',22+i*w,rowY+9);
      }); return rowY+12;
    };
    y=drawRow([{label:'NOME:',value:formData.client.name},{label:'TEL:',value:formData.client.phone},{label:'ENTRADA:',value:formData.vehicle.entryDate},{label:'SAÍDA:',value:formData.vehicle.exitDate}],y);
    y=drawRow([{label:'VEÍCULO:',value:formData.vehicle.model},{label:'COR:',value:formData.vehicle.color},{label:'PLACA:',value:formData.vehicle.plate},{label:'CATEGORIA:',value:formData.vehicle.category}],y);
    y+=8;
    const drawSecHdr=(title:string,x:number,secY:number,w:number,color:[number,number,number])=>{
      pdf.setFillColor(...color); pdf.roundedRect(x,secY,w,8,3,3,'F');
      pdf.setTextColor(...dark); pdf.setFontSize(9); pdf.setFont('helvetica','bold');
      pdf.text(title,x+w/2,secY+5.5,{align:'center'});
    };
    drawSecHdr('MAPEAMENTO',20,y,80,accent); drawSecHdr('PROCESSOS',110,y,80,[29,177,241]);
    let listY=y+14;
    const max=Math.max(formData.damageMapping.length,formData.processes.length);
    for(let i=0;i<max;i++){
      if(listY>245){pdf.addPage();pdf.setFillColor(...dark);pdf.rect(0,0,210,297,'F');listY=20;}
      pdf.setFontSize(7);pdf.setFont('helvetica','normal');pdf.setTextColor(...light);
      if(formData.damageMapping[i]){
        pdf.setDrawColor(...border);pdf.circle(25,listY-1,1.5,'S');
        pdf.text(`${formData.damageMapping[i].item} — ${formData.damageMapping[i].damage}`,30,listY);
      }
      if(formData.processes[i]){
        pdf.setDrawColor(...border);pdf.circle(115,listY-1,1.5,'S');
        const priceStr=toNum(formData.processes[i].price)>0?` (${fmt(toNum(formData.processes[i].price))})`:""
        pdf.text(formData.processes[i].name+priceStr,120,listY);
        const sColor=formData.processes[i].status==='CONCLUÍDO'?[0,200,100] as [number,number,number]
          :formData.processes[i].status==='EM ANDAMENTO'?accent:[29,177,241] as [number,number,number];
        pdf.setTextColor(...sColor);pdf.setFontSize(5);
        pdf.text(formData.processes[i].status,186,listY,{align:'right'});
        pdf.setTextColor(...light);pdf.setFontSize(7);
      }
      listY+=7;
    }
    y=Math.max(listY+8,y+40);
    if(y>230){pdf.addPage();pdf.setFillColor(...dark);pdf.rect(0,0,210,297,'F');y=20;}
    pdf.setFillColor(...card);pdf.roundedRect(110,y,80,6+formData.processes.length*6+18,3,3,'F');
    pdf.setFontSize(8);pdf.setFont('helvetica','bold');pdf.setTextColor(...accent);
    pdf.text('RESUMO FINANCEIRO',150,y+5,{align:'center'});
    let fy=y+10;
    formData.processes.forEach(p=>{
      const pv=toNum(p.price);
      if(pv>0){
        pdf.setFontSize(7);pdf.setFont('helvetica','normal');pdf.setTextColor(...muted);
        pdf.text(p.name.substring(0,22),113,fy);
        pdf.setTextColor(...light); pdf.text(fmt(pv),187,fy,{align:'right'}); fy+=6;
      }
    });
    if(laborFeeNum>0){
      pdf.setFontSize(7);pdf.setFont('helvetica','normal');pdf.setTextColor(...muted);
      pdf.text('Mão de Obra',113,fy);pdf.setTextColor(...light);
      pdf.text(fmt(laborFeeNum),187,fy,{align:'right'});fy+=6;
    }
    pdf.setDrawColor(...border);pdf.line(113,fy,187,fy);fy+=4;
    pdf.setFontSize(9);pdf.setFont('helvetica','bold');pdf.setTextColor(...green);
    pdf.text('TOTAL',113,fy);pdf.text(fmt(grandTotal),187,fy,{align:'right'});
    const sigY=260;
    pdf.setDrawColor(...border);pdf.line(20,sigY,90,sigY);pdf.line(120,sigY,190,sigY);
    if(formData.signature){try{pdf.addImage(formData.signature,'PNG',25,sigY-18,50,16);}catch{}}
    pdf.setFontSize(6);pdf.setTextColor(...muted);
    pdf.text('TÉCNICO RESPONSÁVEL',55,sigY+5,{align:'center'});
    pdf.text('CLIENTE',155,sigY+5,{align:'center'});
    pdf.text(`Precision Garage — ${new Date().toLocaleString('pt-BR')}`,105,290,{align:'center'});
    pdf.save(`checklist_${formData.vehicle.plate||'pendente'}.pdf`);
    toast.success('PDF gerado!');
  };

  const mappingOptions=[
    {label:'Selecione...',value:''},
    ...masterItems.filter(i=>i.type==='mapping').map(i=>({label:i.name,value:i.name})),
    ...['Carenagem Frontal','Carenagem Lateral','Carenagem Traseira','Tanque de Combustível',
      'Banco / Assento','Pneu Dianteiro','Pneu Traseiro','Rodas','Escapamento','Parachoque','Farol','Retrovisor'
    ].map(v=>({label:v,value:v}))
  ];
  const serviceOptions=[
    {label:'Selecione...',value:''},
    ...masterItems.filter(i=>i.type==='service').map(i=>({label:i.name,value:i.name})),
    ...['Lavagem Técnica Detalhada','Descontaminação de Pintura','Proteção Cerâmica (Ceramic Coating)',
      'Polimento','Vitrificação de Pintura','Lavagem Premium','Proteção de 60 dias','Proteção de 1 ano (Selação)'
    ].map(v=>({label:v,value:v}))
  ];

  const Card=({children,className=''}:{children:React.ReactNode;className?:string})=>(
    <div className={`bg-[#1a1a1a] rounded-2xl p-4 sm:p-5 space-y-4 pg-card ${className}`}>{children}</div>
  );
  const SectionTitle=({children,color='bg-[#ff906d]'}:{children:React.ReactNode;color?:string})=>(
    <div className="flex items-center gap-2">
      <div className={`w-1 h-5 ${color} rounded-full`}/>
      <h3 className="font-headline font-bold text-xs sm:text-sm uppercase tracking-widest">{children}</h3>
    </div>
  );

  return (
    <div className="pb-6 space-y-3 sm:space-y-4">
      <div className="mb-1">
        <p className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-[0.2em]">Oficina de Alta Performance</p>
        <h2 className="font-headline text-xl sm:text-2xl font-bold">Novo Checklist</h2>
      </div>

      <div className="flex gap-2 sm:gap-3">
        <Button variant="secondary" className="flex-1 h-10 sm:h-11 text-xs sm:text-sm" onClick={()=>handleSave('draft')} disabled={loading}>
          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Rascunho
        </Button>
        <Button className="flex-1 h-10 sm:h-11 text-xs sm:text-sm" onClick={()=>handleSave('final')} disabled={loading}>
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {loading?'Salvando...':'Finalizar'}
        </Button>
      </div>

      {/* Logo */}
      <Card>
        <label className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 cursor-pointer group">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0e0e0e] rounded-2xl border-2 border-dashed border-[#484847] group-hover:border-[#ff906d] flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors">
            {formData.logoUrl
              ? <img src={formData.logoUrl} className="w-full h-full object-cover" alt="logo"/>
              : <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-[#adaaaa] group-hover:text-[#ff906d] transition-colors"/>}
          </div>
          <div className="text-center sm:text-left">
            <p className="font-headline font-bold text-sm">Upload de Logo</p>
            <p className="text-[#adaaaa] text-xs">PNG ou JPG</p>
          </div>
          <input type="file" className="hidden" accept="image/png,image/jpg,image/jpeg" onChange={handleLogoUpload}/>
        </label>
      </Card>

      {/* Dados do Veículo */}
      <Card>
        <SectionTitle>Dados do Veículo</SectionTitle>
        <div className="space-y-3">
          <Input label="Nome do Cliente" placeholder="Ex: Roberto Silva" icon={User}
            value={formData.client.name} onChange={(e:any)=>patchClient('name',e.target.value)}/>
          <Input label="Telefone" placeholder="(11) 98888-7777" icon={Phone}
            value={formData.client.phone} onChange={(e:any)=>patchClient('phone',e.target.value)}/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Data Entrada" type="date" icon={CalendarIcon}
              value={formData.vehicle.entryDate} onChange={(e:any)=>patchVehicle('entryDate',e.target.value)}/>
            <Input label="Previsão Saída" type="date" icon={CalendarIcon}
              value={formData.vehicle.exitDate} onChange={(e:any)=>patchVehicle('exitDate',e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Veículo" placeholder="Modelo" icon={Bike}
              value={formData.vehicle.model} onChange={(e:any)=>patchVehicle('model',e.target.value)}/>
            <Input label="Cor" placeholder="Cor" icon={PenTool}
              value={formData.vehicle.color} onChange={(e:any)=>patchVehicle('color',e.target.value)}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Placa" placeholder="ABC-1234"
              value={formData.vehicle.plate} onChange={(e:any)=>patchVehicle('plate',e.target.value.toUpperCase())}/>
            <Select label="Categoria" value={formData.vehicle.category}
              onChange={(e:any)=>patchVehicle('category',e.target.value)}
              options={[{label:'Categoria',value:''},...VEHICLE_CATEGORIES.map(c=>({label:c,value:c}))]}/>
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════
          MOTO-MAP — Opção D: foto real + pins de dano
      ══════════════════════════════════════════════════════════════ */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Moto-Map Interativo</SectionTitle>
          <div className="flex items-center gap-2 sm:gap-3">
            {formData.damagePins.length>0&&(
              <span className="px-2 py-0.5 bg-[#ff906d]/10 text-[#ff906d] text-[9px] sm:text-[10px] font-bold rounded-lg border border-[#ff906d]/20">
                {formData.damagePins.length} dano(s)
              </span>
            )}
            <button onClick={()=>setShowMotoMap(v=>!v)}
              className="text-[#1db1f1] text-xs font-bold flex items-center gap-1">
              <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
              {showMotoMap?'OCULTAR':'ABRIR MAPA'}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {showMotoMap&&(
            <motion.div
              initial={{height:0,opacity:0}}
              animate={{height:'auto',opacity:1}}
              exit={{height:0,opacity:0}}
              className="overflow-hidden"
            >
              {/* Opção D: passa a foto real e o callback de troca de foto */}
              <MotoMap
                pins={formData.damagePins}
                onChange={pins => setFormData(p=>({...p,damagePins:pins}))}
                photoUrl={formData.motoMapPhotoUrl||undefined}
                onPhotoChange={url => setFormData(p=>({...p,motoMapPhotoUrl:url}))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Mapeamento de Danos (lista textual, complementa o MotoMap) */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Mapeamento de Danos</SectionTitle>
          <button onClick={()=>setFormData(p=>({...p,damageMapping:[...p.damageMapping,{item:'',damage:''}]}))}
            className="flex items-center gap-1 text-[#1db1f1] text-xs font-bold">
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> Adicionar
          </button>
        </div>
        {formData.damageMapping.length>0?(
          <div className="rounded-xl overflow-hidden border border-[#282828]">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 sm:px-4 py-2 bg-[#0e0e0e]">
              <span className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest">COMPONENTE</span>
              <span className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest">DANO</span>
              <span className="w-6"/>
            </div>
            <AnimatePresence>
              {formData.damageMapping.map((item,idx)=>(
                <motion.div key={idx}
                  initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center px-3 sm:px-4 py-2.5 border-t border-[#282828]"
                >
                  <Select value={item.item}
                    onChange={(e:any)=>{const n=[...formData.damageMapping];n[idx].item=e.target.value;setFormData(p=>({...p,damageMapping:n}));}}
                    options={mappingOptions}/>
                  <Select value={item.damage}
                    onChange={(e:any)=>{const n=[...formData.damageMapping];n[idx].damage=e.target.value;setFormData(p=>({...p,damageMapping:n}));}}
                    options={[{label:'Tipo...',value:''},...DAMAGE_TYPES.map(d=>({label:d,value:d}))]}/>
                  <button onClick={()=>setFormData(p=>({...p,damageMapping:p.damageMapping.filter((_,i)=>i!==idx)}))}
                    className="p-1.5 text-[#adaaaa] hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ):(
          <div className="flex items-center gap-3 py-3 text-[#adaaaa]">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"/>
            <p className="text-xs sm:text-sm">Nenhum dano mapeado. Toque em "Adicionar".</p>
          </div>
        )}
      </Card>

      {/* Processos */}
      <Card>
        <SectionTitle>Processos</SectionTitle>
        <div className="space-y-0">
          {formData.processes.length>0&&(
            <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-1 pb-2">
              <span className="w-4"/>
              <span className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest">SERVIÇO</span>
              <span className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest">STATUS</span>
              <span className="text-[9px] font-bold text-[#adaaaa] uppercase tracking-widest text-right w-24">VALOR (R$)</span>
              <span className="w-6"/>
            </div>
          )}
          <AnimatePresence>
            {formData.processes.map((proc,idx)=>(
              <motion.div key={idx} draggable
                onDragStart={()=>onDragStart(idx)} onDragOver={e=>onDragOver(e,idx)} onDragEnd={onDragEnd}
                initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}}
                className="py-3 border-b border-[#282828] last:border-0 cursor-grab active:cursor-grabbing"
              >
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center">
                  <GripVertical className="w-4 h-4 text-[#484847] flex-shrink-0"/>
                  <Select value={proc.name} onChange={(e:any)=>handleProcessNameChange(idx,e.target.value)} options={serviceOptions}/>
                  <button onClick={()=>cycleStatus(idx)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-bold border whitespace-nowrap transition-all ${STATUS_STYLE[proc.status]}`}>
                    {proc.status}
                  </button>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#adaaaa] text-xs font-bold">R$</span>
                    <input type="number" min="0" step="0.01" placeholder="0,00" value={proc.price}
                      onChange={e=>{const n=[...formData.processes];n[idx]={...n[idx],price:e.target.value};setFormData(p=>({...p,processes:n}));}}
                      className="w-full bg-[#0e0e0e] rounded-lg pl-7 pr-2 py-2 text-sm font-headline font-bold text-white outline-none placeholder:text-[#484847] focus:ring-1 focus:ring-[#ff906d]"/>
                  </div>
                  <button onClick={()=>setFormData(p=>({...p,processes:p.processes.filter((_,i)=>i!==idx)}))}
                    className="p-1.5 text-[#adaaaa] hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                </div>
                <div className="flex sm:hidden flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#484847] flex-shrink-0"/>
                    <div className="flex-1"><Select value={proc.name} onChange={(e:any)=>handleProcessNameChange(idx,e.target.value)} options={serviceOptions}/></div>
                    <button onClick={()=>setFormData(p=>({...p,processes:p.processes.filter((_,i)=>i!==idx)}))}
                      className="p-1.5 text-[#adaaaa] hover:text-red-400 flex-shrink-0"><Trash2 className="w-4 h-4"/></button>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <button onClick={()=>cycleStatus(idx)}
                      className={`px-2 py-1 rounded-lg text-[9px] font-bold border whitespace-nowrap ${STATUS_STYLE[proc.status]}`}>
                      {proc.status}
                    </button>
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#adaaaa] text-xs font-bold">R$</span>
                      <input type="number" min="0" step="0.01" placeholder="0,00" value={proc.price}
                        onChange={e=>{const n=[...formData.processes];n[idx]={...n[idx],price:e.target.value};setFormData(p=>({...p,processes:n}));}}
                        className="w-full bg-[#0e0e0e] rounded-lg pl-7 pr-2 py-2 text-sm font-headline font-bold text-white outline-none placeholder:text-[#484847] focus:ring-1 focus:ring-[#ff906d]"/>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button onClick={()=>setFormData(p=>({...p,processes:[...p.processes,{name:'',status:'PENDENTE',price:''}]}))}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#484847] text-[#adaaaa] hover:text-white hover:border-[#ff906d] transition-colors text-xs sm:text-sm font-headline font-bold">
          <PlusCircle className="w-4 h-4"/> Inserir novo processo
        </button>
      </Card>

      {/* Combustível + KM */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-[#adaaaa]"/>
              <span className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest">Combustível</span>
            </div>
            <span className="text-[#ff906d] font-headline font-bold text-sm">{formData.vehicle.fuel}%</span>
          </div>
          <div className="relative">
            <div className="h-2 bg-[#0e0e0e] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#ff906d] to-[#ffb347] rounded-full transition-all duration-300"
                style={{width:`${formData.vehicle.fuel}%`}}/>
            </div>
            <input type="range" min="0" max="100" value={formData.vehicle.fuel}
              onChange={e=>patchVehicle('fuel',e.target.value)}
              className="absolute inset-0 w-full opacity-0 h-2 cursor-pointer"/>
          </div>
          <div className="flex justify-between text-[9px] font-bold text-[#adaaaa] uppercase">
            <span>Vazio</span><span>Cheio</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#adaaaa]"/>
            <span className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest">Quilometragem</span>
          </div>
          <div className="flex items-baseline gap-2">
            <input type="number" placeholder="45230" value={formData.vehicle.mileage}
              onChange={e=>patchVehicle('mileage',e.target.value)}
              className="flex-1 bg-transparent text-2xl sm:text-3xl font-headline font-bold text-white outline-none placeholder:text-[#484847]"/>
            <span className="text-[#adaaaa] font-headline font-bold text-sm">KM</span>
          </div>
        </div>
      </Card>

      {/* Fotos */}
      <Card>
        <SectionTitle color="bg-[#1db1f1]">Fotos do Veículo</SectionTitle>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {formData.photos.map((url,i)=>(
            <div key={i} className="aspect-square bg-[#0e0e0e] rounded-xl overflow-hidden relative group">
              <img src={url} className="w-full h-full object-cover" alt={`foto ${i+1}`}/>
              <button onClick={()=>setFormData(p=>({...p,photos:p.photos.filter((_,ii)=>ii!==i)}))}
                className="absolute top-1 right-1 p-1 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3 text-white"/>
              </button>
            </div>
          ))}
          <label className="aspect-square bg-[#0e0e0e] rounded-xl border-2 border-dashed border-[#484847] hover:border-[#ff906d] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group">
            <Camera className="w-5 h-5 text-[#adaaaa] group-hover:text-[#ff906d] transition-colors"/>
            <span className="text-[9px] font-bold text-[#adaaaa] uppercase">Foto</span>
            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload}/>
          </label>
        </div>
      </Card>

      {/* Assinatura */}
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle color="bg-[#1db1f1]">Assinatura do Cliente</SectionTitle>
          <button onClick={()=>setShowSigPad(v=>!v)} className="text-[#1db1f1] text-xs font-bold">
            {showSigPad?'OCULTAR':'ABRIR PAD'}
          </button>
        </div>
        <AnimatePresence>
          {showSigPad&&(
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
              <div className="bg-white rounded-xl overflow-hidden h-32 sm:h-36 relative">
                <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{className:'w-full h-full'}}/>
                <button onClick={()=>sigPad.current?.clear()}
                  className="absolute bottom-2 right-2 px-2 py-1 bg-gray-200 text-gray-800 text-xs font-bold rounded-lg">LIMPAR</button>
              </div>
              <p className="text-[10px] text-[#adaaaa] italic mt-2">Ao assinar, o cliente concorda com o estado atual do veículo.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Resumo Financeiro */}
      <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden pg-card">
        <button onClick={()=>setShowBreakdown(v=>!v)}
          className="w-full flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#ff906d]"/>
            <span className="font-headline font-bold text-xs sm:text-sm uppercase tracking-widest">Resumo Financeiro</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-headline font-bold text-[#ff906d] text-base sm:text-lg">{fmt(grandTotal)}</span>
            {showBreakdown?<ChevronUp className="w-4 h-4 text-[#adaaaa]"/>:<ChevronDown className="w-4 h-4 text-[#adaaaa]"/>}
          </div>
        </button>
        <AnimatePresence>
          {showBreakdown&&(
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
                {formData.processes.map((proc,idx)=>(
                  proc.name?(
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs sm:text-sm text-[#adaaaa] truncate pr-2">{proc.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border flex-shrink-0 ${STATUS_STYLE[proc.status]}`}>
                          {proc.status}
                        </span>
                      </div>
                      <span className={`font-headline font-bold text-xs sm:text-sm flex-shrink-0 ${
                        toNum(proc.price)>0?'text-white':'text-[#484847]'
                      }`}>{toNum(proc.price)>0?fmt(toNum(proc.price)):'—'}</span>
                    </div>
                  ):null
                ))}
                {formData.processes.some(p=>p.name)&&<div className="border-t border-[#282828] pt-2"/>}
                {servicesTotal>0&&(
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#adaaaa] uppercase tracking-wider">Subtotal Serviços</span>
                    <span className="font-headline font-bold text-xs sm:text-sm">{fmt(servicesTotal)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#adaaaa] uppercase tracking-wider whitespace-nowrap">Mão de Obra</span>
                  <div className="relative w-28 sm:w-32">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#adaaaa] text-xs font-bold">R$</span>
                    <input type="number" min="0" step="0.01" placeholder="0,00" value={formData.laborFee}
                      onChange={e=>setFormData(p=>({...p,laborFee:e.target.value}))}
                      className="w-full bg-[#0e0e0e] rounded-lg pl-7 pr-2 py-2 text-xs sm:text-sm font-headline font-bold text-white outline-none placeholder:text-[#484847] focus:ring-1 focus:ring-[#ff906d] text-right"/>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-[#ff906d]/20 to-transparent rounded-xl p-3 sm:p-4 flex items-center justify-between mt-2">
                  <div>
                    <p className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-widest">Total Estimado</p>
                    <p className="text-[10px] text-[#adaaaa] mt-0.5 hidden sm:block">Inclui materiais e mão de obra.</p>
                  </div>
                  <p className="font-headline font-bold text-xl sm:text-2xl text-white">{fmt(grandTotal)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Botões finais */}
      <div className="flex gap-2 sm:gap-3 pt-2">
        <Button variant="secondary" className="flex-1 text-xs sm:text-sm" onClick={generatePDF}>
          <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> PDF
        </Button>
        <Button className="flex-1 text-xs sm:text-sm" onClick={()=>handleSave('final')} disabled={loading}>
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
          {loading?'PROCESSANDO...':'FINALIZAR'}
        </Button>
      </div>
    </div>
  );
};
