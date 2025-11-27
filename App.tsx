import React, { useState, useEffect, useReducer, Component } from 'react';
import { SideMenu } from './components/SideMenu';
import { 
    IconApp, IconPlus, IconMinus, IconTrash, IconUndo, IconSearch, IconBell
} from './components/icons';
import { EquipmentCategory, AppData, DailyData, EquipmentItem, UserSettings, NotificationItem } from './types';
import { CATEGORIES } from './constants';
import { EquipmentSection } from './components/EquipmentComponents';
import { SummaryFooter } from './components/SummaryFooter';
import { 
    PhotoGalleryModal, CameraModal, CalendarModal, DownloadModal, ShareModal, 
    SettingsModal, AboutModal, ConfirmationModal, SearchModal, SecurityLockModal, AuthorizationPopup, NotificationsModal
} from './components/Modals';
import { saveAppDataToDB, loadAppDataFromDB } from './utils/db';

// --- UTILITIES ---

const getFormattedDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const createEmptyDailyData = (): DailyData => {
  const data = CATEGORIES.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {} as DailyData);

  CATEGORIES.forEach(category => {
    data[category].push({ id: generateId(), qt: '', contract: '', serial: '', photos: [] });
  });

  return data;
};

// --- REDUCER ---

type Action =
  | { type: 'SET_DATA'; payload: AppData }
  | { type: 'ENSURE_DAY_DATA'; payload: { date: string; dayData: DailyData } }
  | { type: 'ADD_ITEM'; payload: { date: string; category: EquipmentCategory } }
  | { type: 'UPDATE_ITEM'; payload: { date: string; category: EquipmentCategory; item: EquipmentItem } }
  | { type: 'DELETE_ITEMS'; payload: { date: string; category: EquipmentCategory; itemIds: string[] } }
  | { type: 'CLEAR_ALL_DATA' };

const dataReducer = (state: AppData, action: Action): AppData => {
    switch(action.type) {
        case 'SET_DATA': return action.payload;
        case 'ENSURE_DAY_DATA': {
            const { date, dayData } = action.payload;
            if (state[date]) return state;
            const newState = { ...state };
            newState[date] = dayData;
            return newState;
        }
        case 'ADD_ITEM': {
            const { date, category } = action.payload;
            const newState = JSON.parse(JSON.stringify(state));
            if (!newState[date]) newState[date] = createEmptyDailyData();
            const newItem: EquipmentItem = { id: generateId(), qt: '', contract: '', serial: '', photos: [] };
            newState[date][category].push(newItem);
            return newState;
        }
        case 'UPDATE_ITEM': {
            const { date, category, item } = action.payload;
            const newState = JSON.parse(JSON.stringify(state));
            const dayData = newState[date]?.[category];
            if (!dayData) return state;
            const itemIndex = dayData.findIndex((i: EquipmentItem) => i.id === item.id);
            if (itemIndex > -1) dayData[itemIndex] = item;
            else dayData.push(item);
            return newState;
        }
        case 'DELETE_ITEMS': {
            const { date, category, itemIds } = action.payload;
            const newState = JSON.parse(JSON.stringify(state));
            const dayData = newState[date]?.[category];
            if (!dayData) return state;
            newState[date][category] = dayData.filter((item: EquipmentItem) => !itemIds.includes(item.id));
            if (newState[date][category].length === 0) {
                 newState[date][category].push({ id: generateId(), qt: '', contract: '', serial: '', photos: [] });
            }
            return newState;
        }
        case 'CLEAR_ALL_DATA': return {};
        default: return state;
    }
}

// --- ERROR BOUNDARY ---

interface ErrorBoundaryProps { children?: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-center text-red-600"><h1>Erro inesperado</h1><button onClick={() => window.location.reload()}>Recarregar</button></div>;
    }
    return this.props.children;
  }
}

// --- MAIN APP CONTENT ---

