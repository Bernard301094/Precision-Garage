import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search, Clock, CheckCircle2,
  AlertCircle, Bike, User, Calendar as CalendarIcon,
  Trash2, FileText, BarChart2, ChevronDown, ChevronUp
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Button, Input } from './UI';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { toast } from 'sonner';

export const HistoryScreen = ({
  onViewDetails,
  onEditDraft
}: {
  onViewDetails: (checklist: any) => void;
  onEditDraft: (checklist: any) => void;
}) => {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'final'>('all');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'checklists'),
      where('createdBy', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChecklists(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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
    }
  };

  const filtered = checklists.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      (c.client?.name || '').toLowerCase().includes(term) ||
      (c.vehicle?.plate || '').toLowerCase().includes(term) ||
      (c.vehicle?.model || '').toLowerCase().includes(term);
    const matchesFilter = filter === 'all' || c.status === filter;
    const matchesDate = !searchDate || (
      c.createdAt?.toDate().toLocaleDateString('pt-BR') === new Date(searchDate + 'T12:00:00').toLocaleDateString('pt-BR')
    );
    return matchesSearch && matchesFilter && matchesDate;
  });

  const stats = {
    today: checklists.filter(c => {
      const today = new Date().toDateString();
      return c.createdAt?.toDate().toDateString() === today;
    }).length,
    inProgress: checklists.filter(c => c.status === 'draft').length,
    completed: checklists.filter(c => c.status === 'final').length
  };

  // Gráfico simples: checklists por mês (últimos 6 meses)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    checklists.forEach(c => {
      if (!c.createdAt) return;
      const d = c.createdAt.toDate();
      const key = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (key in months) months[key]++;
    });
    return Object.entries(months);
  })();
  const maxMonthly = Math.max(...monthlyData.map(([,v]) => v), 1);

  // Top serviços
  const serviceCount: Record<string, number> = {};
  checklists.forEach(c => {
    (c.processes || []).forEach((p: any) => {
      if (p.name) serviceCount[p.name] = (serviceCount[p.name] || 0) + 1;
    });
  });
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxService = Math.max(...topServices.map(([,v]) => v), 1);

  return (
    <div className="space-y-6 pb-24">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'HOJE', value: stats.today, icon: CalendarIcon, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'RASCUNHOS', value: stats.inProgress, icon: Clock, color: 'text-[#1db1f1]', bg: 'bg-[#1db1f1]/10' },
          { label: 'FINALIZADOS', value: stats.completed, icon: CheckCircle2, color: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-hover p-4 rounded-2xl border border-border-strong flex flex-col gap-2"
          >
            <div className={`p-2 ${stat.bg} rounded-xl ${stat.color} w-fit`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className={`text-2xl font-bold font-headline ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Dashboard collapsible */}
      <div className="bg-surface rounded-2xl overflow-hidden border border-border">
        <button
          onClick={() => setShowStats(v => !v)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#1db1f1]" />
            <span className="font-headline font-bold text-sm uppercase tracking-widest">Dashboard</span>
          </div>
          {showStats ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </button>
        {showStats && (
          <div className="px-4 pb-5 space-y-5">
            {/* Gráfico de barras mensal */}
            <div>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-3">Checklists por Mês</p>
              <div className="flex items-end gap-2 h-20">
                {monthlyData.map(([month, count]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[8px] font-bold text-text-muted">{count > 0 ? count : ''}</span>
                    <div
                      className="w-full rounded-t-md bg-accent transition-all duration-500"
                      style={{ height: `${(count / maxMonthly) * 60}px`, minHeight: count > 0 ? '4px' : '2px', opacity: count > 0 ? 1 : 0.2 }}
                    />
                    <span className="text-[7px] text-text-muted uppercase">{month}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Top serviços */}
            {topServices.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-3">Serviços Mais Usados</p>
                <div className="space-y-2">
                  {topServices.map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-36 truncate">{name}</span>
                      <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1db1f1] rounded-full"
                          style={{ width: `${(count / maxService) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-text-main w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search + filtros */}
      <div className="space-y-3">
        <Input
          icon={Search}
          placeholder="Buscar por cliente, placa ou veículo..."
          value={searchTerm}
          onChange={(e: any) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="date"
              value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              className={`w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-main outline-none focus:border-accent`}
              style={{ colorScheme: document.body.classList.contains('light-mode') ? 'light' : 'dark' }}
            />
          </div>
          {searchDate && (
            <button
              onClick={() => setSearchDate('')}
              className="px-3 py-2.5 text-text-muted hover:text-text-main text-xs font-bold bg-surface border border-border rounded-xl"
            >
              LIMPAR
            </button>
          )}
        </div>
        <div className="flex gap-2 p-1 bg-surface-hover rounded-xl border border-border-strong">
          {(['all', 'draft', 'final'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                filter === f ? 'bg-accent text-text-on-accent' : 'text-text-muted hover:text-text-main'
              }`}
            >
              {f === 'all' ? 'TODOS' : f === 'draft' ? 'RASCUNHOS' : 'FINALIZADOS'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-surface-hover p-4 rounded-2xl border border-border-strong hover:bg-surface-hover transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                item.status === 'final' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-[#1db1f1]/10 text-[#1db1f1]'
              }`}>
                <Bike className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-headline font-bold text-base truncate">{item.vehicle?.model || '-'}</h4>
                  <span className="px-2 py-0.5 bg-bg text-[9px] font-bold text-accent rounded border border-accent/20 tracking-widest flex-shrink-0">
                    {item.vehicle?.plate}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-text-muted text-xs">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.client?.name}</span>
                  <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {item.createdAt?.toDate().toLocaleDateString('pt-BR')}</span>
                </div>
                {/* Barra de progresso */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.status === 'final' ? 'bg-[#00ff88]' : 'bg-[#1db1f1]'
                      }`}
                      style={{ width: `${item.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-text-muted">{item.progress || 0}%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="ghost" size="sm" className="p-2" onClick={() => handleDelete(item.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
              {item.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={() => onEditDraft(item)} className="flex-1">
                  EDITAR
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => onViewDetails(item)} className="flex-1">
                <FileText className="w-4 h-4" /> DETALHES
              </Button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto text-text-muted">
              <AlertCircle className="w-10 h-10" />
            </div>
            <p className="text-text-muted font-body">Nenhum registro encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
