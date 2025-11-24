import React, { useState } from 'react';
import { IconStack, IconCamera, IconGallery, IconClipboard } from './icons';
import { EquipmentCategory, EquipmentItem } from '../types';

interface EquipmentSectionProps {
    category: EquipmentCategory;
    items: EquipmentItem[];
    onUpdateItem: (item: EquipmentItem) => void;
    onViewGallery: (item: EquipmentItem) => void;
    isDeleteMode: boolean;
    selectedItems: string[];
    onToggleSelect: (id: string) => void;
    isActive: boolean;
    onActivate: () => void;
    onOpenCamera: (item: EquipmentItem) => void;
}

const isItemActive = (item: EquipmentItem): boolean => {
    return (item.contract && item.contract.trim() !== '') || (item.serial && item.serial.trim() !== '') || item.photos.length > 0;
};

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({ 
    category, items, onUpdateItem, onViewGallery, isDeleteMode, selectedItems, onToggleSelect, isActive, onActivate, onOpenCamera 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const activeItems = items.filter((i) => isItemActive(i));
    const historyItems = items.slice(0, -1); 
    const inputItem = items[items.length - 1];

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
        onActivate();
    };

    return (
        <div onClick={onActivate} className={`group transition-all duration-300 ${isActive ? 'scale-[1.01]' : 'scale-100'}`}>
            <div className="flex items-center justify-between bg-white/60 backdrop-blur-xl border-t border-l border-white/50 border-b border-r border-white/10 rounded-t-xl p-3 shadow-sm transition-colors">
                <div className="flex items-center gap-2">
                    {/* Added strong drop shadow to category title */}
                    <h2 className={`text-lg font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]`}>
                        {category}
                    </h2>
                </div>
            </div>

            <section className={`
                relative bg-white/30 backdrop-blur-lg border-l border-r border-b border-white/20 rounded-b-xl shadow-[0_8px_0_-4px_rgba(0,0,0,0.05),0_16px_0_-8px_rgba(0,0,0,0.02)] transition-all duration-500 overflow-hidden
                ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-[60px] opacity-95'}
            `}>
                <div className="p-2 space-y-2">
                    <div className={`space-y-2 transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden'}`}>
                        {historyItems.map((item, index) => (
                            <div 
                                key={item.id} 
                                style={{ transitionDelay: isExpanded ? `${index * 80}ms` : '0ms' }} 
                                className={`transition-all duration-500 transform ${isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
                            >
                                <EquipmentRow 
                                    item={item} onUpdate={onUpdateItem} isDeleteMode={isDeleteMode}
                                    isSelected={selectedItems.includes(item.id)} onToggleSelect={() => onToggleSelect(item.id)} 
                                    onViewGallery={() => onViewGallery(item)} onOpenCamera={() => onOpenCamera(item)}
                                    onFocus={() => onActivate()}
                                    onToggleExpand={toggleExpand}
                                    isInputRow={false}
                                    isExpanded={isExpanded}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="relative z-10">
                         {inputItem && <EquipmentRow 
                            item={inputItem} onUpdate={onUpdateItem} isDeleteMode={isDeleteMode}
                            isSelected={selectedItems.includes(inputItem.id)} onToggleSelect={() => onToggleSelect(inputItem.id)} 
                            onViewGallery={() => onViewGallery(inputItem)} onOpenCamera={() => onOpenCamera(inputItem)}
                            onFocus={() => onActivate()}
                            onToggleExpand={toggleExpand}
                            isInputRow={true}
                            isExpanded={isExpanded}
                        />}
                    </div>
                </div>
            </section>
        </div>
    );
};

interface EquipmentRowProps {
    item: EquipmentItem;
    onUpdate: (item: EquipmentItem) => void;
    isDeleteMode: boolean;
    isSelected: boolean;
    onToggleSelect: () => void;
    onViewGallery: () => void;
    onOpenCamera: () => void;
    onFocus: () => void;
    onToggleExpand: (e: React.MouseEvent) => void;
    isInputRow: boolean;
    isExpanded: boolean;
}

const EquipmentRow: React.FC<EquipmentRowProps> = ({ 
    item, onUpdate, isDeleteMode, isSelected, onToggleSelect, onViewGallery, onOpenCamera, onFocus, onToggleExpand, isInputRow, isExpanded
}) => {
    const handleChange = (field: keyof EquipmentItem, value: string) => {
        onUpdate({ ...item, [field]: value });
    };

    // 3D Gray Button Style
    const buttonClass = `
        w-8 h-8 rounded-lg flex items-center justify-center 
        bg-white border border-slate-200 
        shadow-[0_3px_0_#cbd5e1] 
        active:shadow-none active:translate-y-[3px] active:border-t-2 active:border-slate-200
        transition-all duration-75
        text-slate-500 hover:text-slate-600
    `;

    return (
        <div className="flex items-center gap-1 p-1 bg-white/40 rounded-lg shadow-sm border border-white/30 backdrop-blur-md">
            {isDeleteMode && (
                <input type="checkbox" checked={isSelected} onChange={onToggleSelect} className="w-5 h-5 accent-red-500 mr-1 ml-1" />
            )}
            
            <InputWithLabel 
                value={item.contract} 
                onChange={(e) => { if(e.target.value.length <= 10) handleChange('contract', e.target.value) }}
                placeholder="Contrato" 
                containerClassName="flex-[1]"
                showClipboard
                onFocus={onFocus}
            />

            <InputWithLabel 
                value={item.serial} 
                onChange={(e) => { if(e.target.value.length <= 20) handleChange('serial', e.target.value) }}
                placeholder="Serial" 
                containerClassName="flex-[1.5]"
                showClipboard
                onFocus={onFocus}
            />

            <div className="flex gap-1 ml-1">
                <button onClick={onOpenCamera} className={buttonClass}>
                    <IconCamera className="w-4 h-4" />
                </button>
                
                <div className="relative">
                    <button onClick={onViewGallery} className={`${buttonClass} ${item.photos.length > 0 ? 'text-green-500 border-green-200 shadow-[0_3px_0_#bbf7d0]' : ''}`}>
                        <IconGallery className="w-4 h-4" />
                    </button>
                    {item.photos.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">{item.photos.length}</span>}
                </div>

                <button 
                    onClick={onToggleExpand}
                    className={`${buttonClass} ${!isInputRow ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <IconStack className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

interface InputWithLabelProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type?: string;
    containerClassName?: string;
    showClipboard?: boolean;
    onFocus: () => void;
}

const InputWithLabel: React.FC<InputWithLabelProps> = ({ value, onChange, placeholder, type = "text", containerClassName, showClipboard, onFocus }) => (
    <div className={`relative h-9 bg-white/60 rounded-lg shadow-inner border border-black/5 flex items-center ${containerClassName}`}>
        <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            placeholder={placeholder}
            className="w-full h-full bg-transparent text-center text-xs font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400 placeholder:text-slate-400 outline-none px-2"
        />
        {showClipboard && value && (
            <button 
                onClick={() => navigator.clipboard.writeText(value)} 
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
            >
                <IconClipboard className="w-3 h-3" />
            </button>
        )}
    </div>
);