const AppContent = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appData, dispatch] = useReducer(dataReducer, {});
  const [history, setHistory] = useState<AppData[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [galleryItem, setGalleryItem] = useState<EquipmentItem | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<EquipmentCategory>(CATEGORIES[0]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [confirmation, setConfirmation] = useState<{ message: string; subMessage?: string; onConfirm: () => void; isDanger?: boolean } | null>(null);
  const [cameraModalItem, setCameraModalItem] = useState<EquipmentItem | null>(null);
  const [isGlobalDeleteMode, setIsGlobalDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  
  // New States for Features
  const [userSettings, setUserSettings] = useState<UserSettings>({ 
      name: '', 
      cpf: '',
      autoSave: true,
      darkMode: false,
      notifications: true
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  // Security Simulation States
  const [isLockedMode, setIsLockedMode] = useState(false); // Simulates Receiver View
  const [showSecurityLock, setShowSecurityLock] = useState(false);
  const [authRequest, setAuthRequest] = useState<{ active: boolean, timer?: number } | null>(null);

  const formattedDate = getFormattedDate(currentDate);

  const dispatchWithHistory = (action: Action) => {
    setHistory(prev => [appData, ...prev].slice(0, 10)); 
    dispatch(action);
  };

  // Auto-update date at midnight
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        if (getFormattedDate(now) !== getFormattedDate(currentDate)) {
            setCurrentDate(now);
        }
    }, 60000);
    return () => clearInterval(timer);
  }, [currentDate]);

  // Load Data and Settings
  useEffect(() => {
    const loadData = async () => {
        const dbData = await loadAppDataFromDB();
        if (dbData) {
            dispatch({ type: 'SET_DATA', payload: dbData });
        } else {
             const localData = localStorage.getItem('equipmentData');
             if (localData) dispatch({ type: 'SET_DATA', payload: JSON.parse(localData) });
        }
        
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) setUserSettings(JSON.parse(savedSettings));

        setIsLoaded(true);
    };
    loadData();
  }, []);

  // Ensure day structure exists
  useEffect(() => {
    if (isLoaded && !appData[formattedDate]) {
      dispatch({ type: 'ENSURE_DAY_DATA', payload: { date: formattedDate, dayData: createEmptyDailyData() } });
    }
  }, [appData, formattedDate, isLoaded]);

  // Save Data (Debounced)
  useEffect(() => {
    if (isLoaded && !isRestoring && Object.keys(appData).length > 0 && userSettings.autoSave) {
        const timeoutId = setTimeout(() => {
            saveAppDataToDB(appData);
        }, 500); 
        return () => clearTimeout(timeoutId);
    }
  }, [appData, isRestoring, isLoaded, userSettings.autoSave]);

  const currentDayData: DailyData = appData[formattedDate] || createEmptyDailyData();

  const handleAddItem = () => {
    if (isLockedMode) { setShowSecurityLock(true); return; }
    if (activeCategory) {
        dispatchWithHistory({ type: 'ADD_ITEM', payload: { date: formattedDate, category: activeCategory } });
    }
  };

  const handleUpdateItem = (category: EquipmentCategory, item: EquipmentItem) => {
      // The lock check is handled by the onClick on the row, but strictly enforcement here too
      if (isLockedMode) { setShowSecurityLock(true); return; }
      dispatchWithHistory({ type: 'UPDATE_ITEM', payload: { date: formattedDate, category, item } });
  }

  const handleUndo = () => {
    if (isLockedMode) { setShowSecurityLock(true); return; }
    if (history.length > 0) {
      const previousState = history[0];
      setHistory(history.slice(1));
      setIsRestoring(true);
      dispatch({ type: 'SET_DATA', payload: previousState });
      setTimeout(() => setIsRestoring(false), 100);
    }
  }

  const handleToggleDeleteMode = () => {
    if (isLockedMode) { setShowSecurityLock(true); return; }
    setIsGlobalDeleteMode(prev => !prev);
    setSelectedItems({}); 
  };

  const handleConfirmGlobalDelete = () => {
      const totalSelected = Object.values(selectedItems).reduce<number>((sum, ids: string[]) => sum + ids.length, 0);
      if (totalSelected > 0) {
        setConfirmation({
            message: `Apagar ${totalSelected} item(s)?`,
            onConfirm: () => {
                Object.entries(selectedItems).forEach(([cat, ids]: [string, string[]]) => {
                    if (ids.length > 0) dispatchWithHistory({ type: 'DELETE_ITEMS', payload: { date: formattedDate, category: cat as EquipmentCategory, itemIds: ids } });
                });
                handleToggleDeleteMode(); 
            }
        });
      }
  };

  const saveSettings = (newSettings: UserSettings) => {
      setUserSettings(newSettings);
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
  };

  // --- SECURITY LOGIC ---

  const handleRequestUnlock = () => {
      setShowSecurityLock(false);
      // Simulate sending request to Dev App
      setAuthRequest({ active: true });
      
      // Auto-dismiss/fail after 10 seconds if not answered
      const timer = setTimeout(() => {
          setAuthRequest(prev => {
              if (prev && prev.active) {
                  // Move to notifications
                  const newNotif: NotificationItem = {
                      id: Date.now().toString(),
                      title: "Solicitação Expirada",
                      message: "Solicitação de alteração do dispositivo Samsung S24 (Simulado) não foi respondida.",
                      timestamp: new Date(),
                      type: 'request'
                  };
                  setNotifications(prevNotifs => [newNotif, ...prevNotifs]);
                  return null; // Close popup
              }
              return prev;
          });
      }, 10000);
  };

  const handleAuthAllow = () => {
      setAuthRequest(null);
      setIsLockedMode(false); // Unlock the app
      alert("Acesso permitido temporariamente.");
  };

  const handleAuthDeny = () => {
      setAuthRequest(null);
  };

  if (!isLoaded) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Carregando dados...</div>;
  }

  // Helper to get first name
  const displayTitle = userSettings.name ? userSettings.name.split(' ')[0] : 'Equipamentos';

  return (
    <div className={`min-h-screen font-sans pb-32 transition-colors duration-300 ${userSettings.darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onMenuClick={(m) => { setActiveModal(m); setIsMenuOpen(false); }}/>
      
      {/* Upper Colored Header Section */}
      <div className="bg-gradient-to-b from-[#2e1065] to-[#3b82f6] pt-8 pb-20 px-6">
        <div className="flex justify-between items-start">
             {/* Menu Button */}
             <button onClick={() => setIsMenuOpen(true)} className="active:scale-95 transition-transform duration-200">
                <IconApp className="w-16 h-16 drop-shadow-2xl" />
            </button>

            {/* Action Buttons Row */}
            <div className="flex gap-2">
                <HeaderActionButton onClick={handleAddItem} icon={<IconPlus />} />
                <HeaderActionButton onClick={handleToggleDeleteMode} icon={<IconMinus />} isDanger={isGlobalDeleteMode} />
                {isGlobalDeleteMode && Object.values(selectedItems).reduce<number>((acc, items: string[]) => acc + items.length, 0) > 0 && (
                   <HeaderActionButton onClick={handleConfirmGlobalDelete} icon={<IconTrash />} isDanger />
                )}
                <HeaderActionButton onClick={handleUndo} icon={<IconUndo />} />
                <HeaderActionButton onClick={() => setIsSearchActive(!isSearchActive)} icon={<IconSearch />} />
                
                {/* Bell Notification */}
                <button 
                    onClick={() => setActiveModal('notifications')}
                    className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-transform active:scale-95 bg-white/20 text-white relative"
                >
                    <IconBell className="w-5 h-5" />
                    {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></span>
                    )}
                </button>
            </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className={`${userSettings.darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded-t-[40px] -mt-10 px-4 pt-8 pb-32 min-h-screen shadow-2xl relative z-10 transition-colors duration-300`}>
        
        {/* Dynamic Title */}
        <h1 className="text-4xl font-bold text-center text-blue-500 mb-8 tracking-tight break-words capitalize">
            {displayTitle}
        </h1>

        {/* Categories List */}
        <div className="space-y-6">
            {CATEGORIES.map(category => (
                <EquipmentSection 
                    key={`${formattedDate}-${category}`} 
                    category={category} 
                    items={currentDayData[category] || []}
                    onUpdateItem={(item) => handleUpdateItem(category, item)}
                    onViewGallery={(item) => setGalleryItem(item)}
                    isDeleteMode={isGlobalDeleteMode}
                    selectedItems={selectedItems[category] || []}
                    onToggleSelect={(id) => setSelectedItems(prev => ({ ...prev, [category]: prev[category]?.includes(id) ? prev[category].filter(i => i !== id) : [...(prev[category]||[]), id] }))}
                    isActive={category === activeCategory}
                    onActivate={() => setActiveCategory(category)}
                    onOpenCamera={(item) => setCameraModalItem(item)}
                    currentDateFormatted={currentDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                    onItemClick={() => { if (isLockedMode) setShowSecurityLock(true); }}
                />
            ))}
        </div>
      </div>

      <SummaryFooter data={currentDayData} allData={appData} currentDate={formattedDate} />
            
      {/* --- MODALS --- */}
      {galleryItem && <PhotoGalleryModal item={galleryItem} onClose={() => setGalleryItem(null)} onUpdatePhotos={(photos: string[]) => {
        if (isLockedMode) { setShowSecurityLock(true); return; }
        const cat = Object.keys(currentDayData).find(k => currentDayData[k as EquipmentCategory].some(i => i.id === galleryItem.id)) as EquipmentCategory;
        if(cat) {
            const updated = { ...galleryItem, photos };
            handleUpdateItem(cat, updated);
            setGalleryItem(updated);
        }
      }} setConfirmation={setConfirmation} />}
      
      {cameraModalItem && <CameraModal onClose={() => setCameraModalItem(null)} onCapture={(photo: string, code: string) => {
           if (isLockedMode) { setShowSecurityLock(true); return; }
           const cat = Object.keys(currentDayData).find(k => currentDayData[k as EquipmentCategory].some(i => i.id === cameraModalItem.id)) as EquipmentCategory;
           if (cat) {
               const updated = { ...cameraModalItem };
               if (photo) updated.photos = [...updated.photos, photo];
               if (code) updated.serial = code;
               handleUpdateItem(cat, updated);
           }
           setCameraModalItem(null);
      }} />}

      {activeModal === 'calendar' && <CalendarModal currentDate={currentDate} onClose={() => setActiveModal(null)} onDateSelect={(d: Date) => { setCurrentDate(d); setActiveModal(null); }}/>}
      {activeModal === 'save' && <DownloadModal appData={appData} currentDate={currentDate} onClose={() => setActiveModal(null)} />}
      {activeModal === 'export' && <ShareModal appData={appData} currentDate={currentDate} onClose={() => setActiveModal(null)} />}
      {activeModal === 'settings' && (
        <SettingsModal 
            onClose={() => setActiveModal(null)} 
            onClearData={() => setConfirmation({ 
                message: "⚠️ ZONA DE PERIGO ⚠️", 
                subMessage: "Esta ação NÃO pode ser desfeita!\n\nTodos os dados serão apagados permanentemente.\n\nDeseja realmente continuar?",
                onConfirm: () => { dispatchWithHistory({ type: 'CLEAR_ALL_DATA' }); setActiveModal(null); },
                isDanger: true
            })} 
            userSettings={userSettings}
            onSaveSettings={saveSettings}
            isLocked={isLockedMode}
            toggleLock={() => setIsLockedMode(!isLockedMode)}
        />
      )}
      {activeModal === 'about' && <AboutModal onClose={() => setActiveModal(null)} onShareClick={() => setActiveModal('shareApp')}/>}
      {activeModal === 'shareApp' && <ShareModal appData={appData} currentDate={currentDate} isSharingApp onClose={() => setActiveModal(null)} />}
      {activeModal === 'notifications' && <NotificationsModal onClose={() => setActiveModal(null)} notifications={notifications} />}
      
      {isSearchActive && <SearchModal onClose={() => setIsSearchActive(false)} appData={appData} onSelect={(res: any) => { 
          const [y, m, d] = res.date.split('-'); 
          setCurrentDate(new Date(y, m-1, d)); 
          setIsSearchActive(false); 
      }} />}
      
      {confirmation && <ConfirmationModal 
          message={confirmation.message} 
          subMessage={confirmation.subMessage}
          onConfirm={() => { confirmation.onConfirm(); setConfirmation(null); }} 
          onCancel={() => setConfirmation(null)} 
          isDanger={confirmation.isDanger}
      />}

      {/* --- SECURITY POPUPS --- */}
      {showSecurityLock && <SecurityLockModal onClose={() => setShowSecurityLock(false)} onRequestUnlock={handleRequestUnlock} />}
      {authRequest?.active && (
        <AuthorizationPopup 
            deviceName="Samsung Galaxy S24" 
            onAllow={handleAuthAllow} 
            onDeny={handleAuthDeny} 
        />
      )}
    </div>
  );
};

const HeaderActionButton = ({ onClick, icon, isDanger }: { onClick: () => void, icon: React.ReactNode, isDanger?: boolean }) => (
    <button 
        onClick={onClick}
        className={`
            w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg transition-transform active:scale-95
            ${isDanger ? 'bg-red-500/20 text-red-100' : 'bg-white/20 text-white'}
        `}
    >
        <div className="w-5 h-5">{icon}</div>
    </button>
);

const App = () => (<ErrorBoundary><AppContent /></ErrorBoundary>)
export default App;