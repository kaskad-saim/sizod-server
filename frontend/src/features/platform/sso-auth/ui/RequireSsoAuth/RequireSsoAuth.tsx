import React from 'react';
import { SsoUserProvider, useSsoAuth } from '@sorbent/platform-kit/sso-web';
import { Button, Loader } from '@sorbent/ui-kit';
import styles from './RequireSsoAuth.module.scss';

const TITLES = {
  redirecting: 'Перенаправляем на единый вход…',
  blocked: 'Нужна ручная авторизация',
  checking: 'Проверяем доступ…',
} as const;

const RequireSsoAuth: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { status, isAllowed, wasShown, retry } = useSsoAuth();

  if (!isAllowed && (status !== 'checking' || !wasShown)) {
    return (
      <div className={styles['require-sso-auth']} role="status" aria-live="polite" aria-busy="true">
        <div className={styles['require-sso-auth__panel']}>
          <Loader size="large" />
          <p className={styles['require-sso-auth__title']}>
            {TITLES[status as keyof typeof TITLES] ?? TITLES.checking}
          </p>
          <p className={styles['require-sso-auth__sub']}>Единый вход через корпоративный аккаунт</p>

          {status === 'blocked' && <Button onClick={retry}>Повторить авторизацию</Button>}
        </div>
      </div>
    );
  }

  if (status === 'embed') {
    return <SsoUserProvider authMode="embed">{children}</SsoUserProvider>;
  }

  if (status === 'bypass') {
    return <SsoUserProvider authMode="bypass">{children}</SsoUserProvider>;
  }

  return <SsoUserProvider authMode="live">{children}</SsoUserProvider>;
};

export default RequireSsoAuth;
