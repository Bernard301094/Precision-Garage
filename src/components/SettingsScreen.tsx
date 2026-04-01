import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, MapPin, Phone, Mail, Globe,
  Camera, Palette, Download,
  LogOut, Save, PlusCircle, AlertTriangle, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logout, db } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Button, Input } from './UI';
import { handleFirestoreError, OperationType, uploadImage, getContrastColor } from '../lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const ACCENT_COLORS = [
  { name: 'orange', value: '#ff906d', label: 'Laranja' },
  { name: 'blue',   value: '#1db1f1', label: 'Azul' },
  { name: 'purple', value: '#a78bfa', label: 'Roxo' },
];

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
      value ? 'bg-accent' : 'bg-border-strong'
    }`}
  >
    <span
      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
        value ? 'left-7' : 'left-1'
      }`}
    />
  </button>
);

export const SettingsScreen = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const [garageData, setGarageData] = useState({
    name:    profile?.garageName || '',
    address: profile?.address    || '',
    phone:   profile?.phone      || '',
    email:   profile?.email      || '',
    website: profile?.website    || '',
    logo:    profile?.logoUrl    || ''
  });

  const [avatarData, setAvatarData] = useState({
    photoURL: profile?.photoURL || user?.photoURL || ''
  });

  const [avatarError, setAvatarError] = useState(false);

  // Interface prefs persisted in localStorage
  const [darkMode,    setDarkMode]    = useState(() => localStorage.getItem('pg_dark')    !== 'false');
  const [animations,  setAnimations]  = useState(() => localStorage.getItem('pg_anim')    !== 'false');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('pg_accent') || '#ff906d');
  
  const [customColors, setCustomColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pg_custom_colors');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const colorInputRef = React.useRef<HTMLInputElement>(null);

  // Sync data dynamically when profile loads (fixes F5 state loss)
  useEffect(() => {
    if (profile) {
      setGarageData(prev => ({
        ...prev,
        name:    profile.garageName || prev.name,
        address: profile.address || prev.address,
        phone:   profile.phone || prev.phone,
        email:   profile.email || prev.email,
        website: profile.website || prev.website,
        logo:    profile.logoUrl || prev.logo
      }));
      setAvatarData(prev => ({
        ...prev,
        photoURL: profile.photoURL || user?.photoURL || prev.photoURL
      }));
    }
  }, [profile, user]);


  useEffect(() => { 
    localStorage.setItem('pg_dark', String(darkMode));
    if (darkMode) document.body.classList.remove('light-mode');
    else document.body.classList.add('light-mode');
  }, [darkMode]);

  useEffect(() => { 
    localStorage.setItem('pg_anim', String(animations));
    if (!animations) {
      document.documentElement.classList.add('no-animations');
    } else {
      document.documentElement.classList.remove('no-animations');
    }
  }, [animations]);

  useEffect(() => { 
    localStorage.setItem('pg_accent', accentColor);
    // Set --color-accent so Tailwind utility classes (bg-accent, text-accent) pick it up
    document.documentElement.style.setProperty('--color-accent', accentColor);
    document.documentElement.style.setProperty('--color-text-on-accent', getContrastColor(accentColor));
  }, [accentColor]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        const url = await uploadImage(file, `logos/${user.uid}/${Date.now()}_${file.name}`);
        setGarageData(prev => ({ ...prev, logo: url }));
        await updateDoc(doc(db, 'users', user.uid), { logoUrl: url });
        resolve(url);
      } catch (err) { reject(err); }
    });
    toast.promise(promise, {
      loading: 'Enviando logo...',
      success: 'Logo atualizado!',
      error:   'Erro ao enviar logo.'
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const promise = new Promise<string>(async (resolve, reject) => {
      try {
        const url = await uploadImage(file, `avatars/${user.uid}/${Date.now()}_${file.name}`);
        setAvatarData({ photoURL: url });
        await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
        resolve(url);
      } catch (err) { reject(err); }
    });
    toast.promise(promise, {
      loading: 'Enviando foto...',
      success: 'Foto de perfil atualizada!',
      error:   'Erro ao enviar foto.'
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        garageName: garageData.name,
        address:    garageData.address,
        phone:      garageData.phone,
        email:      garageData.email,
        website:    garageData.website,
        updatedAt:  new Date()
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally { setLoading(false); }
  };

  const handleExportExcel = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'checklists'), where('createdBy', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => {
        const r = d.data();
        // Tradução simples de status (caso necessário)
        const statusMap: Record<string, string> = {
          'pending': 'PENDENTE',
          'draft': 'PENDENTE',
          'in_progress': 'EM ANDAMENTO',
          'completed': 'CONCLUÍDO',
          'cancelled': 'CANCELADO'
        };
        const rawStatus = (r.status || 'PENDENTE').toLowerCase();
        const translatedStatus = statusMap[rawStatus] || rawStatus.toUpperCase();

        return {
          'CÓDIGO':     d.id.substring(0, 8).toUpperCase(),
          'DATA':       r.createdAt?.toDate().toLocaleDateString('pt-BR'),
          'CLIENTE':    r.client?.name,
          'TELEFONE':   r.client?.phone,
          'VEÍCULO':    r.vehicle?.model,
          'PLACA':      r.vehicle?.plate,
          'CATEGORIA':  r.vehicle?.category || '-',
          'KM':         r.vehicle?.mileage || '0',
          'COMBUSTÍVEL':(r.vehicle?.fuel || '0') + '%',
          'VALOR (R$)': r.estimatedValue || '0,00',
          'STATUS':     translatedStatus
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Ajuste de largura das colunas
      ws['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
        { wch: 15 }
      ];

      // Ativar autofiltro para dar cara de tabela
      const range = XLSX.utils.decode_range(ws['!ref'] || "A1:K1");
      ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Checklists');
      XLSX.writeFile(wb, `checklists_precision_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exportado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'checklists');
    } finally { setLoading(false); }
  };

  const handleExportPDF = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'checklists'), where('createdBy', '==', user.uid));
      const snapshot = await getDocs(q);
      const pdf = new jsPDF();
      
      const primary: [number,number,number] = [14, 14, 14];   // Quase preto
      const accent:  [number,number,number] = [255, 144, 109]; // Laranja PG
      const border:  [number,number,number] = [226, 232, 240]; // Slate 200
      const bgHeader:[number,number,number] = [248, 250, 252]; // Slate 50 (fundo cabeçalho)
      const secondary:[number,number,number] = [100, 116, 139]; // Slate 500

      // ─ CABEÇALHO ───────────────────────────────────────────────────
      pdf.setFillColor(bgHeader[0], bgHeader[1], bgHeader[2]); pdf.rect(0, 0, 210, 40, 'F');
      pdf.setDrawColor(border[0], border[1], border[2]); pdf.line(0, 40, 210, 40);

      const hasLogo = profile?.photoURL;
      if (hasLogo) {
         try { pdf.addImage(profile?.photoURL || '', 'JPEG', 15, 6, 28, 28); } catch(e) {}
      }

      const textX = hasLogo ? 105 : 105; // Centralizado independentemente
      pdf.setTextColor(primary[0], primary[1], primary[2]); pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
      pdf.text('RELATÓRIO GERAL DE CHECKLISTS', textX, 18, { align: 'center' });
      
      pdf.setTextColor(secondary[0], secondary[1], secondary[2]); pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
      pdf.text(garageData.name || 'Precision Garage', textX, 26, { align: 'center' });
      pdf.setFontSize(8); 
      pdf.text(`TOTAL DE REGISTROS: ${snapshot.docs.length} | EMITIDO EM ${new Date().toLocaleString('pt-BR')}`, textX, 32, { align: 'center' });

      let y = 55;
      const headers = ['DATA', 'CLIENTE', 'VEÍCULO', 'PLACA', 'STATUS'];
      const colW = [25, 45, 40, 30, 35];
      let xPos = 15;

      // ─ HEADER DA TABELA ─────────────────────────────────────────────
      pdf.setFillColor(accent[0], accent[1], accent[2]); pdf.roundedRect(15, y - 6, 180, 8, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
      headers.forEach((h, i) => {
         pdf.text(h, xPos + 2, y - 0.5);
         xPos += colW[i];
      });

      y += 8;
      snapshot.docs.forEach((d, idx) => {
         if (y > 275) { 
            pdf.addPage();
            y = 20;
            // Repetir header na nova página
            pdf.setFillColor(accent[0], accent[1], accent[2]); pdf.roundedRect(15, y - 6, 180, 8, 1, 1, 'F');
            pdf.setTextColor(255, 255, 255); pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
            let hX = 15;
            headers.forEach((h, i) => { pdf.text(h, hX + 2, y - 0.5); hX += colW[i]; });
            y += 8;
         }

         const r = d.data();
         
         // Tradução de status
         const statusMap: Record<string, string> = {
            'pending': 'PENDENTE',
            'draft': 'RASCUNHO',
            'in_progress': 'EM ANDAMENTO',
            'completed': 'CONCLUÍDO',
            'cancelled': 'CANCELADO'
         };
         const rawStatus = (r.status || 'PENDENTE').toLowerCase();
         const translatedStatus = statusMap[rawStatus] || rawStatus.toUpperCase();

         const row = [
            r.createdAt?.toDate().toLocaleDateString('pt-BR') || '-',
            (r.client?.name || '-').substring(0, 20),
            (r.vehicle?.model || '-').substring(0, 18),
            (r.vehicle?.plate || '-'),
            translatedStatus
         ];

         // Fundo zebrado sutil
         if (idx % 2 === 0) { pdf.setFillColor(252, 252, 252); pdf.rect(15, y - 5, 180, 7, 'F'); }
         
         pdf.setDrawColor(border[0], border[1], border[2]); pdf.line(15, y + 2, 195, y + 2);
         
         pdf.setTextColor(primary[0], primary[1], primary[2]); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
         let curX = 15;
         row.forEach((cell, i) => {
            if (i === 4) { // Status column
               const isFinal = cell === 'CONCLUÍDO';
               pdf.setTextColor(isFinal ? 34 : accent[0], isFinal ? 197 : accent[1], isFinal ? 94 : accent[2]);
               pdf.setFont('helvetica', 'bold');
            }
            pdf.text(String(cell), curX + 2, y);
            pdf.setTextColor(primary[0], primary[1], primary[2]); pdf.setFont('helvetica', 'normal');
            curX += colW[i];
         });
         y += 7;
      });

      pdf.save(`relatorio_geral_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF consolidado pronto!');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'checklists');
    } finally { setLoading(false); }
  };


  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="font-headline text-2xl font-bold">Ajustes</h2>
        <p className="text-text-muted text-sm mt-1">Configure a identidade e as ferramentas da sua oficina.</p>
      </div>

      {/* Perfil da Oficina */}
      <section className="bg-surface rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl text-accent">
            <User className="w-5 h-5" />
          </div>
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Perfil da Oficina</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Logo Upload */}
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Logo da Oficina</p>
            <label className="group cursor-pointer">
              <div className="w-28 h-28 bg-bg rounded-2xl border-2 border-dashed border-border-strong group-hover:border-accent transition-all flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                {garageData.logo && !logoError ? (
                  <>
                    <img src={garageData.logo} className="w-full h-full object-cover" alt="logo" onError={() => setLogoError(true)} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-text-main" />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center px-2">ALTERAR</span>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => { setLogoError(false); handleLogoUpload(e); }} />
            </label>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Sua Foto (Avatar)</p>
            <label className="group cursor-pointer">
              <div className="w-28 h-28 bg-bg rounded-full border-2 border-dashed border-border-strong group-hover:border-[#1db1f1] transition-all flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                {avatarData.photoURL && !avatarError ? (
                  <>
                    <img src={avatarData.photoURL} className="w-full h-full object-cover" alt="avatar" onError={() => setAvatarError(true)} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-text-main" />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-text-muted group-hover:text-[#1db1f1] transition-colors" />
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center px-2">ALTERAR</span>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => { setAvatarError(false); handleAvatarUpload(e); }} />
            </label>
          </div>
        </div>


        <div className="space-y-4">
          <Input
            label="Nome da Oficina"
            icon={User}
            placeholder="Ex: Precision Garage Detailing"
            value={garageData.name}
            onChange={(e: any) => setGarageData({ ...garageData, name: e.target.value })}
          />
          <Input
            label="Endereço Técnico"
            icon={MapPin}
            placeholder="Rua, Número — Bairro, Cidade"
            value={garageData.address}
            onChange={(e: any) => setGarageData({ ...garageData, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telefone"
              icon={Phone}
              placeholder="(11) 99999-9999"
              value={garageData.phone}
              onChange={(e: any) => setGarageData({ ...garageData, phone: e.target.value })}
            />
            <Input
              label="E-mail"
              icon={Mail}
              placeholder="contato@oficina.com"
              value={garageData.email}
              onChange={(e: any) => setGarageData({ ...garageData, email: e.target.value })}
            />
          </div>
          <Input
            label="Website / Redes Sociais"
            icon={Globe}
            placeholder="@oficina ou www.oficina.com"
            value={garageData.website}
            onChange={(e: any) => setGarageData({ ...garageData, website: e.target.value })}
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="w-4 h-4" />
          {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
        </Button>
      </section>

      {/* Interface */}
      <section className="bg-surface rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1db1f1]/10 rounded-xl text-[#1db1f1]">
            <Palette className="w-5 h-5" />
          </div>
          <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Interface</h3>
        </div>

        {/* Esquema de Cores */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Esquema de Cores</p>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setAccentColor(c.value)}
                title={c.label}
                className={`w-9 h-9 flex-shrink-0 rounded-xl transition-all duration-200 ${
                  accentColor === c.value
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
            {customColors.map((color, i) => (
              <button
                key={`custom-${i}`}
                onClick={() => setAccentColor(color)}
                title="Cor Customizada"
                className={`w-9 h-9 flex-shrink-0 rounded-xl transition-all duration-200 ${
                  accentColor === color
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <div className="relative">
              <input 
                type="color" 
                ref={colorInputRef} 
                className="absolute opacity-0 w-0 h-0" 
                onChange={(e) => {
                  const val = e.target.value;
                  setAccentColor(val);
                  if (!ACCENT_COLORS.find(c => c.value === val) && !customColors.includes(val)) {
                    const next = [...customColors, val].slice(-3); // Keep only last 3 custom colors
                    setCustomColors(next);
                    localStorage.setItem('pg_custom_colors', JSON.stringify(next));
                  }
                }} 
              />
              <button 
                onClick={() => colorInputRef.current?.click()}
                className="w-9 h-9 rounded-xl bg-border-strong flex items-center justify-center text-text-muted hover:text-text-main hover:bg-border transition-colors shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-t border-border">
            <span className="text-sm font-body">Modo Escuro</span>
            <Toggle value={darkMode} onChange={setDarkMode} />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border">
            <span className="text-sm font-body text-text-muted">Animações</span>
            <Toggle value={animations} onChange={setAnimations} />
          </div>
        </div>
      </section>

      {/* Exportar Dados */}
      <section className="bg-surface rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-xl text-accent">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest">Exportar Dados</h3>
            <p className="text-text-muted text-xs mt-0.5">Gere relatórios técnicos completos de serviços, checklists e histórico financeiro da sua unidade.</p>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={loading}
          className="w-full flex items-center gap-4 p-4 bg-bg rounded-xl hover:bg-border transition-colors group"
        >
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-left">
            <p className="font-headline font-bold text-sm">RELATÓRIO PDF</p>
            <p className="text-[10px] text-text-muted">Exportar todos os checklists em PDF</p>
          </div>
        </button>

        <button
          onClick={handleExportExcel}
          disabled={loading}
          className="w-full flex items-center gap-4 p-4 bg-bg rounded-xl hover:bg-border transition-colors group"
        >
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
            <Download className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-left">
            <p className="font-headline font-bold text-sm">PLANILHA EXCEL</p>
            <p className="text-[10px] text-text-muted">Exportar dados em formato .xlsx</p>
          </div>
        </button>
      </section>

      {/* Zona de Perigo */}
      <section className="bg-surface rounded-2xl p-5 space-y-4 border border-red-500/20">
        <div>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">ZONA DE PERIGO</p>
          <p className="text-text-muted text-xs mt-1">Ações irreversíveis para a sua conta de oficina.</p>
        </div>
        <button
          onClick={() => setShowDangerModal(true)}
          className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 font-headline font-bold text-sm hover:bg-red-500/10 transition-colors"
        >
          ENCERRAR ATIVIDADES
        </button>
      </section>

      {/* Danger Confirm Modal */}
      <AnimatePresence>
        {showDangerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowDangerModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-sm bg-surface rounded-3xl p-6 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <h4 className="font-headline font-bold text-base">Encerrar Atividades</h4>
                </div>
                <button onClick={() => setShowDangerModal(false)} className="p-1 text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-text-muted text-sm">
                Esta ação encerrará a sua sessão. Para exclusão permanente de dados, entre em contato com o suporte.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDangerModal(false)}
                  className="py-3 rounded-xl bg-border text-text-main font-headline font-bold text-sm"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => logout()}
                  className="py-3 rounded-xl bg-red-500 text-white font-headline font-bold text-sm"
                >
                  CONFIRMAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
