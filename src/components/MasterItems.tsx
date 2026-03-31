import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore';
import { PlusCircle, Trash2, Bike, Fuel, Disc, Settings as SettingsIcon, Ruler } from 'lucide-react';
import { Button, Input } from './UI';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface MasterItem {
  id: string;
  name: string;
  description: string;
  type: 'mapping' | 'service';
  createdBy: string;
}

export const MasterItemsScreen = () => {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [activeTab, setActiveTab] = useState<'mapping' | 'service'>('mapping');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'masterItems'), where('createdBy', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'masterItems'));
    return () => unsubscribe();
  }, []);

  const handleAddItem = async () => {
    if (!newItemName || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'masterItems'), {
        name: newItemName,
        description: newItemDesc,
        type: activeTab,
        createdBy: auth.currentUser.uid
      });
      setNewItemName('');
      setNewItemDesc('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'masterItems');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'masterItems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'masterItems');
    }
  };

  const filtered = items.filter(i => i.type === activeTab);

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('carenagem')) return <Bike className="w-5 h-5" />;
    if (name.toLowerCase().includes('tanque')) return <Fuel className="w-5 h-5" />;
    if (name.toLowerCase().includes('pneu')) return <Disc className="w-5 h-5" />;
    return <SettingsIcon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-8">
      <div className="py-4">
        <h2 className="font-headline text-3xl font-bold tracking-tight mb-2">GESTÃO DE ITENS</h2>
        <p className="text-[#adaaaa] text-sm font-body">Configure os itens mestres para novos checklists de entrada.</p>
      </div>

      <div className="flex gap-2 mb-8 p-1 bg-[#000000] rounded-xl">
        <button 
          onClick={() => setActiveTab('mapping')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold font-headline text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'mapping' ? 'bg-[#20201f] text-[#ff906d] border-b-2 border-[#ff906d]' : 'text-[#adaaaa] hover:bg-white/5'}`}
        >
          <Ruler className="w-4 h-4" /> MAPEAMENTO
        </button>
        <button 
          onClick={() => setActiveTab('service')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold font-headline text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'service' ? 'bg-[#20201f] text-[#ff906d] border-b-2 border-[#ff906d]' : 'text-[#adaaaa] hover:bg-white/5'}`}
        >
          <SettingsIcon className="w-4 h-4" /> SERVIÇOS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.id} className="bg-[#20201f] p-6 rounded-xl flex flex-col justify-between group hover:bg-[#262626] transition-all duration-300">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-[#ff906d]/10 rounded-lg text-[#ff906d]">
                  {getIcon(item.name)}
                </div>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-[#adaaaa] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-headline font-bold text-lg mb-1">{item.name}</h3>
              <p className="text-[#adaaaa] text-xs mb-4">{item.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-[#000000] text-[10px] font-bold text-[#1db1f1] uppercase rounded tracking-wider">{item.type === 'mapping' ? 'Mapeamento' : 'Serviço'}</span>
              <span className="text-[10px] text-[#adaaaa]/50">ID: #{item.id.slice(0, 6)}</span>
            </div>
          </div>
        ))}

        <div className="border-2 border-dashed border-[#484847] p-6 rounded-xl flex flex-col gap-4 group hover:border-[#ff906d] transition-colors">
          <Input 
            placeholder="Nome do item..." 
            value={newItemName} 
            onChange={e => setNewItemName(e.target.value)} 
            className="bg-transparent border-b border-[#484847]"
          />
          <Input 
            placeholder="Descrição curta..." 
            value={newItemDesc} 
            onChange={e => setNewItemDesc(e.target.value)} 
            className="bg-transparent border-b border-[#484847]"
          />
          <Button onClick={handleAddItem} className="w-full" size="sm">
            <PlusCircle className="w-4 h-4" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
};
