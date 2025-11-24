import React from 'react';
import { IconX, IconSave, IconShare, IconFileWord, IconApp } from './icons';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuClick: (menu: string) => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onMenuClick }) => {
  return (
    <>
      <div className={`fixed top-0 left-0 w-72 h-full bg-white/60 backdrop-blur-3xl z-[51] shadow-2xl transform transition-transform duration-300 ease-out border-r border-white/40 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
                <IconApp className="w-12 h-12 drop-shadow-lg" />
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-600/80 to-cyan-400/80 tracking-tight drop-shadow-sm">MENU</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-blue-50 rounded-full text-blue-400 hover:text-blue-600 transition-colors">
              <IconX className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-3">
            <MenuButton icon={<IconFileWord />} label="Calendário" onClick={() => onMenuClick('calendar')} />
            <MenuButton icon={<IconSave />} label="Salvar Manualmente" onClick={() => onMenuClick('save')} />
            <MenuButton icon={<IconShare />} label="Exportar" onClick={() => onMenuClick('export')} />
            
            <div className="h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent my-6"></div>
            
            <MenuButton icon={<IconApp />} label="Sobre" onClick={() => onMenuClick('about')} />
          </nav>

          <div className="pt-6 border-t border-blue-100/50">
            <button onClick={() => onMenuClick('settings')} className="flex items-center gap-3 w-full p-3 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-xl font-bold transition-colors">
                <span className="text-sm">Configurações</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const MenuButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-4 w-full p-4 text-blue-800/70 hover:bg-blue-50/50 hover:text-blue-600 hover:shadow-sm rounded-xl transition-all active:scale-95 group border border-transparent hover:border-blue-100/50">
    <div className="text-blue-400/80 group-hover:text-blue-600 group-hover:scale-110 transition-transform [&>svg]:w-6 [&>svg]:h-6 drop-shadow-sm">
        {icon}
    </div>
    <span className="font-bold text-sm tracking-wide drop-shadow-sm text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400">{label}</span>
  </button>
);