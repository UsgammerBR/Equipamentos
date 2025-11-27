
import React, { useState, useEffect, useRef, PropsWithChildren } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { 
    IconX, IconChevronLeft, IconChevronRight, IconFileWord, 
    IconFileExcel, IconWhatsapp, IconTelegram, IconEmail, IconShare, IconTrash, IconCamera, IconQrCode, IconGallery, IconApp, IconLock, IconBell, IconSearch, IconAlert
} from './icons';
import { AppData, DailyData, EquipmentCategory, EquipmentItem, UserSettings, NotificationItem } from '../types';
import { CATEGORIES } from '../constants';

// --- HELPER FUNCTIONS ---

const getFormattedDate = (date: Date): string => date.toISOString().split('T')[0];

const isItemActive = (item: EquipmentItem): boolean => {
    return (item.contract && item.contract.trim() !== '') || (item.serial && item.serial.trim() !== '') || item.photos.length > 0;
};

const createEmptyDailyData = (): DailyData => {
  const data = CATEGORIES.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {} as DailyData);
  return data;
};

const getDataInRange = (appData: AppData, currentDate: Date, scope: 'day' | 'month' | 'specific', specificDate?: Date): { data: DailyData, label: string } => {
    let targetDate = currentDate;
    if (scope === 'specific' && specificDate) targetDate = specificDate;

    const fmtDate = getFormattedDate(targetDate);
    
    if (scope === 'day' || scope === 'specific') {
        return { 
            data: appData[fmtDate] || createEmptyDailyData(), 
            label: fmtDate 
        };
    } else {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const currentDay = currentDate.getDate();
        const aggregatedData = createEmptyDailyData();
        
        // Loop from day 1 to current day of the month
        for (let d = 1; d <= currentDay; d++) {
            const loopDate = new Date(year, month, d);
            const loopFmt = getFormattedDate(loopDate);
            const dayData = appData[loopFmt];
            if (dayData) {
                CATEGORIES.forEach(cat => {
                    const items = dayData[cat] || [];
                    const activeItems = items.filter(isItemActive);
                    if (activeItems.length > 0) aggregatedData[cat].push(...activeItems);
                });
            }
        }
        return { data: aggregatedData, label: `Mês ${month + 1}/${year} (até dia ${currentDay})` };
    }
};

// --- GENERIC MODAL COMPONENT ---

interface ModalProps {
    title: string;
    onClose: () => void;
}

export const Modal: React.FC<PropsWithChildren<ModalProps>> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50 animate-slide-in-up max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200/50 flex-shrink-0">
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400">{title}</h3>
                <button onClick={onClose}><IconX className="w-6 h-6 text-slate-400 hover:text-red-500" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">{children}</div>
        </div>
    </div>
);

// --- SECURITY MODALS ---

interface SecurityLockModalProps {
    onClose: () => void;
    onRequestUnlock: () => void;
}

export const SecurityLockModal: React.FC<SecurityLockModalProps> = ({ onClose, onRequestUnlock }) => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
        <div className="bg-gradient-to-br from-red-500/20 to-red-900/40 backdrop-blur-xl border border-red-500/30 p-6 rounded-3xl shadow-2xl max-w-xs w-full text-center animate-scale-in">
             <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <IconLock className="w-10 h-10 text-red-200" />
             </div>
             <h2 className="text-2xl font-black text-red-100 mb-2 drop-shadow-md">Proibido Alterações</h2>
             <p className="text-red-200/80 text-sm mb-6 font-medium">Este dispositivo não tem permissão para editar. Para alterar, peça autorização ao desenvolvedor.</p>
             
             <button onClick={onRequestUnlock} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-500 active:scale-95 transition-all mb-4 border border-red-400">
                Solicitar Autorização
             </button>
             <button onClick={onClose} className="text-red-300 text-sm underline">Fechar</button>

             <div className="mt-8 pt-4 border-t border-red-500/30">
                <p className="text-[10px] text-red-300/60 uppercase tracking-widest font-bold">Propriedade de Leo Luz</p>
             </div>
        </div>
    </div>
);

interface AuthorizationPopupProps {
    deviceName: string;
    onAllow: () => void;
    onDeny: () => void;
}

