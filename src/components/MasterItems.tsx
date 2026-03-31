import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import {
  collection, addDoc, onSnapshot, query,
  where, deleteDoc, doc
} from 'firebase/firestore';
import {
  PlusCircle, Trash2, Bike, Fuel, Disc,
  Settings as SettingsIcon, Ruler, Armchair,
  Wrench, X, History, DollarSign
} from 'lucide-react';
import { Button, Input } from './UI';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { toast } from 'sonner';

interface MasterItem {
  id: string;
  name: string;
  description: string;
  type: 'mapping' | 'service';
  price?: number;
  createdBy: string;
}

const ITEM_ICONS: Record<string, React.ReactNode> = {
  carenagem: <Bike className="w-5 h-5" />,
  tanque:    <Fuel className="w-5 h-5" />,
  banco:     <Armchair className="w-5 h-5" />,
  assento:   <Armchair className="w-5 h-5" />,
  pneu:      <Disc className="w-5 h-5" />,
  roda:      <Disc className="w-5 h-5" />,
  escape:    <Wrench className="w-5 h-5" />,
  motor:     <SettingsIcon className="w-5 h-5" />,
};

const getIcon = (name: string) => {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(ITEM_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Ruler className="w-5 h-5" />;
};

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const MasterItemsScreen = () => {
  const [items,     setItems]     = useState<MasterItem[]>([]);
  const [activeTab, setActiveTab] = useState<'mapping' | 'service'>('mapping');
  const [showModal, setShowModal] = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newDesc,   setNewDesc]   = useState('');
  const [newPrice,  setNewPrice]  = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'masterItems'),
      where('createdBy', '==', auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterItem)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'masterItems'));
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !auth.currentUser) return;
    setSaving(true);
    try {
      const payload: any = {
        name:        newName.trim(),
        description: newDesc.trim(),
        type:        activeTab,
        createdBy:   auth.currentUser.uid
      };
      if (activeTab === 'service' && newPrice) {
        payload.price = parseFloat(newPrice.replace(',', '.'));
      }
      await addDoc(collection(db, 'masterItems'), payload);
      toast.success('Item adicionado!');
      setNewName(''); setNewDesc(''); setNewPrice('');
      setShowModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'masterItems');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'masterItems', id));
      toast.success('Item removido.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'masterItems');
    }
  };

  const filtered = items.filter(i => i.type === activeTab);

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="font-headline text-2xl font-bold tracking-tight">GESTÃO DE ITENS</h2>
        <p className="text-text-muted text-sm mt-1">
          Configure os itens mestres para novos checklists de entrada.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg rounded-xl">
        {(['mapping', 'service'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-lg font-bold font-headline text-xs flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === tab
                ? 'bg-surface text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {tab === 'mapping'
              ? <><Ruler className="w-4 h-4" /> MAPEAMENTO</>
              : <><Wrench className="w-4 h-4" /> SERVIÇOS</>}
          </button>
        ))}
      </div>

      {/* Stats — só na aba service */}
      {activeTab === 'service' && filtered.length > 0 && (() => {
        const total = filtered.reduce((s, i) => s + (i.price || 0), 0);
        const withPrice = filtered.filter(i => i.price).length;
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-2xl p-4">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Serviços cadastrados</p>
              <p className="font-headline font-bold text-2xl mt-1">{filtered.length}</p>
            </div>
            <div className="bg-surface rounded-2xl p-4">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Com preço definido</p>
              <p className="font-headline font-bold text-2xl mt-1 text-accent">{withPrice}</p>
            </div>
          </div>
        );
      })()}

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-surface p-4 rounded-2xl flex items-center gap-4 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                item.type === 'mapping'
                  ? 'text-accent bg-accent/10'
                  : 'text-[#1db1f1] bg-[#1db1f1]/10'
              }`}>
                {getIcon(item.name)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-bold text-sm truncate">{item.name}</h3>
                <p className="text-text-muted text-xs truncate">{item.description}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    item.type === 'mapping'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-[#1db1f1]/10 text-[#1db1f1]'
                  }`}>
                    {item.type === 'mapping' ? 'MAPEAMENTO' : 'SERVIÇO'}
                  </span>
                  {item.type === 'service' && item.price != null && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400">
                      {fmt(item.price)}
                    </span>
                  )}
                  {item.type === 'service' && !item.price && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-border-strong/30 text-text-muted">
                      Sem preço
                    </span>
                  )}
                  <span className="text-[9px] text-text-muted/50">ID: #{item.id.slice(0,6).toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-text-muted hover:text-[#1db1f1] transition-colors">
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-text-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <Ruler className="w-8 h-8 text-text-muted mx-auto" />
            <p className="text-text-muted text-sm">Nenhum item cadastrado ainda.</p>
          </div>
        )}

        <button
          onClick={() => setShowModal(true)}
          className="w-full border-2 border-dashed border-border-strong hover:border-accent rounded-2xl py-8 flex flex-col items-center gap-2 transition-colors group"
        >
          <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center group-hover:bg-accent/10 transition-colors">
            <PlusCircle className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
          </div>
          <span className="font-headline font-bold text-sm text-text-muted group-hover:text-text-main transition-colors">
            Novo Item Mestre
          </span>
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="w-full max-w-sm bg-surface rounded-3xl p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-headline font-bold text-base">Novo Item Mestre</h4>
                <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text-main">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2">
                {(['mapping', 'service'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 py-2 rounded-xl font-headline font-bold text-xs transition-all ${
                      activeTab === t ? 'bg-accent text-black' : 'bg-border text-text-muted'
                    }`}
                  >
                    {t === 'mapping' ? 'MAPEAMENTO' : 'SERVIÇO'}
                  </button>
                ))}
              </div>

              <Input
                label="Nome do Item"
                placeholder="Ex: Lavagem Técnica Detalhada"
                value={newName}
                onChange={(e: any) => setNewName(e.target.value)}
              />
              <Input
                label="Descrição Curta"
                placeholder="Ex: Limpeza profunda com descontaminação"
                value={newDesc}
                onChange={(e: any) => setNewDesc(e.target.value)}
              />

              {/* Campo de preço — só para serviços */}
              <AnimatePresence>
                {activeTab === 'service' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm pointer-events-none">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className="w-full bg-bg rounded-xl pl-10 pr-4 py-3 text-text-main font-headline font-bold text-lg outline-none placeholder:text-text-muted focus:ring-1 focus:ring-accent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                        Preço base
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-1 px-1">
                      Este valor será sugerido automaticamente ao adicionar o serviço no checklist.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                className="w-full"
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
              >
                <PlusCircle className="w-4 h-4" />
                {saving ? 'SALVANDO...' : 'ADICIONAR ITEM'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
