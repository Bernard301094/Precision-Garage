import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle, History, Settings as SettingsIcon,
  Bike, ShieldCheck, Bell, CheckSquare
} from 'lucide-react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { signInWithGoogle } from './lib/firebase';
import { Button } from './components/UI';
import { ChecklistScreen } from './components/ChecklistForm';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ChecklistDetails } from './components/ChecklistDetails';

// ── Login ───────────────────────────────────────────────────────────────
const LoginScreen = () => (
  <div className="min-h-[100dvh] bg-[#000000] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] sm:w-[40%] sm:h-[40%] bg-[#ff906d] rounded-full blur-[100px] sm:blur-[120px] opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] sm:w-[40%] sm:h-[40%] bg-[#1db1f1] rounded-full blur-[100px] sm:blur-[120px] opacity-20" />
    </div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm sm:max-w-md bg-[#20201f] p-8 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-[#484847] shadow-2xl relative z-10 text-center space-y-8 sm:space-y-10"
    >
      <div className="space-y-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#000000] rounded-3xl flex items-center justify-center mx-auto border-2 border-[#ff906d] shadow-lg shadow-[#ff906d]/20">
          <Bike className="w-10 h-10 sm:w-12 sm:h-12 text-[#ff906d]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-headline font-bold tracking-tighter text-white">
          PRECISION <span className="text-[#ff906d]">GARAGE</span>
        </h1>
        <p className="text-[#adaaaa] text-sm font-body">Gestão de alta performance para oficinas de elite.</p>
      </div>
      <div className="space-y-5">
        <Button onClick={signInWithGoogle} className="w-full h-14 sm:h-16 text-base sm:text-lg" size="lg">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-2" />
          ENTRAR COM GOOGLE
        </Button>
        <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-[#adaaaa] uppercase tracking-[0.3em]">
          <ShieldCheck className="w-4 h-4" /> ACESSO SEGURO
        </div>
      </div>
      <p className="text-[10px] text-[#adaaaa]/50 font-body">
        Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade.
      </p>
    </motion.div>
  </div>
);

// ── App principal ─────────────────────────────────────────────────────────
const MainApp = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'checklist' | 'history' | 'settings'>('history');
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);
  const [editingChecklist, setEditingChecklist]   = useState<any>(null);

  useEffect(() => {
    const applyTheme = () => {
      const isDark = localStorage.getItem('pg_dark') !== 'false';
      document.body.classList.toggle('light-mode', !isDark);
    };
    applyTheme();
    window.addEventListener('storage', applyTheme);
    const interval = setInterval(applyTheme, 500);
    return () => { window.removeEventListener('storage', applyTheme); clearInterval(interval); };
  }, []);

  const tabs = [
    { id: 'checklist', label: 'CHECKLIST', icon: CheckSquare },
    { id: 'history',   label: 'HISTÓRICO', icon: History },
    { id: 'settings',  label: 'AJUSTES',   icon: SettingsIcon },
  ];

  const showingChecklist = activeTab === 'checklist' || !!editingChecklist;

  // Logo da oficina: logo customizado > foto do Google > ícone Bike
  const garageLogoUrl: string = profile?.logoUrl || profile?.photoURL || '';

  // Avatar do usuário: foto Google > inicial do nome
  const userInitial = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-[#0e0e0e] text-white font-body selection:bg-[#ff906d] selection:text-[#000000] pg-surface-2">
      <Toaster position="top-right" theme="dark" richColors />

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0e0e0e]/90 backdrop-blur-xl border-b border-[#1e1e1e] pg-header">
        <div className="app-container flex items-center justify-between py-3 sm:py-4">

          {/* Logo da oficina */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center overflow-hidden border border-[#ff906d]/20 flex-shrink-0">
              {garageLogoUrl
                ? <img src={garageLogoUrl} className="w-full h-full object-cover" alt="logo" />
                : <Bike className="w-5 h-5 sm:w-6 sm:h-6 text-[#ff906d]" />}
            </div>
            <div>
              <p className="font-headline font-bold text-xs sm:text-sm tracking-tight leading-none">
                PRECISION <span className="text-[#ff906d]">GARAGE</span>
              </p>
              <p className="text-[9px] sm:text-[10px] text-[#adaaaa] font-bold uppercase tracking-widest leading-none mt-0.5 pg-muted hidden xs:block">
                {profile?.garageName || 'OFICINA DE ALTA PERFORMANCE'}
              </p>
            </div>
          </div>

          {/* Ações: notificação + avatar do usuário */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="relative p-1.5 sm:p-2 text-[#adaaaa] hover:text-white transition-colors rounded-xl hover:bg-[#1a1a1a]">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#ff906d] rounded-full border border-[#0e0e0e]" />
            </button>

            {/* Avatar: foto do Google ou inicial */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border-2 border-[#484847] flex-shrink-0 bg-[#20201f] flex items-center justify-center">
              {user?.photoURL
                ? <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-xs sm:text-sm font-headline font-bold text-[#ff906d]">{userInitial}</span>
              }
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="app-container pt-4 sm:pt-6 pb-28 sm:pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedChecklist ? 'details' : (editingChecklist ? 'edit' : activeTab)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {selectedChecklist ? (
              <ChecklistDetails checklist={selectedChecklist} onBack={() => setSelectedChecklist(null)} />
            ) : showingChecklist ? (
              <ChecklistScreen
                initialData={editingChecklist}
                onComplete={() => { setEditingChecklist(null); setActiveTab('history'); }}
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

      {/* ── Bottom Navigation ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e0e0e]/95 backdrop-blur-xl border-t border-[#1e1e1e] pb-safe pg-nav">
        <div className="app-container">
          <div className="flex items-center justify-around">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id && !selectedChecklist;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setSelectedChecklist(null); setEditingChecklist(null); setActiveTab(tab.id as any); }}
                  className={`relative flex flex-col items-center gap-1 py-3 px-4 sm:px-8 flex-1 transition-all duration-300 ${
                    isActive ? 'text-[#ff906d]' : 'text-[#adaaaa]'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[9px] sm:text-[10px] font-bold font-headline tracking-widest">{tab.label}</span>
                  {isActive && (
                    <motion.div layoutId="tab-indicator"
                      className="absolute bottom-0 w-10 sm:w-12 h-0.5 bg-[#ff906d] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── FAB ──────────────────────────────────────────────────────── */}
      {activeTab !== 'checklist' && !selectedChecklist && !editingChecklist && (
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}
          onClick={() => setActiveTab('checklist')}
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-[#ff906d] text-[#000000] rounded-2xl shadow-xl shadow-[#ff906d]/30 flex items-center justify-center z-40"
        >
          <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        </motion.button>
      )}
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0e0e0e] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-[#ff906d] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#adaaaa] font-headline font-bold animate-pulse tracking-widest text-sm">CARREGANDO...</p>
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