export const AuthorizationPopup: React.FC<AuthorizationPopupProps> = ({ deviceName, onAllow, onDeny }) => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-transparent">
        <div className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] max-w-xs w-full text-center border border-blue-200 animate-slide-in-up">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Solicitação de Acesso</h3>
            <p className="text-sm text-slate-500 mb-4">
                O dispositivo <b className="text-blue-600">{deviceName}</b> deseja permissão para editar.
            </p>
            <div className="flex gap-3">
                <button onClick={onDeny} className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold rounded-xl border border-slate-200">Negar</button>
                <button onClick={onAllow} className="flex-1 py-2 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30">Permitir</button>
            </div>
            <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-[width_10s_linear_forwards]" style={{width: '100%'}}></div>
            </div>
        </div>
    </div>
);

// --- SPECIFIC MODALS ---

interface CalendarModalProps {
    currentDate: Date;
    onClose: () => void;
    onDateSelect: (date: Date) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ currentDate, onClose, onDateSelect }) => {
    const [viewDate, setViewDate] = useState(currentDate);
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    
    return (
        <Modal title="Selecionar Data" onClose={onClose}>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}><IconChevronLeft className="w-6 h-6 text-slate-600"/></button>
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400 capitalize">{viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}><IconChevronRight className="w-6 h-6 text-slate-600"/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-xs font-bold text-slate-400">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const isSelected = d === currentDate.getDate() && viewDate.getMonth() === currentDate.getMonth() && viewDate.getFullYear() === currentDate.getFullYear();
                    return (
                        <button 
                            key={d} 
                            onClick={() => onDateSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))}
                            className={`p-2 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-cyan-500 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                        >
                            {d}
                        </button>
                    );
                })}
            </div>
            <button onClick={() => onDateSelect(new Date())} className="w-full mt-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Ir para Hoje</button>
        </Modal>
    );
};

interface DownloadModalProps {
    appData: AppData;
    currentDate: Date;
    onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ appData, currentDate, onClose }) => {
    const [range, setRange] = useState<'day' | 'month'>('day');

    const handleDownload = (format: 'word' | 'excel') => {
        try {
            const { data, label } = getDataInRange(appData, currentDate, range, undefined);
            let content = '';
            let mimeType = '';
            let extension = '';

            const styles = `
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid black; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .category-header { background-color: #e0f2fe; font-weight: bold; margin-top: 20px; padding: 10px; }
                </style>
            `;

            if (format === 'word') {
                mimeType = 'application/msword';
                extension = 'doc';
                content = `
                    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head><meta charset='utf-8'><title>Relatório</title>${styles}</head><body>
                    <h1 style="text-align:center;">Relatório de Equipamentos - ${label}</h1>
                    ${CATEGORIES.map(cat => {
                        const items = data[cat] || [];
                        if (items.length === 0) return '';
                        return `
                            <div class="category-header">${cat}</div>
                            <table>
                                <tr><th>Contrato</th><th>Serial</th></tr>
                                ${items.map((item: any) => `<tr><td>${item.contract || '-'}</td><td>${item.serial || '-'}</td></tr>`).join('')}
                            </table>
                            <br/>
                        `;
                    }).join('')}
                    <br/><p>Gerado por EquipTrack Pro</p></body></html>
                `;
            } else {
                mimeType = 'application/vnd.ms-excel';
                extension = 'xls';
                content = `
                    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                    <head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">${styles}</head><body>
                    <table>
                        <thead>
                            <tr><th colspan="3" style="font-size:16px; background-color:#dbeafe;">Relatório - ${label}</th></tr>
                            <tr><th>Categoria</th><th>Contrato</th><th>Serial</th></tr>
                        </thead>
                        <tbody>
                        ${CATEGORIES.flatMap(cat => (data[cat]||[]).map((item: any) => 
                            `<tr><td>${cat}</td><td>${item.contract || '-'}</td><td>${item.serial || '-'}</td></tr>`
                        )).join('')}
                        </tbody>
                    </table></body></html>
                `;
            }

            const blob = new Blob(['\ufeff', content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Equipamentos_${label.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 1000);
        } catch (e) {
            console.error(e);
            alert("Erro ao exportar arquivo. Tente novamente.");
        }
    };

    return (
        <Modal title="Salvar Manualmente" onClose={onClose}>
            <div className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setRange('day')} className={`flex-1 py-1 rounded-md text-sm font-bold ${range === 'day' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Apenas Hoje</button>
                    <button onClick={() => setRange('month')} className={`flex-1 py-1 rounded-md text-sm font-bold ${range === 'month' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Mês até Hoje</button>
                </div>
                <p className="text-sm text-slate-500 text-center">Exportar dados de: <b>{range === 'day' ? 'Hoje' : 'Todo o mês atual'}</b></p>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleDownload('word')} className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 border border-blue-200">
                        <IconFileWord className="w-8 h-8 text-blue-600 mb-2" />
                        <span className="font-bold text-blue-700">Word</span>
                    </button>
                    <button onClick={() => handleDownload('excel')} className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 border border-green-200">
                        <IconFileExcel className="w-8 h-8 text-green-600 mb-2" />
                        <span className="font-bold text-green-700">Excel</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

interface ShareModalProps {
    appData: AppData;
    currentDate: Date;
    onClose: () => void;
    isSharingApp?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({ appData, currentDate, onClose, isSharingApp }) => {
    const [range, setRange] = useState<'day' | 'month' | 'specific'>('day');
    const [specificDate, setSpecificDate] = useState<Date | null>(null);

    // If sharing app from About menu, default to sharing stats from day 1 to today
    useEffect(() => {
        if (isSharingApp) {
            setRange('month'); // Using month logic to simulate day 1 to today
        }
    }, [isSharingApp]);

    const handleShare = (platform: 'whatsapp' | 'telegram' | 'email') => {
        let text = '';
        let subject = '';

        if (isSharingApp) {
            // Sharing App + Month Stats
            const { data, label } = getDataInRange(appData, currentDate, 'month');
            let report = `*Relatório do App (01/${currentDate.getMonth()+1} até Hoje)*\n`;
            report += `Confira meu uso do EquipTrack Pro!\n\n`;
            
             CATEGORIES.forEach(cat => {
                const items = data[cat] || [];
                if(items.length > 0) report += `*${cat}*: ${items.length} itens\n`;
            });
            report += `\nBaixe o App aqui: ${window.location.href}`;
            
            text = report;
            subject = 'Meu uso do EquipTrack Pro';
        } else {
            const dateToUse = range === 'specific' && specificDate ? specificDate : currentDate;
            const { data, label } = getDataInRange(appData, dateToUse, range, specificDate || undefined);
            let report = `*Relatório - ${label}*\n\n`;
            CATEGORIES.forEach(cat => {
                const items = data[cat] || [];
                if(items.length > 0) {
                    report += `*${cat}* (${items.length})\n`;
                    items.forEach((item: any) => {
                        report += `- SN: ${item.serial || 'N/A'} | CT: ${item.contract || 'N/A'}\n`;
                    });
                    report += '\n';
                }
            });
            text = report;
            subject = `Relatório Equipamentos - ${label}`;
        }
        
        const encoded = encodeURIComponent(text);
        let url = '';
        if (platform === 'whatsapp') url = `https://wa.me/?text=${encoded}`;
        else if (platform === 'telegram') url = `https://t.me/share/url?url=${window.location.href}&text=${encoded}`;
        else if (platform === 'email') url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encoded}`;
        
        window.open(url, '_blank');
    };

    return (
        <Modal title={isSharingApp ? "Compartilhar App" : "Exportar Relatório"} onClose={onClose}>
            {!isSharingApp && (
                 <div className="mb-6">
                    <div className="flex bg-slate-100 p-1 rounded-lg mb-2">
                        <button onClick={() => setRange('day')} className={`flex-1 py-1 rounded-md text-xs font-bold ${range === 'day' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Hoje</button>
                        <button onClick={() => setRange('month')} className={`flex-1 py-1 rounded-md text-xs font-bold ${range === 'month' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Mês</button>
                        <button onClick={() => setRange('specific')} className={`flex-1 py-1 rounded-md text-xs font-bold ${range === 'specific' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Dia Espec.</button>
                    </div>
                    
                    {range === 'specific' && (
                        <div className="mb-2 animate-fade-in">
                            <p className="text-xs text-slate-500 mb-1 text-center">Selecione a data:</p>
                            <input 
                                type="date" 
                                className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                                onChange={(e) => {
                                    const [y, m, d] = e.target.value.split('-');
                                    setSpecificDate(new Date(parseInt(y), parseInt(m)-1, parseInt(d)));
                                }}
                            />
                        </div>
                    )}
                 </div>
            )}
            
            <p className="text-xs text-slate-500 mb-4 text-center">
                {isSharingApp ? "Enviar resumo e link via:" : "Enviar resumo via:"}
            </p>

            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleShare('whatsapp')} className="flex flex-col items-center p-3 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 active:scale-95 transition-transform"><IconWhatsapp className="w-8 h-8 text-green-500 mb-1"/><span className="text-xs font-bold text-green-700">WhatsApp</span></button>
                <button onClick={() => handleShare('telegram')} className="flex flex-col items-center p-3 bg-sky-50 rounded-xl border border-sky-100 hover:bg-sky-100 active:scale-95 transition-transform"><IconTelegram className="w-8 h-8 text-sky-500 mb-1"/><span className="text-xs font-bold text-sky-700">Telegram</span></button>
                <button onClick={() => handleShare('email')} className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 active:scale-95 transition-transform"><IconEmail className="w-8 h-8 text-slate-500 mb-1"/><span className="text-xs font-bold text-slate-700">E-mail</span></button>
            </div>
        </Modal>
    );
};

interface AboutModalProps {
    onClose: () => void;
    onShareClick: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose, onShareClick }) => {
    const handleNativeShare = async () => {
         if (navigator.share) {
            try {
                await navigator.share({
                    title: 'EquipTrack Pro',
                    text: 'Baixe o Controle de Equipamentos aqui:',
                    url: window.location.href
                });
            } catch (err) {
                console.error("Error sharing", err);
            }
        } else {
            // Fallback: Open same modal but focused on link sharing?
            // For now, reuse onShareClick but maybe user wants direct link.
            onShareClick();
        }
    };

    return (
        <Modal title="Sobre" onClose={onClose}>
            <div className="text-center space-y-4">
                <IconApp className="w-24 h-24 mx-auto drop-shadow-xl" />
                <div>
                    <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400">Controle de Equipamentos</h2>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">V1.1.0</span>
                </div>
                <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="font-medium">Desenvolvido por Leo Luz</p>
                </div>
                
                {/* Share Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-xs text-slate-400 mb-2">Compartilhe o App</p>
                    
                    <button onClick={onShareClick} className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:scale-95 flex items-center justify-center gap-2">
                        <IconShare className="w-5 h-5" /> Compartilhar Progresso
                    </button>

                    <button onClick={handleNativeShare} className="w-full py-3 bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:bg-purple-600 active:scale-95 flex items-center justify-center gap-2">
                        <IconApp className="w-5 h-5" /> Compartilhar Apenas App
                    </button>
                </div>
            </div>
        </Modal>
    );
};

interface SettingsModalProps {
    onClose: () => void;
    onClearData: () => void;
    userSettings: UserSettings;
    onSaveSettings: (settings: UserSettings) => void;
    // For simulation purpose
    isLocked: boolean;
    toggleLock: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onClearData, userSettings, onSaveSettings, isLocked, toggleLock }) => {
    const [name, setName] = useState(userSettings.name);
    const [cpf, setCpf] = useState(userSettings.cpf);
    const [autoSave, setAutoSave] = useState(userSettings.autoSave ?? true);
    const [darkMode, setDarkMode] = useState(userSettings.darkMode ?? false);
    const [notifications, setNotifications] = useState(userSettings.notifications ?? true);

    const handleSave = () => {
        onSaveSettings({ 
            name, 
            cpf,
            autoSave,
            darkMode,
            notifications
        });
        onClose();
    };

    return (
    <Modal title="Configurações" onClose={onClose}>
        <div className="space-y-6">
            <div className="space-y-3">
                <h4 className="font-bold text-slate-700 text-sm">Usuario</h4>
                <div>
                    <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nome" 
                        className="w-full p-3 bg-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400"
                    />
                </div>
                <div>
                    <input 
                        value={cpf}
                        onChange={e => setCpf(e.target.value)}
                        placeholder="CPF (Opcional)" 
                        className="w-full p-3 bg-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400"
                    />
                </div>
                <button onClick={handleSave} className="w-full py-2 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                    Salvar Dados Usuário
                </button>
            </div>

            <div className="space-y-2 py-2 border-t border-slate-100">
                <ToggleSwitch label="Salvamento Automático" checked={autoSave} onChange={setAutoSave} />
                <ToggleSwitch label="Modo Escuro" checked={darkMode} onChange={setDarkMode} />
                <ToggleSwitch label="Notificações" checked={notifications} onChange={setNotifications} />
            </div>

             {/* Hidden Feature for Simulation */}
             <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Modo Bloqueio (Simulação)</span>
                    <button onClick={toggleLock} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${isLocked ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {isLocked ? 'ATIVADO' : 'DESATIVADO'}
                    </button>
                </div>
             </div>

            <div className="mt-4 p-4 border-2 border-dashed border-red-200 rounded-xl bg-red-50/50">
                <div className="flex items-center gap-2 mb-3 justify-center text-red-500">
                    <IconAlert className="w-5 h-5" />
                    <span className="font-black text-xs tracking-widest">ZONA DE PERIGO</span>
                    <IconAlert className="w-5 h-5" />
                </div>
                <button onClick={onClearData} className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-500/20">
                    Apagar Todos os Dados
                </button>
            </div>
        </div>
    </Modal>
)};

const ToggleSwitch = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between p-2">
        <span className="text-sm font-bold text-slate-600">{label}</span>
        <button 
            onClick={() => onChange(!checked)}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}
        >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

