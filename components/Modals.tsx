import React, { useState, useEffect, useRef, PropsWithChildren } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { 
    IconX, IconChevronLeft, IconChevronRight, IconFileWord, 
    IconFileExcel, IconWhatsapp, IconTelegram, IconEmail, IconShare, IconTrash, IconCamera, IconQrCode, IconGallery, IconApp
} from './icons';
import { AppData, DailyData, EquipmentCategory, EquipmentItem } from '../types';
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
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/50 animate-slide-in-up">
            <div className="flex justify-between items-center p-4 border-b border-slate-200/50">
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400">{title}</h3>
                <button onClick={onClose}><IconX className="w-6 h-6 text-slate-400 hover:text-red-500" /></button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
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

    const handleShare = (platform: 'whatsapp' | 'telegram' | 'email') => {
        let text = '';
        let subject = '';

        if (isSharingApp) {
            text = `Baixe o App EquipTrack Pro aqui: ${window.location.href}`;
            subject = 'Convite para EquipTrack Pro';
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
                {isSharingApp ? "Enviar link do App via:" : "Enviar resumo via:"}
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

export const AboutModal: React.FC<AboutModalProps> = ({ onClose, onShareClick }) => (
    <Modal title="Sobre" onClose={onClose}>
        <div className="text-center space-y-4">
            <IconApp className="w-24 h-24 mx-auto drop-shadow-xl" />
            <div>
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400">Controle de Equipamentos</h2>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">V1.0.0</span>
            </div>
            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="font-medium">Desenvolvido by Leo Luz</p>
            </div>
            <button onClick={onShareClick} className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:scale-95 flex items-center justify-center gap-2">
                <IconShare className="w-5 h-5" /> Compartilhar App
            </button>
        </div>
    </Modal>
);

interface SettingsModalProps {
    onClose: () => void;
    onClearData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onClearData }) => (
    <Modal title="Configurações" onClose={onClose}>
        <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <h4 className="font-bold text-red-600 mb-1">Zona de Perigo</h4>
                <p className="text-xs text-red-400 mb-3">Esta ação não pode ser desfeita.</p>
                <button onClick={onClearData} className="w-full py-2 bg-white border border-red-200 text-red-500 font-bold rounded-lg hover:bg-red-50">
                    Apagar Todos os Dados
                </button>
            </div>
        </div>
    </Modal>
);

interface ConfirmationModalProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl max-w-xs w-full text-center border border-white/50 animate-slide-in-up">
            <IconTrash className="w-12 h-12 text-red-500 mx-auto mb-3 bg-red-50 p-2 rounded-full" />
            <h3 className="text-lg font-bold text-slate-800 mb-6">{message}</h3>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl">Cancelar</button>
                <button onClick={onConfirm} className="flex-1 py-2 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/30">Confirmar</button>
            </div>
        </div>
    </div>
);

