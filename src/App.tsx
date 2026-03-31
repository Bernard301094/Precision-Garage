import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle, History, Settings as SettingsIcon,
  Bike, ShieldCheck, Bell,
  CheckSquare
} from 'lucide-react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { signInWithGoogle } from './lib/firebase';
import { Button } from './components/UI';
import { ChecklistScreen } from './components/ChecklistForm';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { MasterItemsScreen } from './components/MasterItems';
import { ChecklistDetails } from './components/ChecklistDetails';

const LoginScreen = () => (
  <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ff906d] rounded-full blur-[120px] opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#1db1f1] rounded-full blur-[120px] opacity-20" />
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
        <h1 className="text-4xl font-headline font-bold tracking-tighter text-white">
          PRECISION <span className="text-[#ff906d]">GARAGE</span>
        </h1>
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
      <p className="text-[10px] text-[#adaaaa]/50 font-body">
        Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
      </p>
    </motion.div>
  </div>
);

const MainApp = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'checklist' | 'history' | 'settings'>('history');
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
  const [editingChecklist, setEditingChecklist] = useState<any>(null);

  // ── Modo claro / escuro aplicado no <body> ────────────────────
  const [darkMode] = useState(() => localStorage.getItem('pg_dark') !== 'false');
  useEffect(() => {
    const applyTheme = () => {
      const isDark = localStorage.getItem('pg_dark') !== 'false';
      document.body.classList.toggle('light-mode', !isDark);
    };
    applyTheme();
    // Re-aplica quando Settings muda o valor
    window.addEventListener('storage', applyTheme);
    // Polling leve para sincronizar toggle na mesma tab
    const interval = setInterval(applyTheme, 500);
    return () => {
      window.removeEventListener('storage', applyTheme);
      clearInterval(interval);
    };
  }, []);
  // ────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'checklist', label: 'CHECKLIST', icon: CheckSquare },
    { id: 'history',   label: 'HISTÓRICO', icon: History },
    { id: 'settings',  label: 'AJUSTES',   icon: SettingsIcon },
  ];

  const showingChecklist = activeTab === 'checklist' || !!editingChecklist;

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white font-body selection:bg-[#ff906d] selection:text-[#000000] pg-surface-2">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0e0e0e]/90 backdrop-blur-xl px-5 py-4 pg-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center overflow-hidden border border-[#ff906d]/20">
              {profile?.photoURL
                ? <img src={profile.photoURL} className="w-full h-full object-cover" alt="logo" />
                : <Bike className="w-6 h-6 text-[#ff906d]" />}
            </div>
            <div>
              <p className="font-headline font-bold text-sm tracking-tight leading-none">
                PRECISION <span className="text-[#ff906d]">GARAGE</span>
              </p>
              <p className="text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest leading-none mt-0.5 pg-muted">
                {profile?.garageName || 'OFICINA DE ALTA PERFORMANCE'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-[#adaaaa] hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff906d] rounded-full border-2 border-[#0e0e0e]" />
            </button>
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-[#484847] flex-shrink-0">
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-[#20201f] flex items-center justify-center">
                    <Bike className="w-4 h-4 text-[#adaaaa]" />
                  </div>}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-5 pt-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedChecklist ? 'details' : (editingChecklist ? 'edit' : activeTab)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {selectedChecklist ? (
              <ChecklistDetails
                checklist={selectedChecklist}
                onBack={() => setSelectedChecklist(null)}
              />
            ) : showingChecklist ? (
              <ChecklistScreen
                initialData={editingChecklist}
                onComplete={() => {
                  setEditingChecklist(null);
                  setActiveTab('history');
                }}
              />
            ) : activeTab === 'history' ? (
              <HistoryScreen
                onViewDetails={(c) => setSelectedChecklist(c)}
                onEditDraft={(c) => setEditingChecklist(c)}
              />
            ) : activeTab === 'settings' ? (
              <SettingsScreen />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e0e0e]/95 backdrop-blur-xl border-t border-[#1e1e1e] px-2 pb-safe pg-nav">
        <div className="flex items-center justify-around">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id && !selectedChecklist;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedChecklist(null);
                  setEditingChecklist(null);
                  setActiveTab(tab.id as any);
                }}
                className={`relative flex flex-col items-center gap-1 py-3 px-6 transition-all duration-300 ${
                  isActive ? 'text-[#ff906d]' : 'text-[#adaaaa]'
                }`}
              >
                <tab.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[9px] font-bold font-headline tracking-widest">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 w-12 h-0.5 bg-[#ff906d] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB */}
      {activeTab !== 'checklist' && !selectedChecklist && !editingChecklist && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab('checklist')}
          className="fixed bottom-20 right-5 w-14 h-14 bg-[#ff906d] text-[#000000] rounded-2xl shadow-xl shadow-[#ff906d]/30 flex items-center justify-center z-40"
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
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-[#ff906d] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#adaaaa] font-headline font-bold animate-pulse tracking-widest">CARREGANDO SISTEMA...</p>
        </div>
      </div>
    );
  }
  return user ? <MainApp /> : <LoginScreen />;
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
