import type { JSX } from 'react';
import TuneRounded from '@mui/icons-material/TuneRounded';

export interface SubtabItem {
  label: string;
  value: string;
  icon: JSX.Element;
}

const CURRENT_ICON = <TuneRounded fontSize="inherit" />;

export const subtabsConfig: Record<string, SubtabItem[]> = {
  example: [{ label: 'Параметры', value: 'current', icon: CURRENT_ICON }],
};
