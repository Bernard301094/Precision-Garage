import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Phone, Mail, MapPin, Calendar as CalendarIcon, 
  PlusCircle, Trash2, Camera, Save, CheckCircle2, 
  ArrowRight, ArrowLeft, Fuel, Disc, Settings as SettingsIcon,
  Ruler, PenTool, Bike
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
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

export const ChecklistScreen = ({ onComplete, initialData }: { onComplete: () => void, initialData?: any }) => {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const sigPad = useRef<any>(null);

  const [formData, setFormData] = useState({
    client: initialData?.client || { name: '', phone: '', email: '' },
    vehicle: initialData?.vehicle || { 
      model: '', 
      plate: '', 
      year: '', 
      color: '', 
      mileage: '', 
      fuel: '50',
      category: '',
      entryDate: new Date().toISOString().split('T')[0],
      exitDate: '',
      vin: '',
      engineNumber: '',
      insurance: ''
    },
    damageMapping: initialData?.damageMapping || [] as any[],
    processes: initialData?.processes || [] as any[],
    estimatedValue: initialData?.estimatedValue || '',
    notes: initialData?.notes || '',
    signature: initialData?.signature || '',
    photos: initialData?.photos || [] as string[]
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'masterItems'), where('createdBy', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMasterItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'masterItems'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (initialData?.signature && sigPad.current) {
      sigPad.current.fromDataURL(initialData.signature);
    }
  }, [initialData, step]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    
    const promise = new Promise(async (resolve, reject) => {
      try {
        const url = await uploadImage(file, `checklists/${auth.currentUser?.uid}/${Date.now()}_${file.name}`);
        setFormData(prev => ({ ...prev, photos: [...prev.photos, url] }));
        resolve(url);
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(promise, {
      loading: 'Enviando foto...',
      success: 'Foto enviada com sucesso!',
      error: 'Erro ao enviar foto.'
    });
  };

  const handleSave = async (status: 'draft' | 'final') => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    const signatureData = sigPad.current?.toDataURL();
    
    try {
      const data = {
        ...formData,
        signature: signatureData || formData.signature || '',
        status,
        createdBy: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
        progress: status === 'final' ? 100 : 0
      };

      if (initialData?.id) {
        await setDoc(doc(db, 'checklists', initialData.id), data, { merge: true });
      } else {
        await addDoc(collection(db, 'checklists'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      
      toast.success(status === 'final' ? 'Checklist finalizado!' : 'Rascunho salvo!');
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'checklists');
      toast.error('Erro ao salvar checklist.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const primaryColor = [255, 144, 109];
    const secondaryColor = [29, 177, 241];
    const borderColor = [200, 200, 200];
    const textColor = [40, 40, 40];
    const lightGray = [245, 245, 245];

    // Header Background
    doc.setFillColor(32, 32, 31);
    doc.rect(0, 0, 210, 50, 'F');

    // Garage Info
    if (profile?.photoURL) {
      try {
        doc.addImage(profile.photoURL, 'JPEG', 15, 10, 30, 30);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CHECKLIST', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(profile?.garageName || 'Precision Garage', 105, 32, { align: 'center' });
    doc.setFontSize(8);
    doc.text(profile?.address || '', 105, 37, { align: 'center' });
    doc.text(profile?.phone || '', 105, 42, { align: 'center' });

    let currentY = 60;

    // Info Table
    const drawTable = (data: any[][], startY: number) => {
      const cellWidth = 170 / data[0].length;
      const cellHeight = 10;
      
      data.forEach((row, i) => {
        row.forEach((cell, j) => {
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          doc.rect(20 + j * cellWidth, startY + i * cellHeight, cellWidth, cellHeight);
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(cell.label, 22 + j * cellWidth, startY + i * cellHeight + 4);
          doc.setFontSize(9);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.text(cell.value || '-', 22 + j * cellWidth, startY + i * cellHeight + 8);
        });
      });
      return startY + data.length * cellHeight;
    };

    const infoData = [
      [
        { label: 'NOME:', value: formData.client.name },
        { label: 'TEL:', value: formData.client.phone },
        { label: 'ENTRADA:', value: formData.vehicle.entryDate },
        { label: 'SAÍDA:', value: formData.vehicle.exitDate }
      ],
      [
        { label: 'VEÍCULO:', value: formData.vehicle.model },
        { label: 'CATEGORIA:', value: formData.vehicle.category },
        { label: 'COR:', value: formData.vehicle.color },
        { label: 'PLACA:', value: formData.vehicle.plate }
      ],
      [
        { label: 'CHASSI:', value: formData.vehicle.vin },
        { label: 'MOTOR:', value: formData.vehicle.engineNumber },
        { label: 'SEGURADORA:', value: formData.vehicle.insurance },
        { label: 'KM:', value: formData.vehicle.mileage }
      ]
    ];

    currentY = drawTable(infoData, currentY);
    currentY += 10;

    // Sections: Mapeamento and Processos (Two Columns)
    const drawSectionHeader = (title: string, x: number, y: number, w: number, color: number[]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(x, y, w, 8, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title, x + w / 2, y + 5.5, { align: 'center' });
      return y + 12;
    };

    const mappingY = currentY;
    drawSectionHeader('MAPEAMENTO', 20, mappingY, 80, primaryColor);
    
    const processesY = currentY;
    drawSectionHeader('PROCESSOS', 110, processesY, 80, secondaryColor);

    let listY = currentY + 15;
    const maxItems = Math.max(formData.damageMapping.length, formData.processes.length);
    
    for (let i = 0; i < maxItems; i++) {
      if (listY > 260) {
        doc.addPage();
        listY = 20;
      }
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      // Mapping Item
      if (formData.damageMapping[i]) {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.circle(25, listY - 1, 1.5, 'S');
        doc.text(formData.damageMapping[i].item, 30, listY);
      }

      // Process Item
      if (formData.processes[i]) {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.circle(115, listY - 1, 1.5, 'S');
        doc.text(formData.processes[i].name, 120, listY);
      }

      listY += 6;
    }

    currentY = Math.max(listY, currentY + 20);

    // Fuel and Mileage
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('QUANTIA DE COMBUSTÍVEL APROXIMADO', 140, currentY, { align: 'center' });
    
    const fuelOptions = ['R', '1/2', '1'];
    fuelOptions.forEach((opt, i) => {
      const x = 120 + i * 20;
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.circle(x, currentY + 8, 2, 'S');
      doc.setFontSize(8);
      doc.text(opt, x + 5, currentY + 9);
      
      // Mark current fuel (rough approximation)
      const fuelVal = parseInt(formData.vehicle.fuel);
      if ((opt === 'R' && fuelVal < 25) || (opt === '1/2' && fuelVal >= 25 && fuelVal < 75) || (opt === '1' && fuelVal >= 75)) {
        doc.setFillColor(textColor[0], textColor[1], textColor[2]);
        doc.circle(x, currentY + 8, 1.2, 'F');
      }
    });

    currentY += 20;
    doc.text(`QUILOMETRAGEM ATUAL: ${formData.vehicle.mileage || '-'}`, 140, currentY, { align: 'center' });
    currentY += 10;
    doc.text(`VALOR TOTAL DO SERVIÇO: R$ ${formData.estimatedValue || '0,00'}`, 140, currentY, { align: 'center' });

    // Signature Area
    currentY = 250;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY + 20, 90, currentY + 20);
    doc.line(120, currentY + 20, 190, currentY + 20);
    
    if (formData.signature) {
      try {
        doc.addImage(formData.signature, 'PNG', 25, currentY - 5, 50, 20);
      } catch (e) {
        console.error("Error adding signature to PDF", e);
      }
    }
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('TÉCNICO RESPONSÁVEL', 55, currentY + 25, { align: 'center' });
    doc.text('CLIENTE', 155, currentY + 25, { align: 'center' });
    
    doc.text(`Precision Garage - Gerado em ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });

    doc.save(`checklist_${formData.vehicle.plate || 'pendente'}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-headline transition-all duration-500 ${step >= i ? 'bg-[#ff906d] text-[#000000]' : 'bg-[#20201f] text-[#adaaaa] border border-[#484847]'}`}>
              {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
            </div>
          ))}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-[0.2em]">Passo {step} de 4</p>
          <h3 className="font-headline font-bold text-lg text-[#ff906d]">
            {step === 1 && 'DADOS DO CLIENTE'}
            {step === 2 && 'DADOS DO VEÍCULO'}
            {step === 3 && 'MAPEAMENTO DE DANOS'}
            {step === 4 && 'FINALIZAÇÃO'}
          </h3>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nome Completo" icon={User} placeholder="Ex: João Silva" value={formData.client.name} onChange={(e: any) => setFormData({...formData, client: {...formData.client, name: e.target.value}})} />
              <Input label="Telefone / WhatsApp" icon={Phone} placeholder="(00) 00000-0000" value={formData.client.phone} onChange={(e: any) => setFormData({...formData, client: {...formData.client, phone: e.target.value}})} />
              <Input label="E-mail" icon={Mail} placeholder="joao@email.com" className="md:col-span-2" value={formData.client.email} onChange={(e: any) => setFormData({...formData, client: {...formData.client, email: e.target.value}})} />
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Modelo da Moto" icon={Bike} placeholder="Ex: Honda CB 500X" value={formData.vehicle.model} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, model: e.target.value}})} />
              <Input label="Categoria" icon={SettingsIcon} placeholder="Ex: Naked, Trail, Custom" value={formData.vehicle.category} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, category: e.target.value}})} />
              <Input label="Placa" icon={Ruler} placeholder="ABC-1234" value={formData.vehicle.plate} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, plate: e.target.value.toUpperCase()}})} />
              <Input label="Ano" icon={CalendarIcon} placeholder="2023" value={formData.vehicle.year} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, year: e.target.value}})} />
              <Input label="Cor" icon={PenTool} placeholder="Preto Fosco" value={formData.vehicle.color} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, color: e.target.value}})} />
              <Input label="Kilometragem" icon={Disc} placeholder="15.000 km" value={formData.vehicle.mileage} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, mileage: e.target.value}})} />
              <Input label="Chassi (VIN)" icon={PenTool} placeholder="Número do Chassi" value={formData.vehicle.vin} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, vin: e.target.value}})} />
              <Input label="Número do Motor" icon={SettingsIcon} placeholder="Número do Motor" value={formData.vehicle.engineNumber} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, engineNumber: e.target.value}})} />
              <Input label="Seguradora" icon={User} placeholder="Nome da Seguradora" value={formData.vehicle.insurance} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, insurance: e.target.value}})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Data de Entrada" icon={CalendarIcon} type="date" value={formData.vehicle.entryDate} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, entryDate: e.target.value}})} />
                <Input label="Previsão de Saída" icon={CalendarIcon} type="date" value={formData.vehicle.exitDate} onChange={(e: any) => setFormData({...formData, vehicle: {...formData.vehicle, exitDate: e.target.value}})} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold font-headline text-[#adaaaa] uppercase tracking-widest flex justify-between">
                  Nível de Combustível <span>{formData.vehicle.fuel}%</span>
                </label>
                <input type="range" className="w-full accent-[#ff906d]" value={formData.vehicle.fuel} onChange={(e) => setFormData({...formData, vehicle: {...formData.vehicle, fuel: e.target.value}})} />
                <div className="flex justify-between text-[10px] text-[#adaaaa] font-bold">
                  <span>VAZIO</span>
                  <span>MEIO</span>
                  <span>CHEIO</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-[#20201f] p-6 rounded-xl border border-[#484847]">
              <h4 className="font-headline font-bold text-sm mb-4 flex items-center gap-2"><Disc className="w-4 h-4 text-[#ff906d]" /> ITENS E DANOS</h4>
              <div className="space-y-4">
                {formData.damageMapping.map((item, index) => (
                  <div key={index} className="flex gap-4 items-end animate-in slide-in-from-right duration-300">
                    <Select 
                      label="Item" 
                      className="flex-1" 
                      value={item.item}
                      onChange={(e: any) => {
                        const newMapping = [...formData.damageMapping];
                        newMapping[index].item = e.target.value;
                        setFormData({...formData, damageMapping: newMapping});
                      }}
                      options={[
                        { label: 'Selecione...', value: '' },
                        ...masterItems.filter(i => i.type === 'mapping').map(i => ({ label: i.name, value: i.name })),
                        { label: 'Carenagem Lateral', value: 'Carenagem Lateral' },
                        { label: 'Tanque', value: 'Tanque' },
                        { label: 'Pneu Dianteiro', value: 'Pneu Dianteiro' },
                        { label: 'Pneu Traseiro', value: 'Pneu Traseiro' },
                        { label: 'Escapamento', value: 'Escapamento' }
                      ]} 
                    />
                    <Input 
                      label="Dano/Estado" 
                      className="flex-1" 
                      placeholder="Ex: Riscado" 
                      value={item.damage}
                      onChange={(e: any) => {
                        const newMapping = [...formData.damageMapping];
                        newMapping[index].damage = e.target.value;
                        setFormData({...formData, damageMapping: newMapping});
                      }}
                    />
                    <Button variant="danger" size="sm" onClick={() => setFormData({...formData, damageMapping: formData.damageMapping.filter((_, i) => i !== index)})}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" className="w-full border-2 border-dashed border-[#484847] hover:border-[#ff906d]" onClick={() => setFormData({...formData, damageMapping: [...formData.damageMapping, { item: '', damage: '' }]})}>
                  <PlusCircle className="w-4 h-4" /> ADICIONAR ITEM
                </Button>
              </div>
            </div>

            <div className="bg-[#20201f] p-6 rounded-xl border border-[#484847] space-y-4">
              <h4 className="font-headline font-bold text-sm mb-4 flex items-center gap-2"><SettingsIcon className="w-4 h-4 text-[#1db1f1]" /> SERVIÇOS / PROCESSOS</h4>
              <div className="space-y-4">
                {formData.processes.map((proc, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-right duration-300 bg-[#000000]/30 p-4 rounded-xl border border-white/5">
                    <Select 
                      label="Serviço" 
                      className="flex-1" 
                      value={proc.name}
                      onChange={(e: any) => {
                        const newProcs = [...formData.processes];
                        newProcs[index].name = e.target.value;
                        setFormData({...formData, processes: newProcs});
                      }}
                      options={[
                        { label: 'Selecione...', value: '' },
                        ...masterItems.filter(i => i.type === 'service').map(i => ({ label: i.name, value: i.name })),
                        { label: 'Troca de Óleo', value: 'Troca de Óleo' },
                        { label: 'Revisão Geral', value: 'Revisão Geral' },
                        { label: 'Lavagem Premium', value: 'Lavagem Premium' }
                      ]} 
                    />
                    <Select 
                      label="Status" 
                      className="w-full md:w-40" 
                      value={proc.status}
                      onChange={(e: any) => {
                        const newProcs = [...formData.processes];
                        newProcs[index].status = e.target.value;
                        setFormData({...formData, processes: newProcs});
                      }}
                      options={[
                        { label: 'PENDENTE', value: 'PENDENTE' },
                        { label: 'EM ANDAMENTO', value: 'EM ANDAMENTO' },
                        { label: 'CONCLUÍDO', value: 'CONCLUÍDO' }
                      ]} 
                    />
                    <Button variant="danger" size="sm" onClick={() => setFormData({...formData, processes: formData.processes.filter((_, i) => i !== index)})}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" className="w-full border-2 border-dashed border-[#484847] hover:border-[#1db1f1]" onClick={() => setFormData({...formData, processes: [...formData.processes, { name: '', status: 'PENDENTE' }]})}>
                  <PlusCircle className="w-4 h-4" /> ADICIONAR SERVIÇO
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.photos.map((url, i) => (
                <div key={i} className="aspect-square bg-[#20201f] rounded-xl overflow-hidden border border-[#484847] relative group">
                  <img src={url} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }))}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="aspect-square bg-[#20201f] rounded-xl border-2 border-dashed border-[#484847] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#ff906d] transition-colors group">
                <Camera className="w-6 h-6 text-[#adaaaa] group-hover:text-[#ff906d]" />
                <span className="text-[10px] font-bold text-[#adaaaa] uppercase">Adicionar Foto</span>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-[#20201f] p-6 rounded-xl border border-[#484847] space-y-4">
              <h4 className="font-headline font-bold text-sm mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#ff906d]" /> ASSINATURA DO CLIENTE</h4>
              <div className="bg-white rounded-xl overflow-hidden h-48 relative">
                <SignatureCanvas 
                  ref={sigPad}
                  penColor='black'
                  canvasProps={{className: 'w-full h-full'}}
                />
                <button 
                  onClick={() => sigPad.current?.clear()}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-gray-200 text-gray-800 text-xs font-bold rounded-lg hover:bg-gray-300"
                >
                  LIMPAR
                </button>
              </div>
              <p className="text-[10px] text-[#adaaaa] italic">Ao assinar, o cliente concorda com o estado atual do veículo conforme mapeado acima.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="w-full" onClick={generatePDF}>
                <Mail className="w-4 h-4" /> GERAR RELATÓRIO PDF
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => handleSave('draft')}>
                <Save className="w-4 h-4" /> SALVAR RASCUNHO
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 flex gap-4">
        {step > 1 && (
          <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="w-4 h-4" /> VOLTAR
          </Button>
        )}
        {step < 4 ? (
          <Button className="flex-1" onClick={() => setStep(step + 1)}>
            PRÓXIMO <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="flex-1" onClick={() => handleSave('final')} disabled={loading}>
            {loading ? 'PROCESSANDO...' : 'FINALIZAR REGISTRO'} <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
