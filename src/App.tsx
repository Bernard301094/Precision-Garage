import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle, History, Settings as SettingsIcon,
  Bike, ShieldCheck, Bell, CheckSquare
} from 'lucide-react';
import { Toaster } from 'sonner';
import { getContrastColor } from './lib/utils';
import { AuthProvider, useAuth } from './context/AuthContext';
import { signInWithGoogle } from './lib/firebase';
import { Button } from './components/UI';
import { ChecklistScreen } from './components/ChecklistForm';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ChecklistDetails } from './components/ChecklistDetails';

// ── Login ───────────────────────────────────────────────────────────────
const LoginScreen = () => (
  <div className="min-h-[100dvh] bg-bg flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] sm:w-[40%] sm:h-[40%] bg-accent rounded-full blur-[100px] sm:blur-[120px] opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] sm:w-[40%] sm:h-[40%] bg-[#1db1f1] rounded-full blur-[100px] sm:blur-[120px] opacity-20" />
    </div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm sm:max-w-md bg-surface-hover p-8 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-border-strong shadow-2xl relative z-10 text-center space-y-8 sm:space-y-10"
    >
      <div className="space-y-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-bg rounded-3xl flex items-center justify-center mx-auto border-2 border-accent shadow-lg shadow-[#ff906d]/20">
          <Bike className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-headline font-bold tracking-tighter text-text-main">
          PRECISION <span className="text-accent">GARAGE</span>
        </h1>
        <p className="text-text-muted text-sm font-body">Gestão de alta performance para oficinas de elite.</p>
      </div>
      <div className="space-y-5">
        <Button onClick={signInWithGoogle} className="w-full h-14 sm:h-16 text-base sm:text-lg" size="lg">
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-2" />
          ENTRAR COM GOOGLE
        </Button>
        <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em]">
          <ShieldCheck className="w-4 h-4" /> ACESSO SEGURO
        </div>
      </div>
      <p className="text-[10px] text-text-muted/50 font-body">
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

  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      const isDark  = localStorage.getItem('pg_dark') !== 'false';
      const isAnim  = localStorage.getItem('pg_anim')  !== 'false';
      const accent  = localStorage.getItem('pg_accent') || '#ff906d';

      document.body.classList.toggle('light-mode', !isDark);
      document.documentElement.classList.toggle('no-animations', !isAnim);
      document.documentElement.style.setProperty('--accent-color', accent);
      document.documentElement.style.setProperty('--text-on-accent', getContrastColor(accent));
    };
    applyTheme();
    window.addEventListener('storage', applyTheme);
    // Poll every 300ms to pick up SettingsScreen changes within same tab
    const interval = setInterval(applyTheme, 300);
    return () => { window.removeEventListener('storage', applyTheme); clearInterval(interval); };
  }, []);

  const tabs = [
    { id: 'checklist', label: 'CHECKLIST', icon: CheckSquare },
    { id: 'history',   label: 'HISTÓRICO', icon: History },
    { id: 'settings',  label: 'AJUSTES',   icon: SettingsIcon },
  ];

  const showingChecklist = activeTab === 'checklist' || !!editingChecklist;

  // Logo da oficina: logo customizado > ícone Bike
  const garageLogoUrl: string = profile?.logoUrl || '';

  // Avatar do usuário: foto manual (Firestore) > foto Google > inicial do nome
  const userAvatarUrl = profile?.photoURL || user?.photoURL || '';
  const userInitial = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  useEffect(() => { setLogoError(false); }, [garageLogoUrl]);
  useEffect(() => { setAvatarError(false); }, [user?.photoURL]);

  return (
    <div className="min-h-[100dvh] bg-bg text-text-main font-body selection:bg-accent selection:text-text-on-accent pg-surface-2">
      <Toaster 
        position="top-center" 
        toastOptions={{
          className: 'font-body font-bold text-sm tracking-wide rounded-2xl border backdrop-blur-md',
          style: { background: '#1a1a1a', borderColor: '#484847', color: '#fff' },
          classNames: {
            error: 'bg-red-500/10 border-red-500/30 text-red-500',
            success: 'bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88]',
            warning: 'bg-accent/10 border-accent/30 text-accent',
            info: 'bg-[#1db1f1]/10 border-[#1db1f1]/30 text-[#1db1f1]',
          }
        }} 
      />

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-xl border-b border-border pg-header">
        <div className="app-container flex items-center justify-between py-3 sm:py-4">

          {/* Logo da oficina */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-surface rounded-xl flex items-center justify-center overflow-hidden border border-accent/20 flex-shrink-0">
              {garageLogoUrl && !logoError
                ? <img src={garageLogoUrl} className="w-full h-full object-cover" alt="logo" onError={() => setLogoError(true)} />
                : <Bike className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />}
            </div>
            <div>
              <p className="font-headline font-bold text-xs sm:text-sm tracking-tight leading-none">
                PRECISION <span className="text-accent">GARAGE</span>
              </p>
              <p className="text-[9px] sm:text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none mt-0.5 pg-muted hidden xs:block">
                {profile?.garageName || 'OFICINA DE ALTA PERFORMANCE'}
              </p>
            </div>
          </div>

          {/* Ações: notificação + avatar do usuário */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="relative p-1.5 sm:p-2 text-text-muted hover:text-text-main transition-colors rounded-xl hover:bg-surface">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full border border-bg" />
            </button>

            {/* Avatar: foto customizada, ou Google, ou inicial */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border-2 border-border-strong flex-shrink-0 bg-surface-hover flex items-center justify-center">
              {userAvatarUrl && !avatarError
                ? <img src={userAvatarUrl} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                : <span className="text-xs sm:text-sm font-headline font-bold text-accent">{userInitial}</span>
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg/95 backdrop-blur-xl border-t border-border pb-safe pg-nav">
        <div className="app-container">
          <div className="flex items-center justify-around">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id && !selectedChecklist;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setSelectedChecklist(null); setEditingChecklist(null); setActiveTab(tab.id as any); }}
                  className={`relative flex flex-col items-center gap-1 py-3 px-4 sm:px-8 flex-1 transition-all duration-300 ${
                    isActive ? 'text-accent' : 'text-text-muted'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[9px] sm:text-[10px] font-bold font-headline tracking-widest">{tab.label}</span>
                  {isActive && (
                    <motion.div layoutId="tab-indicator"
                      className="absolute bottom-0 w-10 sm:w-12 h-0.5 bg-accent rounded-full" />
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
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-accent text-bg rounded-2xl shadow-xl shadow-[#ff906d]/30 flex items-center justify-center z-40"
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
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-muted font-headline font-bold animate-pulse tracking-widest text-sm">CARREGANDO...</p>
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
