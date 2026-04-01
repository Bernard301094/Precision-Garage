import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Clock, CheckCircle2,
  AlertCircle, Bike, User, Calendar as CalendarIcon,
  Trash2, FileText, BarChart2, ChevronDown, ChevronUp,
  Timer, ArrowRight, Gauge
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Button, Input } from './UI';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { toast } from 'sonner';

// ── Helpers de estado derivado ───────────────────────────────────────────────
type ItemState = 'pending' | 'inProgress' | 'final';

const getItemState = (item: any): ItemState => {
  if (item.status === 'final') return 'final';
  const procs = item.processes || [];
  if (procs.some((p: any) => p.status === 'EM ANDAMENTO')) return 'inProgress';
  if (procs.some((p: any) => p.status === 'PENDENTE')) return 'pending';
  return 'pending'; // Fallback
};

const STATE_CONFIG: Record<ItemState, {
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
  border: string;
  barColor: string;
  glow: string;
}> = {
  pending: {
    label: 'PENDENTE',
    icon: AlertCircle,
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    barColor: 'bg-accent',
    glow: 'shadow-accent/20',
  },
  inProgress: {
    label: 'EM ANDAMENTO',
    icon: Timer,
    color: 'text-[#1db1f1]',
    bg: 'bg-[#1db1f1]/10',
    border: 'border-[#1db1f1]/20',
    barColor: 'bg-[#1db1f1]',
    glow: 'shadow-[#1db1f1]/20',
  },
  final: {
    label: 'FINALIZADO',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    barColor: 'bg-emerald-500',
    glow: 'shadow-emerald-500/20',
  },
};

