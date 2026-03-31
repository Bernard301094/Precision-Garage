import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, MapPin, Phone, Mail, Globe, 
  Camera, Palette, FileText, Download, 
  LogOut, Trash2, ShieldCheck,
  Save, CheckCircle2, PlusCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logout, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button, Input } from './UI';
import { handleFirestoreError, OperationType, uploadImage } from '../lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const SettingsScreen = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [garageData, setGarageData] = useState({
    name: profile?.garageName || '',
    address: profile?.address || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    website: profile?.website || '',
    logo: profile?.photoURL || ''
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const promise = new Promise(async (resolve, reject) => {
      try {
        const url = await uploadImage(file, `logos/${user.uid}/${Date.now()}_${file.name}`);
        setGarageData(prev => ({ ...prev, logo: url }));
        await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
        resolve(url);
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(promise, {
      loading: 'Enviando logo...',
      success: 'Logo atualizado com sucesso!',
      error: 'Erro ao enviar logo.'
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        garageName: garageData.name,
        address: garageData.address,
        phone: garageData.phone,
        email: garageData.email,
        website: garageData.website,
        updatedAt: new Date()
      });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
      toast.error('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'checklists'), where('createdBy', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ID: doc.id,
          Data: d.createdAt?.toDate().toLocaleDateString(),
          Cliente: d.client.name,
          Telefone: d.client.phone,
          Veiculo: d.vehicle.model,
          Placa: d.vehicle.plate,
          KM: d.vehicle.mileage,
          Combustivel: d.vehicle.fuel + '%',
          Status: d.status.toUpperCase()
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Checklists');
      XLSX.writeFile(wb, `checklists_precision_garage_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'checklists');
      toast.error('Erro ao exportar Excel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#ff906d]/10 rounded-2xl text-[#ff906d]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-xl uppercase tracking-widest">Perfil da Oficina</h3>
            <p className="text-[#adaaaa] text-xs font-body">Configure as informações que aparecerão nos seus relatórios.</p>
          </div>
        </div>

        <div className="bg-[#20201f] p-8 rounded-3xl border border-[#484847] space-y-8">
          <div className="flex flex-col md:flex-row items-center gap-8 border-b border-[#484847] pb-8">
            <div className="relative group">
              <div className="w-32 h-32 bg-[#000000] rounded-3xl border-2 border-dashed border-[#484847] flex items-center justify-center overflow-hidden group-hover:border-[#ff906d] transition-all">
                {garageData.logo ? (
                  <img src={garageData.logo} className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-[#adaaaa] group-hover:text-[#ff906d] transition-colors" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-[#ff906d] text-[#000000] rounded-xl cursor-pointer hover:scale-110 transition-transform shadow-xl">
                <PlusCircle className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
            <div className="flex-1 space-y-2 text-center md:text-left">
              <h4 className="font-headline font-bold text-lg">{garageData.name || 'Sua Oficina'}</h4>
              <p className="text-[#adaaaa] text-sm font-body">{garageData.address || 'Endereço não configurado'}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <span className="px-3 py-1 bg-[#000000] text-[10px] font-bold text-[#1db1f1] rounded-full border border-[#1db1f1]/20 uppercase tracking-widest">VERIFICADO</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nome da Oficina" icon={User} placeholder="Ex: Precision Garage" value={garageData.name} onChange={(e: any) => setGarageData({...garageData, name: e.target.value})} />
            <Input label="Telefone Comercial" icon={Phone} placeholder="(00) 0000-0000" value={garageData.phone} onChange={(e: any) => setGarageData({...garageData, phone: e.target.value})} />
            <Input label="Endereço Completo" icon={MapPin} placeholder="Rua, Número, Bairro, Cidade" className="md:col-span-2" value={garageData.address} onChange={(e: any) => setGarageData({...garageData, address: e.target.value})} />
            <Input label="E-mail de Contato" icon={Mail} placeholder="contato@oficina.com" value={garageData.email} onChange={(e: any) => setGarageData({...garageData, email: e.target.value})} />
            <Input label="Website / Redes Sociais" icon={Globe} placeholder="www.oficina.com" value={garageData.website} onChange={(e: any) => setGarageData({...garageData, website: e.target.value})} />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'} <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#1db1f1]/10 rounded-2xl text-[#1db1f1]">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-xl uppercase tracking-widest">Interface & Dados</h3>
            <p className="text-[#adaaaa] text-xs font-body">Personalize sua experiência e gerencie seus dados.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="secondary" className="justify-start h-20 px-8" onClick={handleExportExcel} disabled={loading}>
            <div className="text-left">
              <p className="text-[10px] font-bold text-[#ff906d] uppercase tracking-widest mb-1">EXPORTAÇÃO</p>
              <p className="text-sm font-headline font-bold">Exportar para Excel (.xlsx)</p>
            </div>
            <Download className="w-5 h-5 ml-auto text-[#adaaaa]" />
          </Button>
        </div>
      </section>

      <section className="pt-12 border-t border-[#484847] space-y-6">
        <div className="flex items-center justify-between p-6 bg-red-500/5 rounded-3xl border border-red-500/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-lg text-red-500">Zona de Perigo</h4>
              <p className="text-[#adaaaa] text-xs font-body">Encerrar sua sessão atual neste dispositivo.</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => logout()}>
            SAIR DA CONTA
          </Button>
        </div>
      </section>
    </div>
  );
};
