import { usePollingResource } from '@shared/hooks/usePollingResource.ts';
import { getJson } from '@shared/api/http.ts';
import CurrentTable from '@shared/components/CurrentTable/CurrentTable.tsx';
import Header from '@shared/components/Header/Header.tsx';
import ErrorMessage from '@shared/ui/ErrorMessage/ErrorMessage.tsx';
import AnimatedContent from '@shared/ui/AnimatedContent/AnimatedContent.tsx';
import PageLoader from '@shared/ui/PageLoader/PageLoader.tsx';
import { formatSensorData } from '@shared/utils/format.ts';
import type { ExampleData } from '@shared/types/exampleData.ts';
import styles from './CurrentExample.module.scss';

const POLL_INTERVAL_MS = 5000;

const unitsMap: Record<string, string> = {
  Температура: '°C',
  Давление: 'кПа',
  Расход: 'м³/ч',
};

const CurrentExample = () => {
  const { data, isLoading, error } = usePollingResource<ExampleData | null>({
    enabled: true,
    initialData: null,
    intervalMs: POLL_INTERVAL_MS,
    requestKey: 'example',
    load: () => getJson<ExampleData>('/api/example-data'),
    getErrorMessage: () => 'Не удалось загрузить параметры устройства',
  });

  if (isLoading && !data) {
    return (
      <AnimatedContent contentKey="example-current-loading">
        <PageLoader />
      </AnimatedContent>
    );
  }

  if (!data?.parameters) {
    return (
      <AnimatedContent contentKey="example-current-error">
        {error ? <ErrorMessage text={error} /> : <ErrorMessage />}
      </AnimatedContent>
    );
  }

  return (
    <AnimatedContent contentKey="example-current-content">
      <Header title="Пример устройства" />
      <div className={styles['current-example']}>
        <CurrentTable sensorData={formatSensorData(data.parameters, unitsMap)} title="Параметры" />
        <CurrentTable sensorData={formatSensorData(data.info)} title="Состояние" />
      </div>
    </AnimatedContent>
  );
};

export default CurrentExample;
