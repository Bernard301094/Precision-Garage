import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlusCircle, History, Settings as SettingsIcon, 
  LogOut, LayoutDashboard, Ruler, 
  Bike, ShieldCheck, Bell, Search,
  Menu, X, ChevronRight, User as UserIcon
} from 'lucide-react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { signInWithGoogle, logout } from './lib/firebase';
import { Button } from './components/UI';
import { ChecklistScreen } from './components/ChecklistForm';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { MasterItemsScreen } from './components/MasterItems';
import { ChecklistDetails } from './components/ChecklistDetails';

const LoginScreen = () => {
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ff906d] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1db1f1] rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#20201f] p-10 rounded-[40px] border border-[#484847] shadow-2xl relative z-10 text-center space-y-10"
      >
        <div className="space-y-4">
          <div className="w-24 h-24 bg-[#000000] rounded-3xl flex items-center justify-center mx-auto border-2 border-[#ff906d] shadow-lg shadow-[#ff906d]/20">
            <Bike className="w-12 h-12 text-[#ff906d]" />
          </div>
          <h1 className="text-4xl font-headline font-bold tracking-tighter text-white">PRECISION <span className="text-[#ff906d]">GARAGE</span></h1>
          <p className="text-[#adaaaa] text-sm font-body">Gestão de alta performance para oficinas de elite.</p>
        </div>

        <div className="space-y-6">
          <Button onClick={signInWithGoogle} className="w-full h-16 text-lg" size="lg">
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-2" />
            ENTRAR COM GOOGLE
          </Button>
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-[#adaaaa] uppercase tracking-[0.3em]">
            <ShieldCheck className="w-4 h-4" /> ACESSO SEGURO
          </div>
        </div>

        <p className="text-[10px] text-[#adaaaa]/50 font-body">Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.</p>
      </motion.div>
    </div>
  );
};

const MainApp = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'checklist' | 'history' | 'settings' | 'master'>('history');
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
  const [editingChecklist, setEditingChecklist] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'history', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'checklist', label: 'Novo Checklist', icon: PlusCircle },
    { id: 'master', label: 'Gestão de Itens', icon: Ruler },
    { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-white font-body selection:bg-[#ff906d] selection:text-[#000000]">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#000000]/80 backdrop-blur-xl border-b border-[#484847] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#20201f] rounded-xl flex items-center justify-center border border-[#ff906d]/20">
              <Bike className="w-6 h-6 text-[#ff906d]" />
            </div>
            <div className="hidden md:block">
              <h2 className="font-headline font-bold text-sm tracking-tight">PRECISION <span className="text-[#ff906d]">GARAGE</span></h2>
              <p className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest">{profile?.garageName || 'OFICINA'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-[#adaaaa] hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff906d] rounded-full border-2 border-[#000000]" />
            </button>
            <div className="h-8 w-[1px] bg-[#484847] mx-2 hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold font-headline">{user?.displayName}</p>
                <p className="text-[10px] text-[#ff906d] font-bold uppercase tracking-widest">{profile?.role || 'ADMIN'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#484847]">
                <img src={user?.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedChecklist ? 'details' : activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {selectedChecklist ? (
              <ChecklistDetails checklist={selectedChecklist} onBack={() => setSelectedChecklist(null)} />
            ) : (
              <>
                {(activeTab === 'checklist' || editingChecklist) && (
                  <ChecklistScreen 
                    initialData={editingChecklist} 
                    onComplete={() => {
                      setEditingChecklist(null);
                      setActiveTab('history');
                    }} 
                  />
                )}
                {activeTab === 'history' && !editingChecklist && (
                  <HistoryScreen 
                    onViewDetails={(c) => setSelectedChecklist(c)} 
                    onEditDraft={(c) => setEditingChecklist(c)}
                  />
                )}
                {activeTab === 'settings' && <SettingsScreen />}
                {activeTab === 'master' && <MasterItemsScreen />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#20201f]/90 backdrop-blur-2xl border border-[#484847] px-4 py-3 rounded-[32px] shadow-2xl flex items-center gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold font-headline text-xs transition-all duration-500 relative group ${activeTab === tab.id ? 'bg-[#ff906d] text-[#000000]' : 'text-[#adaaaa] hover:text-white hover:bg-white/5'}`}
          >
            <tab.icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className={`overflow-hidden transition-all duration-500 ${activeTab === tab.id ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
              {tab.label.toUpperCase()}
            </span>
          </button>
        ))}
      </nav>

      {/* Floating Action Button for Mobile */}
      {activeTab !== 'checklist' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setActiveTab('checklist')}
          className="fixed bottom-24 right-6 md:hidden w-14 h-14 bg-[#ff906d] text-[#000000] rounded-2xl shadow-xl shadow-[#ff906d]/30 flex items-center justify-center z-40 active:scale-90 transition-transform"
        >
          <PlusCircle className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-[#ff906d] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#adaaaa] font-headline font-bold animate-pulse tracking-widest">CARREGANDO SISTEMA...</p>
        </div>
      </div>
    );
  }

  return user ? <MainApp /> : <LoginScreen />;
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
