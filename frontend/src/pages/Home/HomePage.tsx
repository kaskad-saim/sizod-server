import { useLocation, useNavigate } from 'react-router-dom';
import { ScrollableTabs, Select, type ScrollableTabItem } from '@sorbent/ui-kit';
import AppRoutes from '@app/routes/AppRoutes';
import { subtabsConfig } from './subTabConfig';
import styles from './HomePage.module.scss';
import { shouldBypassSsoInEmbed } from '@features/platform/sso-auth';
import { ThemeModeToggle } from '@shared/theme';

const PRIMARY_TABS = [{ value: 'example', label: 'Пример устройства' }];
const DEFAULT_TAB = PRIMARY_TABS[0].value;

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const bypassSsoInEmbed = shouldBypassSsoInEmbed();

  const primaryTab = PRIMARY_TABS.find((tab) => location.pathname.startsWith(`/${tab.value}`))?.value ?? DEFAULT_TAB;
  const group = primaryTab.split('/')[0];
  const currentSubtabs = subtabsConfig[group] ?? [];
  const pathParts = location.pathname.split('/');
  const activeSubtab = pathParts[pathParts.length - 1];

  const primaryTabItems: ScrollableTabItem[] = PRIMARY_TABS.map((tab) => ({
    key: tab.value,
    label: tab.label,
    isActive: primaryTab === tab.value,
    onClick: () => navigate(`/${tab.value}/current`),
  }));

  const chartTabs = currentSubtabs.filter((tab) => tab.value.includes('Chart'));

  const subtabItems: ScrollableTabItem[] = currentSubtabs
    .filter((tab) => !tab.value.includes('Chart'))
    .map((tab) => ({
      key: tab.value,
      label: tab.label,
      icon: tab.icon,
      isActive: activeSubtab === tab.value,
      onClick: () => navigate(`/${primaryTab}/${tab.value}`),
    }));

  if (bypassSsoInEmbed) {
    return <AppRoutes />;
  }

  return (
    <div className={styles['home']}>
      <div className={styles['home__topbar']}>
        <ScrollableTabs items={primaryTabItems} className={styles['home__primary-tabs']} />
        <ThemeModeToggle />
      </div>

      <div className={styles['home__subtabs-row']}>
        <ScrollableTabs items={subtabItems} variant="sub" className={styles['home__subtabs']} />

        {chartTabs.length > 0 && (
          <Select
            options={chartTabs}
            selectedValue={activeSubtab}
            onChange={(value) => navigate(`/${primaryTab}/${value}`)}
            placeholder="Выберите график"
            size="compact"
            className={styles['home__chart-select']}
          />
        )}
      </div>

      <div className={styles['home__content']}>
        <AppRoutes />
      </div>
    </div>
  );
};

export default HomePage;