interface NotificationsModalProps {
    onClose: () => void;
    notifications: NotificationItem[];
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose, notifications }) => (
    <Modal title="Notificações" onClose={onClose}>
        {notifications.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
                <IconBell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma notificação.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {notifications.map(notif => (
                    <div key={notif.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'request' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>
                            {notif.type === 'request' ? <IconLock className="w-5 h-5"/> : <IconBell className="w-5 h-5"/>}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-700 text-sm">{notif.title}</h4>
                            <p className="text-xs text-slate-500">{notif.message}</p>
                            <span className="text-[10px] text-slate-300 mt-1 block">{notif.timestamp.toLocaleTimeString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </Modal>
);

interface PhotoGalleryModalProps {
    item: EquipmentItem;
    onClose: () => void;
    onUpdatePhotos: (photos: string[]) => void;
    setConfirmation: (conf: { message: string; onConfirm: () => void } | null) => void;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ item, onClose, onUpdatePhotos, setConfirmation }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDelete = (index: number) => {
        setConfirmation({
            message: "Excluir esta foto?",
            onConfirm: () => {
                const newPhotos = [...item.photos];
                newPhotos.splice(index, 1);
                onUpdatePhotos(newPhotos);
            }
        });
    };

    const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(ev.target?.result) onUpdatePhotos([...item.photos, ev.target.result as string]);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    return (
        <Modal title="Galeria de Fotos" onClose={onClose}>
            <div className="grid grid-cols-2 gap-2 mb-4">
                {item.photos.map((photo, idx) => (
                    <div key={idx} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                        <img src={photo} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                        <button 
                            onClick={() => handleDelete(idx)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                            <IconTrash className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                    <IconCamera className="w-8 h-8 mb-1" />
                    <span className="text-xs font-bold">Adicionar</span>
                </button>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={handleAddPhoto}
            />
            <div className="text-center text-xs text-slate-400">
                Total: {item.photos.length} fotos
            </div>
        </Modal>
    );
};

interface CameraModalProps {
    onClose: () => void;
    onCapture: (photo: string, code: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onClose, onCapture }) => {
    const [mode, setMode] = useState<'camera'|'scanner'>('camera');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        if (mode === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [mode]);

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch (e) {
            console.error("Camera error", e);
            alert("Erro ao acessar câmera.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
    };

    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            onCapture(dataUrl, '');
        }
    };

    // Scanner implementation using Html5QrcodeScanner
    useEffect(() => {
        if (mode === 'scanner') {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
                false
            );
            scanner.render((decodedText) => {
                onCapture('', decodedText);
                scanner.clear();
            }, (error) => {
                // console.warn(error);
            });
            return () => {
                try { scanner.clear(); } catch(e) {}
            };
        }
    }, [mode]);

    return (
        <Modal title="Câmera" onClose={onClose}>
             <div className="flex justify-center gap-6 mb-4">
                 <button 
                    onClick={() => setMode('camera')} 
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${mode === 'camera' ? 'bg-blue-100 text-blue-600 shadow-inner' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                        <IconCamera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">Foto</span>
                </button>

                 <button 
                    onClick={() => setMode('scanner')} 
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${mode === 'scanner' ? 'bg-blue-100 text-blue-600 shadow-inner' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                        <IconQrCode className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">QR / Barras</span>
                </button>
            </div>
            
            <div className="bg-black rounded-xl overflow-hidden aspect-[3/4] relative flex items-center justify-center border-4 border-slate-100 shadow-2xl">
                {mode === 'camera' ? (
                    <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <button 
                            onClick={takePhoto}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-200 shadow-lg active:scale-95 transition-transform flex items-center justify-center"
                        >
                            <div className="w-12 h-12 rounded-full border border-slate-300"></div>
                        </button>
                    </>
                ) : (
                    <div id="reader" className="w-full h-full bg-white"></div>
                )}
            </div>
        </Modal>
    );
};

interface ConfirmationModalProps {
    message: string;
    subMessage?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ message, subMessage, onConfirm, onCancel, isDanger }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className={`bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in text-center ${isDanger ? 'border-2 border-red-500' : ''}`}>
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDanger ? 'bg-red-100' : 'bg-slate-100'}`}>
                {isDanger ? <IconAlert className="w-8 h-8 text-red-500" /> : <IconTrash className="w-8 h-8 text-slate-500" />}
             </div>
            <h3 className={`text-lg font-black mb-2 ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>{message}</h3>
            {subMessage && (
                <p className="text-slate-600 mb-6 text-sm font-medium leading-relaxed whitespace-pre-line">{subMessage}</p>
            )}
            {!subMessage && (
                <p className="text-slate-500 mb-6 text-sm">Tem certeza?</p>
            )}
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={onConfirm} className={`flex-1 py-3 font-bold rounded-xl shadow-lg transition-colors ${isDanger ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/30' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/30'}`}>Confirmar</button>
            </div>
        </div>
    </div>
);

interface SearchModalProps {
    onClose: () => void;
    appData: AppData;
    onSelect: (result: { date: string, item: EquipmentItem }) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ onClose, appData, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{date: string, item: EquipmentItem, category: string}[]>([]);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        const lowerQ = query.toLowerCase();
        const res: {date: string, item: EquipmentItem, category: string}[] = [];
        
        Object.entries(appData).forEach(([date, dayData]) => {
            CATEGORIES.forEach(cat => {
                dayData[cat]?.forEach(item => {
                    if (
                        (item.contract && item.contract.toLowerCase().includes(lowerQ)) ||
                        (item.serial && item.serial.toLowerCase().includes(lowerQ))
                    ) {
                        res.push({ date, item, category: cat });
                    }
                });
            });
        });
        setResults(res.slice(0, 50)); // Limit results
    }, [query, appData]);

    return (
        <Modal title="Buscar Equipamento" onClose={onClose}>
            <div className="mb-4 relative">
                <IconSearch className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                    autoFocus
                    placeholder="Buscar por Contrato ou Serial..." 
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-300"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {results.length === 0 && query.length > 1 && (
                    <p className="text-center text-slate-400 py-4">Nenhum resultado encontrado.</p>
                )}
                {results.map((res, i) => (
                    <button 
                        key={i} 
                        onClick={() => onSelect({ date: res.date, item: res.item })}
                        className="w-full text-left p-3 bg-white border border-slate-100 rounded-xl hover:bg-blue-50 transition-colors group"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase text-blue-500 bg-blue-100 px-2 py-0.5 rounded">{res.category}</span>
                            <span className="text-xs text-slate-400 font-medium">{res.date.split('-').reverse().join('/')}</span>
                        </div>
                        <div className="flex gap-4">
                            <div>
                                <span className="text-xs text-slate-400 block">Contrato</span>
                                <span className="font-bold text-slate-700">{res.item.contract || '-'}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block">Serial</span>
                                <span className="font-bold text-slate-700">{res.item.serial || '-'}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </Modal>
    );
};