// ── Tipos de filtro ───────────────────────────────────────────────────────────
type Filter = 'all' | 'pending' | 'inProgress' | 'final';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',        label: 'TODOS' },
  { id: 'pending',    label: 'PENDENTES' },
  { id: 'inProgress', label: 'EM ANDAMENTO' },
  { id: 'final',      label: 'FINALIZADOS' },
];

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
  const [filter, setFilter] = useState<Filter>('all');
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
    const itemProcs = c.processes || [];
    const matchesFilter = filter === 'all' || 
      (filter === 'final'      ? c.status === 'final' : 
       filter === 'inProgress' ? itemProcs.some((p: any) => p.status === 'EM ANDAMENTO') :
       filter === 'pending'    ? itemProcs.some((p: any) => p.status === 'PENDENTE') : false);
    const matchesDate = !searchDate || (
      c.createdAt?.toDate().toLocaleDateString('pt-BR') === new Date(searchDate + 'T12:00:00').toLocaleDateString('pt-BR')
    );
    return matchesSearch && matchesFilter && matchesDate;
  });

  const stats = {
    pending:    checklists.filter(c => (c.processes || []).some((p: any) => p.status === 'PENDENTE')).length,
    inProgress: checklists.filter(c => (c.processes || []).some((p: any) => p.status === 'EM ANDAMENTO')).length,
    final:      checklists.filter(c => c.status === 'final').length,
  };

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
  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1);

  const serviceCount: Record<string, number> = {};
  checklists.forEach(c => {
    (c.processes || []).forEach((p: any) => {
      if (p.name) serviceCount[p.name] = (serviceCount[p.name] || 0) + 1;
    });
  });
  const topServices = Object.entries(serviceCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxService = Math.max(...topServices.map(([, v]) => v), 1);

  return (
    <div className="space-y-6 pb-24 px-1 sm:px-0">
      
      {/* ── Stats Dashboard ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 'pending' as const,    label: 'PEDIDOS', subLabel: 'PENDENTES',    value: stats.pending,    ...STATE_CONFIG.pending    },
          { id: 'inProgress' as const, label: 'EM CURSO', subLabel: 'ANDAMENTO',  value: stats.inProgress, ...STATE_CONFIG.inProgress },
          { id: 'final' as const,      label: 'FEITOS',  subLabel: 'FINALIZADOS', value: stats.final,      ...STATE_CONFIG.final      },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative group bg-surface p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
              filter === stat.id ? `border-transparent ring-2 ring-offset-2 ring-offset-bg ${stat.color === 'text-accent' ? 'ring-accent' : stat.color === 'text-[#1db1f1]' ? 'ring-[#1db1f1]' : 'ring-emerald-500'}` : 'border-border'
            } hover:shadow-xl ${stat.glow}`}
            onClick={() => setFilter(stat.id)}
          >
            <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-150 ${stat.bg}`} />
            
            <div className="relative z-10 flex flex-col gap-1.5">
              <div className={`p-2 ${stat.bg} ${stat.color} rounded-xl w-fit mb-1`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className={`text-2xl font-black font-headline tracking-tighter ${stat.color}`}>{stat.value}</p>
              <div>
                <p className="text-[10px] font-black text-text-main tracking-tight leading-none">{stat.label}</p>
                <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">{stat.subLabel}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Dashboard Stats (Collapsible) ── */}
      <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm">
        <button
          onClick={() => setShowStats(v => !v)}
          className="w-full flex items-center justify-between p-5 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1db1f1]/10 rounded-xl">
              <BarChart2 className="w-4 h-4 text-[#1db1f1]" />
            </div>
            <div className="text-left">
              <span className="block font-headline font-black text-sm uppercase tracking-widest">Dashboard Analítico</span>
              <span className="block text-[10px] text-text-muted font-bold">Desempenho da Oficina</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-text-muted">{showStats ? 'RECOLHER' : 'ABRIR'}</span>
             {showStats ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </div>
        </button>
        <AnimatePresence>
          {showStats && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 pb-6 space-y-6"
            >
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Volume Mensal</p>
                  <div className="flex items-end gap-2.5 h-24 pt-2">
                    {monthlyData.map(([month, count]) => (
                      <div key={month} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="relative w-full flex flex-col items-center">
                          <span className="absolute -top-6 text-[10px] font-black text-text-main opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{count}</span>
                          <div
                            className="w-full rounded-t-lg bg-accent transition-all duration-500 relative overflow-hidden"
                            style={{ height: `${(count / maxMonthly) * 80}px`, minHeight: count > 0 ? '6px' : '2px', opacity: count > 0 ? 1 : 0.2 }}
                          >
                             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                          </div>
                        </div>
                        <span className="text-[8px] font-black text-text-muted uppercase transform -rotate-45 sm:rotate-0">{month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {topServices.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Frequência de Serviços</p>
                    <div className="space-y-3 pt-1">
                      {topServices.map(([name, count]) => (
                        <div key={name} className="space-y-1.5">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-text-main truncate max-w-[180px]">{name}</span>
                            <span className="text-[10px] font-black text-accent">{count}</span>
                          </div>
                          <div className="h-1.5 bg-bg rounded-full overflow-hidden border border-border/50">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-700"
                              style={{ width: `${(count / maxService) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Search & Filter ── */}
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            icon={Search}
            placeholder="Cliente, placa ou modelo..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            className="h-12 rounded-2xl border-border bg-surface"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="w-full h-12 bg-surface border border-border rounded-2xl pl-10 pr-4 text-sm font-bold text-text-main outline-none focus:border-accent transition-colors"
                style={{ colorScheme: document.body.classList.contains('light-mode') ? 'light' : 'dark' }}
              />
            </div>
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="px-4 h-12 bg-surface-hover border border-border text-[10px] font-black text-text-muted hover:text-text-main rounded-2xl transition-all"
              >
                LIMPAR
              </button>
            )}
          </div>
        </div>

        <div className="relative p-1 bg-surface-hover rounded-2xl border border-border-strong flex overflow-x-auto no-scrollbar">
          {FILTERS.map(f => {
             const isActive = filter === f.id;
             return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`relative flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-text-muted hover:text-text-main'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFilter"
                    className={`absolute inset-0 rounded-xl shadow-lg z-0 ${
                       f.id === 'pending' ? 'bg-accent' :
                       f.id === 'inProgress' ? 'bg-[#1db1f1]' :
                       f.id === 'final' ? 'bg-emerald-600' : 'bg-accent'
                    }`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{f.label}</span>
              </button>
             );
          })}
        </div>
      </div>

      {/* ── Checklist List ── */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((item, i) => {
            // Estado contextual baseado no filtro
            const state = filter === 'all' 
              ? getItemState(item) 
              : (filter as ItemState); 
            
            const cfg = STATE_CONFIG[state];
            
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group relative bg-surface border border-border rounded-[2rem] p-5 hover:border-accent/30 hover:shadow-2xl transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none transition-opacity" />
                
                <div className="relative z-10 space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${cfg.bg} ${cfg.color}`}>
                        <Bike className="w-7 h-7" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-headline font-black text-xl tracking-tight truncate leading-none">{item.vehicle?.model || 'MOTO'}</h4>
                          <div className="px-2 py-0.5 bg-bg text-[10px] font-black text-accent rounded-lg border border-accent/20 tracking-widest flex-shrink-0">
                            {item.vehicle?.plate}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-text-muted">
                           <div className="flex items-center gap-1.5 bg-surface-hover px-2 py-1 rounded-lg border border-border/50">
                              <User className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-bold truncate max-w-[120px]">{item.client?.name}</span>
                           </div>
                           <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              <span>{item.createdAt?.toDate().toLocaleDateString('pt-BR')}</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className={`glass-sm border rounded-2xl px-3 py-1.5 flex items-center gap-2 shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                      <div className="relative flex h-2 w-2">
                        {state === 'inProgress' && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 bg-current ${state === 'inProgress' ? 'animate-pulse-soft' : ''}`}></span>
                      </div>
                      <span className="text-[9px] font-black tracking-widest uppercase">{cfg.label}</span>
                    </div>
                  </div>

                  {/* 🚨 Peeks de Serviços Filtrados (A "janela" solicitada) 🚨 */}
                  {item.processes && item.processes.length > 0 && (
                    <div className="flex flex-wrap gap-2 py-1">
                      {(() => {
                        // Filtra os processos para mostrar apenas os relevantes ao filtro ativo
                        const relevantProcs = (item.processes || []).map((p: any) => ({
                          ...p,
                          status: item.status === 'final' ? 'CONCLUÍDO' : p.status
                        })).filter((p: any) => {
                          if (filter === 'all' || filter === 'final') return true;
                          if (filter === 'pending') return p.status === 'PENDENTE';
                          if (filter === 'inProgress') return p.status === 'EM ANDAMENTO';
                          return true;
                        });

                        return (
                          <>
                            {relevantProcs.slice(0, 4).map((p: any, idx: number) => (
                              <div 
                                key={idx}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black transition-all ${
                                  p.status === 'CONCLUÍDO' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' :
                                  p.status === 'EM ANDAMENTO' ? 'bg-[#1db1f1]/5 text-[#1db1f1] border-[#1db1f1]/20' :
                                  'bg-surface-hover text-text-muted border-border'
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full bg-current ${p.status === 'EM ANDAMENTO' ? 'animate-pulse' : ''}`} />
                                <span className="uppercase tracking-tight whitespace-normal text-left">{p.name}</span>
                                {p.status === 'CONCLUÍDO' && <CheckCircle2 className="w-2.5 h-2.5 ml-0.5" />}
                              </div>
                            ))}
                            {relevantProcs.length > 4 && (
                              <div className="flex items-center justify-center px-2.5 py-1.5 rounded-xl border border-border bg-surface-hover text-[8px] font-black text-text-muted">
                                +{relevantProcs.length - 4} MAIS
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Progress & Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    <div className="sm:col-span-8 space-y-2">
                       <div className="flex justify-between items-end mb-1">
                          <div className="flex items-center gap-2">
                             <Gauge className="w-3.5 h-3.5 text-text-muted" />
                             <p className="text-[9px] font-black text-text-muted tracking-[0.15em] uppercase">Progresso Geral</p>
                          </div>
                          <p className={`text-[11px] font-black ${cfg.color}`}>{item.progress || 0}%</p>
                       </div>
                       <div className="relative h-2.5 bg-bg rounded-full overflow-hidden border border-border/50 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress || 0}%` }}
                            transition={{ duration: 1.2, ease: 'backOut' }}
                            className={`absolute inset-y-0 left-0 rounded-full ${cfg.barColor} shadow-[0_0_15px_rgba(0,0,0,0.1)]`}
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent" />
                          </motion.div>
                       </div>
                    </div>
                    
                    <div className="sm:col-span-4 flex justify-end gap-2">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="p-2 h-11 w-11 rounded-2xl hover:bg-red-500/10 hover:text-red-500 group/trash border border-transparent hover:border-red-500/20 transition-all" 
                         onClick={() => handleDelete(item.id)}
                       >
                         <Trash2 className="w-4.5 h-4.5 transition-transform group-hover/trash:scale-110" />
                       </Button>
                       
                       <div className="flex gap-2 flex-1 max-w-[200px]">
                        {state !== 'final' ? (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => onEditDraft(item)} 
                            className="flex-1 h-11 rounded-2xl text-[10px] font-black bg-surface-hover border border-border text-text-main hover:bg-border group/edit shadow-sm"
                          >
                            RECURSOS
                            <Timer className="w-4 h-4 ml-2 group-hover/edit:rotate-12 transition-transform" />
                          </Button>
                        ) : (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => onViewDetails(item)} 
                            className="flex-1 h-11 rounded-2xl text-[10px] font-black group/pdf shadow-sm"
                          >
                            RELATÓRIO
                            <FileText className="w-4 h-4 ml-2 group-hover/pdf:translate-y-[-2px] transition-transform" />
                          </Button>
                        )}
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => onViewDetails(item)} 
                          className="h-11 w-11 p-0 rounded-2xl flex items-center justify-center bg-accent text-white hover:bg-accent/80 transition-all shadow-lg shadow-accent/20"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-24 text-center space-y-6"
          >
            <div className="relative inline-block">
               <div className="w-24 h-24 bg-surface-hover rounded-[2rem] flex items-center justify-center mx-auto text-text-muted border border-border relative z-10 shadow-inner">
                 <AlertCircle className="w-10 h-10 opacity-30" />
               </div>
               <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent/20 rounded-full blur-xl animate-pulse" />
               <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-blue-500/20 rounded-full blur-2xl animate-pulse delay-700" />
            </div>
            <div className="space-y-1">
               <p className="text-text-main font-headline font-black text-lg tracking-tight">NÃO HÁ NADA POR AQUI</p>
               <p className="text-text-muted text-xs font-bold max-w-xs mx-auto">Não encontramos nenhum registro para os filtros selecionados.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
