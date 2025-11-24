import React, { useMemo } from 'react';
import { DailyData, AppData, EquipmentItem } from '../types';
import { CATEGORIES } from '../constants';

interface SummaryFooterProps {
    data: DailyData;
    allData: AppData;
    currentDate: string;
}

const isItemActive = (item: EquipmentItem): boolean => {
    return (item.contract && item.contract.trim() !== '') || (item.serial && item.serial.trim() !== '') || item.photos.length > 0;
};

export const SummaryFooter: React.FC<SummaryFooterProps> = ({ data, allData, currentDate }) => {
    const calculateTotal = (d: DailyData) => {
        if (!d) return 0;
        // Since QT is removed, every active line counts as 1
        return Object.values(d).flat().filter(isItemActive).length;
    };

    const totalDay = calculateTotal(data);
    
    const totalMonth = useMemo(() => {
        const curr = new Date(currentDate + 'T00:00:00'); 
        const year = curr.getFullYear();
        const month = curr.getMonth();
        let sum = 0;
        for (let d = 1; d <= 31; d++) {
             const dayStr = d.toString().padStart(2, '0');
             const monthStr = (month + 1).toString().padStart(2, '0');
             const dateKey = `${year}-${monthStr}-${dayStr}`;
             
             if (allData[dateKey]) {
                 sum += calculateTotal(allData[dateKey]);
             }
        }
        return sum;
    }, [allData, currentDate]);

    return (
        <footer className="fixed bottom-0 left-0 w-full bg-white/10 backdrop-blur-xl border-t border-white/20 p-2 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40">
             <div className="container mx-auto overflow-x-auto hide-scrollbar">
                <div className="flex gap-2 pb-1 min-w-max">
                    {CATEGORIES.map(cat => {
                        const count = (data[cat] || []).filter(isItemActive).length;
                        return (
                            <div key={cat} className="flex flex-col items-center justify-center px-3 py-1 bg-white/10 rounded-lg border border-white/20 shadow-sm min-w-[60px]">
                                <span className="text-[8px] font-bold uppercase text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-cyan-400">{cat.substring(0, 8)}</span>
                                <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-700 to-cyan-600 drop-shadow-sm">{count}</span>
                            </div>
                        )
                    })}
                     <div className="flex flex-col items-center justify-center px-4 py-1 bg-blue-500/20 rounded-lg border border-blue-200/30 shadow-sm min-w-[70px]">
                        <span className="text-[8px] font-bold uppercase text-blue-400">TOTAL DIA</span>
                        <span className="text-lg font-black text-blue-600 drop-shadow-sm">{totalDay}</span>
                    </div>
                     <div className="flex flex-col items-center justify-center px-4 py-1 bg-purple-500/20 rounded-lg border border-purple-200/30 shadow-sm min-w-[70px]">
                        <span className="text-[8px] font-bold uppercase text-purple-400">SOMA TOTAL</span>
                        <span className="text-lg font-black text-purple-600 drop-shadow-sm">{totalMonth}</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};