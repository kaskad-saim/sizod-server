import type { SensorData } from './interface.ts';

export interface Station16Data {
  process: SensorData;
  modes: SensorData;
  counters: SensorData;
  settings: SensorData;
  alarms: SensorData;
  inputs: SensorData;
  outputs: SensorData;
  lastUpdated: string;
}

export type Station16SectionKey = Exclude<keyof Station16Data, 'lastUpdated'>;
