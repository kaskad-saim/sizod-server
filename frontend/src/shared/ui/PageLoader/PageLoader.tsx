import { useLayoutEffect, useRef } from 'react';
import { Loader, type LoaderSize } from '@sorbent/ui-kit';
import { useEmbedPageLoading } from '@sorbent/ui-kit/theme';
import styles from './PageLoader.module.scss';

interface PageLoaderProps {
  size?: LoaderSize;
}

const BOTTOM_GAP = 20;
const MIN_HEIGHT = 240;

// заглушка загрузки: занимает остаток высоты экрана, спиннер по центру
const PageLoader = ({ size = 'medium' }: PageLoaderProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isHidden } = useEmbedPageLoading();

  useLayoutEffect(() => {
    const node = rootRef.current;

    if (!node) {
      return;
    }

    const updateMinHeight = () => {
      const offsetTop = Math.max(node.getBoundingClientRect().top, 0);
      node.style.minHeight = `${Math.max(MIN_HEIGHT, window.innerHeight - offsetTop - BOTTOM_GAP)}px`;
    };

    updateMinHeight();
    window.addEventListener('resize', updateMinHeight);

    return () => {
      window.removeEventListener('resize', updateMinHeight);
    };
  }, [isHidden]);

  if (isHidden) {
    return null;
  }

  return (
    <div ref={rootRef} className={styles['page-loader']} role="status" aria-live="polite" aria-busy="true">
      <Loader size={size} />
    </div>
  );
};

export default PageLoader;
