import React, { useState, useEffect, useReducer, PropsWithChildren, Component } from 'react';
import { SideMenu } from './components/SideMenu';
import { 
    IconApp, IconPlus, IconMinus, IconTrash, IconUndo, IconSearch
} from './components/icons';
import { EquipmentCategory, AppData, DailyData, EquipmentItem } from './types';
import { CATEGORIES } from './constants';
import { EquipmentSection } from './components/EquipmentComponents';
import { SummaryFooter } from './components/SummaryFooter';
import { 
    PhotoGalleryModal, CameraModal, CalendarModal, DownloadModal, ShareModal, 
    SettingsModal, AboutModal, ConfirmationModal, SearchModal 
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

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

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
  const [confirmation, setConfirmation] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [cameraModalItem, setCameraModalItem] = useState<EquipmentItem | null>(null);
  const [isGlobalDeleteMode, setIsGlobalDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  
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

  // Load Data from IndexedDB
  useEffect(() => {
    const loadData = async () => {
        const dbData = await loadAppDataFromDB();
        if (dbData) {
            dispatch({ type: 'SET_DATA', payload: dbData });
        } else {
             // Fallback to localstorage for migration or first load
             const localData = localStorage.getItem('equipmentData');
             if (localData) {
                 dispatch({ type: 'SET_DATA', payload: JSON.parse(localData) });
             }
        }
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

  // Save Data to IndexedDB (Debounced)
  useEffect(() => {
    if (isLoaded && !isRestoring && Object.keys(appData).length > 0) {
        const timeoutId = setTimeout(() => {
            saveAppDataToDB(appData);
        }, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }
  }, [appData, isRestoring, isLoaded]);

  const currentDayData: DailyData = appData[formattedDate] || createEmptyDailyData();

  const handleAddItem = () => {
    if (activeCategory) {
        dispatchWithHistory({ type: 'ADD_ITEM', payload: { date: formattedDate, category: activeCategory } });
    }
  };

  const handleUpdateItem = (category: EquipmentCategory, item: EquipmentItem) => dispatchWithHistory({ type: 'UPDATE_ITEM', payload: { date: formattedDate, category, item } });

  const handleUndo = () => {
    if (history.length > 0) {
      const previousState = history[0];
      setHistory(history.slice(1));
      setIsRestoring(true);
      dispatch({ type: 'SET_DATA', payload: previousState });
      setTimeout(() => setIsRestoring(false), 100);
    }
  }

  const handleToggleDeleteMode = () => {
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

  if (!isLoaded) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Carregando dados...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans pb-32 relative overflow-hidden">
      {/* Milky Overlay Texture */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-white/40 backdrop-blur-3xl"></div>

      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onMenuClick={(m) => { setActiveModal(m); setIsMenuOpen(false); }}/>
      
      <header className="sticky top-0 z-30 pt-4 pb-2 px-4 relative shadow-sm border-b border-white/30 bg-white/20 backdrop-blur-xl">
        <div className="container mx-auto relative z-10">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    {/* Menu Button using the requested IconApp */}
                    <button onClick={() => setIsMenuOpen(true)} className="active:scale-90 transition-transform duration-200 rounded-2xl shadow-sm">
                        <IconApp className="w-14 h-14 drop-shadow-xl" />
                    </button>
                    
                    <span className="text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400 drop-shadow-sm">
                        Equipamentos
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <ActionButton onClick={handleAddItem}><IconPlus className="w-4 h-4" /></ActionButton>
                    <ActionButton onClick={handleToggleDeleteMode} isDanger={isGlobalDeleteMode}><IconMinus className="w-4 h-4" /></ActionButton>
                    {isGlobalDeleteMode && Object.values(selectedItems).reduce<number>((acc, items: string[]) => acc + items.length, 0) > 0 && (
                    <ActionButton onClick={handleConfirmGlobalDelete} isDanger={true}><IconTrash className="w-4 h-4" /></ActionButton>
                    )}
                    <ActionButton onClick={handleUndo}><IconUndo className="w-4 h-4" /></ActionButton>
                    <ActionButton onClick={() => setIsSearchActive(!isSearchActive)}><IconSearch className="w-4 h-4" /></ActionButton>
                </div>
            </div>

            <div className="text-center mt-2">
                <div className="inline-block px-6 py-1 rounded-full bg-white/40 border border-white/50 backdrop-blur-md shadow-sm">
                    {/* Date in Gray as requested */}
                    <div className="text-lg font-extrabold tracking-tight drop-shadow-sm text-slate-500">
                        {currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                </div>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-3 space-y-5 relative z-10">
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
            />
        ))}
      </main>

      <SummaryFooter data={currentDayData} allData={appData} currentDate={formattedDate} />
            
      {galleryItem && <PhotoGalleryModal item={galleryItem} onClose={() => setGalleryItem(null)} onUpdatePhotos={(photos: string[]) => {
        const cat = Object.keys(currentDayData).find(k => currentDayData[k as EquipmentCategory].some(i => i.id === galleryItem.id)) as EquipmentCategory;
        if(cat) {
            const updated = { ...galleryItem, photos };
            handleUpdateItem(cat, updated);
            setGalleryItem(updated);
        }
      }} setConfirmation={setConfirmation} />}
      
      {cameraModalItem && <CameraModal onClose={() => setCameraModalItem(null)} onCapture={(photo: string, code: string) => {
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
      {activeModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} onClearData={() => setConfirmation({ message: "Apagar tudo permanentemente?", onConfirm: () => { dispatchWithHistory({ type: 'CLEAR_ALL_DATA' }); setActiveModal(null); } })}/>}
      {activeModal === 'about' && <AboutModal onClose={() => setActiveModal(null)} onShareClick={() => setActiveModal('shareApp')}/>}
      {activeModal === 'shareApp' && <ShareModal appData={appData} currentDate={currentDate} isSharingApp onClose={() => setActiveModal(null)} />}
      {isSearchActive && <SearchModal onClose={() => setIsSearchActive(false)} appData={appData} onSelect={(res: any) => { 
          const [y, m, d] = res.date.split('-'); 
          setCurrentDate(new Date(y, m-1, d)); 
          setIsSearchActive(false); 
      }} />}
      {confirmation && <ConfirmationModal message={confirmation.message} onConfirm={() => { confirmation.onConfirm(); setConfirmation(null); }} onCancel={() => setConfirmation(null)} />}
    </div>
  );
};

// 3D Button Style
const ActionButton = ({ children, onClick, isPrimary, isDanger }: PropsWithChildren<{ onClick: () => void, isPrimary?: boolean, isDanger?: boolean }>) => (
    <button 
        onClick={onClick} 
        className={`
            w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-75 ease-out
            bg-white border border-slate-200
            shadow-[0_3px_0_#cbd5e1]
            active:shadow-none
            active:translate-y-[3px]
            active:border-t-2 active:border-slate-200
            ${isDanger 
                ? 'text-red-500 border-red-100 shadow-[0_3px_0_#fca5a5] hover:bg-red-50' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-600'
            }
        `}
    >
        {children}
    </button>
);

const App = () => (<ErrorBoundary><AppContent /></ErrorBoundary>)
export default App;