interface PhotoGalleryModalProps {
    item: EquipmentItem;
    onClose: () => void;
    onUpdatePhotos: (photos: string[]) => void;
    setConfirmation: (val: any) => void;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ item, onClose, onUpdatePhotos, setConfirmation }) => {
    const [viewPhoto, setViewPhoto] = useState<string | null>(null);
    
    const handleDelete = (index: number) => {
        setConfirmation({
            message: 'Apagar esta foto?',
            onConfirm: () => {
                const newPhotos = item.photos.filter((_: any, i: number) => i !== index);
                onUpdatePhotos(newPhotos);
                if (viewPhoto === item.photos[index]) setViewPhoto(null);
            }
        });
    };

    const handleSharePhoto = async (base64: string) => {
        try {
            const res = await fetch(base64);
            const blob = await res.blob();
            const file = new File([blob], "equipamento.jpg", { type: "image/jpeg" });
            if (navigator.share) {
                await navigator.share({ files: [file] });
            } else {
                alert("Compartilhamento não suportado neste navegador.");
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-fade-in">
            <div className="flex justify-between items-center p-4 text-white">
                <h3 className="font-bold">Galeria ({item.photos.length})</h3>
                <button onClick={onClose}><IconX className="w-8 h-8" /></button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                {viewPhoto ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                         <img src={viewPhoto} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" alt="Detail" />
                         <div className="flex gap-4 mt-4">
                            <button onClick={() => handleSharePhoto(viewPhoto)} className="p-3 bg-blue-600 rounded-full text-white"><IconShare className="w-6 h-6"/></button>
                            <button onClick={() => handleDelete(item.photos.indexOf(viewPhoto))} className="p-3 bg-red-600 rounded-full text-white"><IconTrash className="w-6 h-6"/></button>
                         </div>
                         <button onClick={() => setViewPhoto(null)} className="mt-4 text-white underline">Voltar</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 w-full max-w-lg overflow-y-auto max-h-full content-start">
                        {item.photos.map((p: string, i: number) => (
                            <button key={i} onClick={() => setViewPhoto(p)} className="aspect-square relative group overflow-hidden rounded-lg border border-white/20">
                                <img src={p} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={`Thumb ${i}`} />
                            </button>
                        ))}
                         {item.photos.length === 0 && <p className="col-span-3 text-center text-slate-500 mt-10">Nenhuma foto.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

interface CameraModalProps {
    onClose: () => void;
    onCapture: (photo: string | null, code: string | null) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onClose, onCapture }) => {
    const [mode, setMode] = useState<'select' | 'photo' | 'qr'>('select');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Setup and Cleanup
    useEffect(() => {
        return () => {
            stopStream();
            if(scannerRef.current) {
                scannerRef.current.clear().catch(e => console.error("Scanner clear error", e));
            }
        };
    }, []);

    const stopStream = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const startPhotoCamera = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Sua câmera não pode ser acessada. Verifique se está usando HTTPS ou localhost e se as permissões foram concedidas.");
            return;
        }

        try {
            // Try ideal HD resolution first
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.log("Play interrupted", e));
                        setIsCameraReady(true);
                    };
                }
            } catch (err) {
                // Fallback to basic resolution
                console.log("HD not supported, falling back");
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" },
                    audio: false 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(e => console.log("Play interrupted", e));
                        setIsCameraReady(true);
                    };
                }
            }
        } catch (e) {
            console.error("Error accessing camera", e);
            alert("Erro crítico ao acessar a câmera. Verifique as permissões.");
        }
    };

    const startQRScanner = () => {
        try {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { 
                    fps: 10, 
                    qrbox: 250, 
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
                },
                false
            );
            scannerRef.current = scanner;
            scanner.render((decodedText) => {
                 const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                 audio.play().catch(() => {});
                 if(window.confirm(`Código detectado: ${decodedText}\nUsar este código?`)) {
                      onCapture(null, decodedText);
                 }
            }, (err) => { console.log(err); });
            setIsCameraReady(true);
        } catch(e) {
            console.error("Scanner error", e);
            alert("Erro ao iniciar scanner.");
        }
    };

    useEffect(() => {
        setIsCameraReady(false);
        if (mode === 'photo') {
            startPhotoCamera();
        } else if (mode === 'qr') {
            setTimeout(startQRScanner, 100);
        }
    }, [mode]);

    const takePhoto = () => {
        if (videoRef.current && isCameraReady) {
            try {
                const canvas = document.createElement('canvas');
                // Ensure dimensions exist
                const width = videoRef.current.videoWidth || 640;
                const height = videoRef.current.videoHeight || 480;
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, width, height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.8);
                    onCapture(base64, null);
                }
            } catch(e) {
                console.error("Capture error", e);
                alert("Erro ao capturar foto.");
            }
        }
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                onCapture(base64, null);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex flex-col">
             <div className="flex justify-between p-4 text-white z-10">
                <h3 className="font-bold">{mode === 'select' ? 'Câmera' : mode === 'photo' ? 'Foto' : 'QR / Barras'}</h3>
                <button onClick={onClose}><IconX className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative">
                {mode === 'select' && (
                    <div className="flex flex-col gap-8 items-center justify-center w-full animate-slide-in-up">
                        <div className="flex gap-8 justify-center items-center">
                            {/* Left Button: Camera (Round) */}
                            <button onClick={() => setMode('photo')} className="flex flex-col items-center gap-3 group">
                                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center group-active:scale-90 transition-all shadow-xl shadow-blue-500/40 border-4 border-blue-400/50">
                                    <IconCamera className="w-10 h-10 text-white" />
                                </div>
                                <span className="text-white font-bold text-sm">Foto</span>
                            </button>
                            
                            {/* Right Button: QR (Round) */}
                            <button onClick={() => setMode('qr')} className="flex flex-col items-center gap-3 group">
                                <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center group-active:scale-90 transition-all shadow-xl shadow-purple-500/40 border-4 border-purple-400/50">
                                    <IconQrCode className="w-10 h-10 text-white" />
                                </div>
                                <span className="text-white font-bold text-sm">QR / Barras</span>
                            </button>
                        </div>

                        {/* Gallery Upload Option */}
                         <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 group mt-8">
                            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-active:scale-95 transition-all shadow-lg">
                                <IconGallery className="w-6 h-6 text-green-300" />
                            </div>
                            <span className="text-white/70 text-xs font-medium">Galeria</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileUpload} 
                            />
                        </button>
                    </div>
                )}

                {/* Photo Mode */}
                {mode === 'photo' && (
                    <div className="w-full h-full flex flex-col items-center">
                        <video ref={videoRef} className="max-h-[70vh] w-auto rounded-xl border border-white/20" playsInline muted autoPlay></video>
                        {!isCameraReady && <div className="text-white mt-4">Abrindo câmera...</div>}
                        {isCameraReady && (
                             <div className="absolute bottom-10">
                                <button onClick={takePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 active:scale-90 flex items-center justify-center shadow-lg">
                                    <div className="w-12 h-12 bg-white rounded-full border-2 border-black" />
                                </button>
                             </div>
                        )}
                    </div>
                )}

                {/* QR Mode */}
                {mode === 'qr' && (
                    <div className="w-full max-w-md h-full flex flex-col">
                         <div id="reader" className="w-full overflow-hidden rounded-xl border border-white/20"></div>
                         {!isCameraReady && <div className="text-white text-center mt-4">Iniciando scanner...</div>}
                    </div>
                )}
                
                {mode !== 'select' && (
                    <button onClick={() => { stopStream(); setMode('select'); }} className="absolute bottom-4 left-4 text-white underline">Voltar</button>
                )}
            </div>
        </div>
    );
};

