import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Search, Filter, Clock, CheckCircle2, 
  AlertCircle, ArrowRight, Bike, User, Calendar as CalendarIcon,
  Trash2, FileText
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Button, Input } from './UI';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { toast } from 'sonner';

export const HistoryScreen = ({ onViewDetails, onEditDraft }: { onViewDetails: (checklist: any) => void, onEditDraft: (checklist: any) => void }) => {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'final'>('all');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'checklists'), 
      where('createdBy', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChecklists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'checklists'));
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await deleteDoc(doc(db, 'checklists', id));
      toast.success('Registro excluído com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'checklists');
      toast.error('Erro ao excluir registro.');
    }
  };

  const filtered = checklists.filter(c => {
    const matchesSearch = c.client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    today: checklists.filter(c => {
      const today = new Date().toDateString();
      return c.createdAt?.toDate().toDateString() === today;
    }).length,
    inProgress: checklists.filter(c => c.status === 'draft').length,
    completed: checklists.filter(c => c.status === 'final').length
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'SERVIÇOS HOJE', value: stats.today, icon: CalendarIcon, color: 'text-[#ff906d]', bg: 'bg-[#ff906d]/10' },
          { label: 'EM EXECUÇÃO', value: stats.inProgress, icon: Clock, color: 'text-[#1db1f1]', bg: 'bg-[#1db1f1]/10' },
          { label: 'CONCLUÍDOS', value: stats.completed, icon: CheckCircle2, color: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10' }
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="bg-[#20201f] p-6 rounded-2xl border border-[#484847] flex items-center justify-between group hover:border-[#ff906d] transition-all duration-300"
          >
            <div>
              <p className="text-[10px] font-bold text-[#adaaaa] uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <h4 className={`text-3xl font-bold font-headline ${stat.color}`}>{stat.value}</h4>
            </div>
            <div className={`p-4 ${stat.bg} rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-96">
          <Input 
            icon={Search} 
            placeholder="Buscar por cliente ou placa..." 
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 p-1 bg-[#20201f] rounded-xl border border-[#484847]">
          {(['all', 'draft', 'final'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-[#ff906d] text-[#000000]' : 'text-[#adaaaa] hover:text-white'}`}
            >
              {f === 'all' ? 'TODOS' : f === 'draft' ? 'RASCUNHOS' : 'FINALIZADOS'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item, i) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#20201f] p-6 rounded-2xl border border-[#484847] flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-[#262626] transition-all duration-300"
          >
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${item.status === 'final' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-[#1db1f1]/10 text-[#1db1f1]'} border border-white/5`}>
                <Bike className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-headline font-bold text-lg">{item.vehicle.model}</h4>
                  <span className="px-2 py-0.5 bg-[#000000] text-[10px] font-bold text-[#ff906d] rounded border border-[#ff906d]/20 tracking-widest">{item.vehicle.plate}</span>
                </div>
                <div className="flex items-center gap-4 text-[#adaaaa] text-xs">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.client.name}</span>
                  <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {item.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden md:block w-32">
                <div className="flex justify-between text-[10px] font-bold text-[#adaaaa] mb-1 uppercase tracking-widest">
                  <span>PROGRESSO</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#000000] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    className={`h-full ${item.status === 'final' ? 'bg-[#00ff88]' : 'bg-[#1db1f1]'}`}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="p-2" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
                {item.status === 'draft' && (
                  <Button variant="outline" size="sm" onClick={() => onEditDraft(item)}>
                    EDITAR
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => onViewDetails(item)}>
                  <FileText className="w-4 h-4" /> DETALHES
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-[#20201f] rounded-full flex items-center justify-center mx-auto text-[#484847]">
              <AlertCircle className="w-10 h-10" />
            </div>
            <p className="text-[#adaaaa] font-body">Nenhum registro encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
