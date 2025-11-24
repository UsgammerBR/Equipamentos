export type EquipmentCategory = 
  | 'BOX' 
  | 'BOX SOUND' 
  | 'CONTROLE REMOTO' 
  | 'CAMERA' 
  | 'CHIP';

export interface EquipmentItem {
  id: string;
  qt: string;
  contract: string;
  serial: string;
  photos: string[];
}

export type DailyData = {
  [key in EquipmentCategory]: EquipmentItem[];
};

export type AppData = {
  [date: string]: DailyData;
};