interface SearchModalProps {
    onClose: () => void;
    appData: AppData;
    onSelect: (item: any) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ onClose, appData, onSelect }) => {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        if (term.length < 2) { setResults([]); return; }
        const res: any[] = [];
        Object.entries(appData).forEach(([date, dailyData]: [string, any]) => {
            CATEGORIES.forEach(cat => {
                (dailyData[cat]||[]).forEach((item: any) => {
                    if ((item.serial?.includes(term) || item.contract?.includes(term)) && isItemActive(item)) {
                        res.push({ date, category: cat, item });
                    }
                })
            })
        });
        setResults(res.sort((a,b) => b.date.localeCompare(a.date)));
    }, [term, appData]);

    return (
        <Modal title="Buscar Item" onClose={onClose}>
            <input 
                autoFocus
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="Digite Serial ou Contrato..."
                className="w-full p-3 bg-slate-100 rounded-xl border border-slate-200 outline-none focus:ring-2 ring-cyan-400 font-bold text-slate-700 mb-4"
            />
            <div className="space-y-2">
                {results.map((res, i) => (
                    <div key={i} onClick={() => onSelect(res)} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-blue-50 cursor-pointer">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                            <span>{res.date}</span>
                            <span className="uppercase text-cyan-600">{res.category}</span>
                        </div>
                        <div className="font-mono text-sm text-slate-700">
                            {res.item.serial && <div>SN: <span className="font-bold">{res.item.serial}</span></div>}
                            {res.item.contract && <div>CT: <span className="font-bold">{res.item.contract}</span></div>}
                        </div>
                    </div>
                ))}
                {term.length > 1 && results.length === 0 && <p className="text-center text-slate-400 mt-4">Nenhum resultado.</p>}
            </div>
        </Modal>
    );
};