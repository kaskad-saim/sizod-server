import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import styles from './AnimatedContent.module.scss';

interface AnimatedContentProps {
  contentKey: string;
  children: ReactNode;
  className?: string;
  disableHeightAnimation?: boolean;
}

const AnimatedContent = ({ contentKey, children, className, disableHeightAnimation = false }: AnimatedContentProps) => {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = contentRef.current;

    if (!node) {
      return;
    }

    const updateHeight = () => {
      setHeight(node.getBoundingClientRect().height);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [contentKey, children]);

  const rootClassName = className ? `${styles['animated-content']} ${className}` : styles['animated-content'];

  return (
    <div
      className={rootClassName}
      data-height-animation={disableHeightAnimation ? 'off' : 'on'}
      style={height === null ? undefined : { height }}
    >
      <div key={contentKey} ref={contentRef} className={styles['animated-content__body']}>
        {children}
      </div>
    </div>
  );
};

export default AnimatedContent;
