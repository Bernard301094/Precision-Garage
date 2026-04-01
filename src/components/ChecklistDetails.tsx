import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, Phone, Mail, MapPin, Calendar as CalendarIcon, 
  Bike, Fuel, Disc, Settings as SettingsIcon,
  Ruler, PenTool, CheckCircle2, ArrowLeft,
  FileText, Download, Trash2, Camera, Loader2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from './UI';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export const ChecklistDetails = ({ checklist: initialChecklist, onBack }: { checklist: any, onBack: () => void }) => {
  const { profile } = useAuth();
  const [checklist, setChecklist] = useState(initialChecklist);
  const [updatingIdx, setUpdatingIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync state if prop changes (solves stale data caching across quick renders)
  React.useEffect(() => {
    setChecklist(initialChecklist);
  }, [initialChecklist]);

  const PROCESS_STATUSES = ['PENDENTE', 'EM ANDAMENTO', 'CONCLUÍDO'];

  const handleFinalize = async () => {
    if (!checklist.id || loading) return;
    setLoading(true);
    try {
      const procs = (checklist.processes || []).map((p: any) => ({ ...p, status: 'CONCLUÍDO' }));
      await updateDoc(doc(db, 'checklists', checklist.id), {
        status: 'final',
        progress: 100,
        processes: procs
      });
      setChecklist(p => ({ ...p, status: 'final', progress: 100, processes: procs }));
      toast.success('Checklist finalizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao finalizar checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleCycleStatus = async (idx: number) => {
    if (updatingIdx !== null || !checklist.id) return;
    setUpdatingIdx(idx);
    
    try {
      const procs = [...checklist.processes];
      const current = PROCESS_STATUSES.indexOf(procs[idx].status || 'PENDENTE');
      const nextStatus = PROCESS_STATUSES[(current + 1) % PROCESS_STATUSES.length];
      procs[idx].status = nextStatus;

      const progress = checklist.status === 'final' 
        ? 100 
        : Math.round((procs.filter(p => p.status === 'CONCLUÍDO').length / Math.max(procs.length, 1)) * 100);

      const updatedChecklist = { ...checklist, processes: procs, progress };

      await updateDoc(doc(db, 'checklists', checklist.id), {
        processes: procs,
        progress: progress
      });

      setChecklist(updatedChecklist);
      toast.success(`Serviço marcado como ${nextStatus}`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status do serviço');
    } finally {
      setUpdatingIdx(null);
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
    doc.text('RELATÓRIO DE INSPEÇÃO', 105, 25, { align: 'center' });
    
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
        { label: 'NOME:', value: checklist.client.name },
        { label: 'TEL:', value: checklist.client.phone },
        { label: 'ENTRADA:', value: checklist.vehicle.entryDate },
        { label: 'SAÍDA:', value: checklist.vehicle.exitDate }
      ],
      [
        { label: 'VEÍCULO:', value: checklist.vehicle.model },
        { label: 'CATEGORIA:', value: checklist.vehicle.category },
        { label: 'COR:', value: checklist.vehicle.color },
        { label: 'PLACA:', value: checklist.vehicle.plate }
      ],
      [
        { label: 'CHASSI:', value: checklist.vehicle.vin },
        { label: 'MOTOR:', value: checklist.vehicle.engineNumber },
        { label: 'SEGURADORA:', value: checklist.vehicle.insurance },
        { label: 'KM:', value: checklist.vehicle.mileage }
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
    const maxItems = Math.max(checklist.damageMapping.length, checklist.processes?.length || 0);
    
    for (let i = 0; i < maxItems; i++) {
      if (listY > 260) {
        doc.addPage();
        listY = 20;
      }
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      // Mapping Item
      if (checklist.damageMapping[i]) {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.circle(25, listY - 1, 1.5, 'S');
        doc.text(checklist.damageMapping[i].item, 30, listY);
      }

      // Process Item
      if (checklist.processes?.[i]) {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.circle(115, listY - 1, 1.5, 'S');
        doc.text(checklist.processes[i].name, 120, listY);
        
        // Status indicator
        const status = checklist.processes[i].status;
        const sColor = status === 'CONCLUÍDO' ? [0, 150, 0] : status === 'EM ANDAMENTO' ? [255, 144, 109] : [29, 177, 241];
        doc.setTextColor(sColor[0], sColor[1], sColor[2]);
        doc.setFontSize(6);
        doc.text(`(${status})`, 185, listY, { align: 'right' });
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(8);
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
      
      // Mark current fuel
      const fuelVal = parseInt(checklist.vehicle.fuel);
      if ((opt === 'R' && fuelVal < 25) || (opt === '1/2' && fuelVal >= 25 && fuelVal < 75) || (opt === '1' && fuelVal >= 75)) {
        doc.setFillColor(textColor[0], textColor[1], textColor[2]);
        doc.circle(x, currentY + 8, 1.2, 'F');
      }
    });

    currentY += 20;
    doc.text(`QUILOMETRAGEM ATUAL: ${checklist.vehicle.mileage || '-'}`, 140, currentY, { align: 'center' });
    currentY += 10;
    doc.text(`VALOR TOTAL DO SERVIÇO: R$ ${checklist.estimatedValue || '0,00'}`, 140, currentY, { align: 'center' });

    // Signature Area
    currentY = 250;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY + 20, 90, currentY + 20);
    doc.line(120, currentY + 20, 190, currentY + 20);
    
    if (checklist.signature) {
      try {
        doc.addImage(checklist.signature, 'PNG', 130, currentY - 5, 50, 20);
      } catch (e) {
        console.error("Error adding signature to PDF", e);
      }
    }
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('TÉCNICO RESPONSÁVEL', 55, currentY + 25, { align: 'center' });
    doc.text('CLIENTE', 155, currentY + 25, { align: 'center' });
    
    doc.text(`Precision Garage - Gerado em ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });

    doc.save(`checklist_${checklist.vehicle.plate || 'pendente'}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> VOLTAR AO HISTÓRICO
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generatePDF}>
            <Download className="w-4 h-4" /> PDF
          </Button>
          {checklist.status !== 'final' && (
            <Button size="sm" onClick={handleFinalize} disabled={loading}>
              <CheckCircle2 className="w-4 h-4" /> FINALIZAR
            </Button>
          )}
          <span className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${checklist.status === 'final' ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20' : 'bg-[#1db1f1]/10 text-[#1db1f1] border-[#1db1f1]/20'}`}>
            {checklist.status === 'final' ? 'FINALIZADO' : 'EM ANDAMENTO'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cliente */}
        <div className="bg-surface-hover p-6 rounded-3xl border border-border-strong space-y-4">
          <div className="flex items-center gap-3 text-accent">
            <User className="w-5 h-5" />
            <h4 className="font-headline font-bold text-sm uppercase tracking-widest">Cliente</h4>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-headline font-bold">{checklist.client.name}</p>
            <p className="text-text-muted text-xs flex items-center gap-2"><Phone className="w-3 h-3" /> {checklist.client.phone}</p>
            <p className="text-text-muted text-xs flex items-center gap-2"><Mail className="w-3 h-3" /> {checklist.client.email}</p>
          </div>
        </div>

        {/* Veículo */}
        <div className="bg-surface-hover p-6 rounded-3xl border border-border-strong space-y-4 md:col-span-2">
          <div className="flex items-center gap-3 text-[#1db1f1]">
            <Bike className="w-5 h-5" />
            <h4 className="font-headline font-bold text-sm uppercase tracking-widest">Veículo</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">MODELO</p>
              <p className="text-sm font-bold">{checklist.vehicle.model}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">PLACA</p>
              <p className="text-sm font-bold text-accent">{checklist.vehicle.plate}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">CATEGORIA</p>
              <p className="text-sm font-bold">{checklist.vehicle.category}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">ANO / COR</p>
              <p className="text-sm font-bold">{checklist.vehicle.year} / {checklist.vehicle.color}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">CHASSI</p>
              <p className="text-sm font-bold">{checklist.vehicle.vin || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">MOTOR</p>
              <p className="text-sm font-bold">{checklist.vehicle.engineNumber || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">SEGURADORA</p>
              <p className="text-sm font-bold">{checklist.vehicle.insurance || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">KM</p>
              <p className="text-sm font-bold">{checklist.vehicle.mileage}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">ENTRADA</p>
              <p className="text-sm font-bold">{checklist.vehicle.entryDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">SAÍDA PREVISTA</p>
              <p className="text-sm font-bold">{checklist.vehicle.exitDate}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">COMBUSTÍVEL</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-bg rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${checklist.vehicle.fuel}%` }} />
                </div>
                <span className="text-[10px] font-bold">{checklist.vehicle.fuel}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mapeamento e Fotos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-hover p-8 rounded-3xl border border-border-strong space-y-8">
          <div className="flex items-center gap-3 text-accent">
            <Disc className="w-5 h-5" />
            <h4 className="font-headline font-bold text-sm uppercase tracking-widest">Mapeamento de Danos</h4>
          </div>
          <div className="space-y-4">
            {checklist.damageMapping.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-bg rounded-xl border border-white/5">
                <div>
                  <p className="text-xs font-bold text-accent uppercase tracking-widest mb-1">{d.item}</p>
                  <p className="text-sm font-body">{d.damage}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#00ff88]" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-hover p-8 rounded-3xl border border-border-strong space-y-8">
          <div className="flex items-center gap-3 text-[#1db1f1]">
            <SettingsIcon className="w-5 h-5" />
            <h4 className="font-headline font-bold text-sm uppercase tracking-widest">Serviços / Processos</h4>
          </div>
          <div className="space-y-4">
            {checklist.processes?.map((p: any, i: number) => (
              <button 
                key={i} 
                onClick={() => handleCycleStatus(i)}
                disabled={updatingIdx !== null}
                className={`w-full flex items-center justify-between p-4 bg-bg rounded-xl border text-left transition-all ${
                  p.status === 'CONCLUÍDO' ? 'border-[#00ff88]/20 hover:border-[#00ff88]/50' : 
                  p.status === 'EM ANDAMENTO' ? 'border-accent/20 hover:border-accent/50' : 
                  'border-white/5 hover:border-[#1db1f1]/50'
                }`}
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm font-body font-bold">{p.name}</p>
                </div>
                {updatingIdx === i ? (
                  <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                ) : (
                  <span className={`px-2 py-1 flex-shrink-0 text-[10px] font-bold rounded uppercase transition-colors ${
                    p.status === 'CONCLUÍDO' ? 'bg-[#00ff88]/10 text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.2)]' : 
                    p.status === 'EM ANDAMENTO' ? 'bg-accent/10 text-accent shadow-[0_0_10px_rgba(255,144,109,0.2)]' : 
                    'bg-[#1db1f1]/10 text-[#1db1f1]'
                  }`}>
                    {p.status}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fotos */}
      <div className="bg-surface-hover p-8 rounded-3xl border border-border-strong space-y-8">
        <div className="flex items-center gap-3 text-text-muted">
          <Camera className="w-5 h-5" />
          <h4 className="font-headline font-bold text-sm uppercase tracking-widest">Galeria de Fotos</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {checklist.photos?.map((url: string, i: number) => (
            <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-border-strong">
              <img src={url} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Assinatura */}
      <div className="bg-surface-hover p-8 rounded-3xl border border-border-strong flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 text-center md:text-left">
          <h4 className="font-headline font-bold text-sm uppercase tracking-widest text-text-muted">Assinatura do Cliente</h4>
          <p className="text-[10px] italic text-text-muted/50">Documento validado digitalmente em {checklist.createdAt?.toDate().toLocaleString()}</p>
        </div>
        {checklist.signature ? (
          <div className="bg-white p-4 rounded-2xl w-64 h-32 flex items-center justify-center">
            <img src={checklist.signature} className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div className="w-64 h-32 border-2 border-dashed border-border-strong rounded-2xl flex items-center justify-center text-text-muted text-xs">
            Sem assinatura
          </div>
        )}
      </div>
    </div>
  );
};
