
import React, { useState } from 'react';
import { IconCamera, IconGallery } from './icons';
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
    currentDateFormatted: string;
    onItemClick: () => void; // For lock simulation
}

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({ 
    category, items, onUpdateItem, onViewGallery, isDeleteMode, selectedItems, onToggleSelect, isActive, onActivate, onOpenCamera, currentDateFormatted, onItemClick
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const historyItems = items.slice(0, -1); 
    const inputItem = items[items.length - 1];

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
        onActivate();
    };

    return (
        <div onClick={onActivate} className="mb-4">
            {/* Category Header Bar - Horizontal Gradient (Half Solid Blue -> Fade) */}
            <button 
                onClick={toggleExpand}
                className={`
                    w-full py-4 px-6 rounded-2xl mb-3 flex items-center justify-between relative overflow-hidden
                    bg-gradient-to-r from-[#3b82f6] from-45% via-[#60a5fa] via-70% to-transparent
                    shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_6px_rgba(59,130,246,0.15)] 
                    border border-blue-400/30 backdrop-blur-sm
                    transition-all duration-200 active:scale-[0.99]
                `}
            >
                {/* Glass Shine Effect */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40"></div>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-blue-600/20"></div>

                <h2 className="text-xl font-bold text-white tracking-wide uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] z-10 pl-1">
                    {category}
                </h2>
                {historyItems.length > 0 && (
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/20 shadow-inner z-10 backdrop-blur-md">
                        {historyItems.length}
                    </span>
                )}
            </button>

            {/* Content Area */}
            <div className={`transition-all duration-300 ease-in-out`}>
                
                {/* History Items */}
                {isExpanded && historyItems.length > 0 && (
                    <div className="mb-4 space-y-2 animate-fade-in">
                        {historyItems.map((item) => (
                            <EquipmentRow 
                                key={item.id}
                                item={item} 
                                onUpdate={onUpdateItem} 
                                isDeleteMode={isDeleteMode}
                                isSelected={selectedItems.includes(item.id)} 
                                onToggleSelect={() => onToggleSelect(item.id)} 
                                onViewGallery={() => onViewGallery(item)} 
                                onOpenCamera={() => onOpenCamera(item)}
                                onFocus={onActivate}
                                onClick={onItemClick}
                            />
                        ))}
                    </div>
                )}

                {/* Input Item */}
                <EquipmentRow 
                    item={inputItem} 
                    onUpdate={onUpdateItem} 
                    isDeleteMode={isDeleteMode}
                    isSelected={selectedItems.includes(inputItem.id)} 
                    onToggleSelect={() => onToggleSelect(inputItem.id)} 
                    onViewGallery={() => onViewGallery(inputItem)} 
                    onOpenCamera={() => onOpenCamera(inputItem)}
                    onFocus={onActivate}
                    onClick={onItemClick}
                />
            </div>
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
    onClick: () => void;
}

const EquipmentRow: React.FC<EquipmentRowProps> = ({ 
    item, onUpdate, isDeleteMode, isSelected, onToggleSelect, onViewGallery, onOpenCamera, onFocus, onClick
}) => {
    const handleChange = (field: keyof EquipmentItem, value: string) => {
        onClick(); // Trigger lock check first
        onUpdate({ ...item, [field]: value });
    };

    return (
        <div className="relative mb-2 px-1">
             {/* Delete Checkbox - Positioned absolute to the left but contained */}
            {isDeleteMode && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-20">
                    <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={onToggleSelect} 
                        className="w-6 h-6 accent-red-500 shadow-sm" 
                    />
                </div>
            )}

            {/* Main Row Container - Flexbox for single line layout */}
            <div className="flex items-center gap-2 w-full">
                
                {/* Contrato Input (Small ~10 digits) */}
                <div className="w-[110px] flex-shrink-0">
                    <input 
                        type="text"
                        value={item.contract}
                        onChange={(e) => handleChange('contract', e.target.value)}
                        onFocus={() => { onFocus(); onClick(); }}
                        placeholder="Contrato"
                        maxLength={11}
                        className="w-full bg-slate-200/50 border border-slate-300/50 text-slate-600 placeholder:text-slate-400 font-bold text-sm px-2 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 text-center shadow-inner"
                    />
                </div>

                {/* Serial Input (Wider ~20 digits) */}
                <div className="flex-grow min-w-[140px]">
                    <input 
                        type="text"
                        value={item.serial}
                        onChange={(e) => handleChange('serial', e.target.value)}
                        onFocus={() => { onFocus(); onClick(); }}
                        placeholder="Serial"
                        maxLength={25}
                        className="w-full bg-slate-200/50 border border-slate-300/50 text-slate-600 placeholder:text-slate-400 font-bold text-sm px-2 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 shadow-inner"
                    />
                </div>

                {/* Buttons (Fixed Size) */}
                <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { onClick(); onOpenCamera(); }} className="w-11 h-11 bg-gradient-to-b from-blue-50 to-blue-100 rounded-xl flex items-center justify-center text-blue-600 active:scale-95 transition-transform shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-blue-200">
                        <IconCamera className="w-5 h-5" />
                    </button>

                    <button onClick={() => { onClick(); onViewGallery(); }} className={`w-11 h-11 rounded-xl flex items-center justify-center active:scale-95 transition-transform shadow-[0_2px_4px_rgba(0,0,0,0.05)] relative border bg-gradient-to-b ${item.photos.length > 0 ? 'from-green-50 to-green-100 border-green-200 text-green-700' : 'from-blue-50 to-blue-100 border-blue-200 text-blue-600'}`}>
                        <IconGallery className="w-5 h-5" />
                        {item.photos.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                                {item.photos.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
