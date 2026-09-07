import { CurrentTable as UiCurrentTable, type CurrentTableRow } from '@sorbent/ui-kit';
import type { SensorData } from '@shared/types/interface.ts';

interface CurrentTableProps {
  sensorData: SensorData;
  title: string;
  unit?: string;
}

const CurrentTable = ({ sensorData = {}, title, unit }: CurrentTableProps) => {
  const rows: CurrentTableRow[] = Object.entries(sensorData).map(([name, value]) => ({
    id: name,
    name,
    value: String(value),
  }));

  return <UiCurrentTable rows={rows} title={title} unit={unit} />;
};

export default CurrentTable;
