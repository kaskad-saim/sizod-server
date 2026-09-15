import { usePollingResource } from '@shared/hooks/usePollingResource.ts';
import { getJson } from '@shared/api/http.ts';
import CurrentTable from '@shared/components/CurrentTable/CurrentTable.tsx';
import Header from '@shared/components/Header/Header.tsx';
import ErrorMessage from '@shared/ui/ErrorMessage/ErrorMessage.tsx';
import AnimatedContent from '@shared/ui/AnimatedContent/AnimatedContent.tsx';
import PageLoader from '@shared/ui/PageLoader/PageLoader.tsx';
import { formatSensorData } from '@shared/utils/format.ts';
import type { Station16Data, Station16SectionKey } from '@shared/types/station16Data.ts';
import styles from './CurrentStation16.module.scss';

const POLL_INTERVAL_MS = 5000;

const SECTIONS: { key: Station16SectionKey; title: string }[] = [
  { key: 'process', title: 'Процесс' },
  { key: 'modes', title: 'Режимы' },
  { key: 'counters', title: 'Счётчики' },
  { key: 'settings', title: 'Уставки' },
  { key: 'alarms', title: 'Аварии' },
  { key: 'inputs', title: 'Входы' },
  { key: 'outputs', title: 'Выходы' },
];

const CurrentStation16 = () => {
  const { data, isLoading, error } = usePollingResource<Station16Data | null>({
    enabled: true,
    initialData: null,
    intervalMs: POLL_INTERVAL_MS,
    requestKey: 'station16',
    load: () => getJson<Station16Data>('/api/station16-data'),
    getErrorMessage: () => 'Не удалось загрузить данные Станции 16',
  });

  if (isLoading && !data) {
    return (
      <AnimatedContent contentKey="station16-current-loading">
        <PageLoader />
      </AnimatedContent>
    );
  }

  if (!data?.process) {
    return (
      <AnimatedContent contentKey="station16-current-error">
        {error ? <ErrorMessage text={error} /> : <ErrorMessage />}
      </AnimatedContent>
    );
  }

  return (
    <AnimatedContent contentKey="station16-current-content">
      <Header title="Станция 16" />
      <div className={styles['current-station16']}>
        {SECTIONS.map(({ key, title }) => (
          <CurrentTable key={key} sensorData={formatSensorData(data[key] ?? {})} title={title} />
        ))}
      </div>
    </AnimatedContent>
  );
};

export default CurrentStation16;
