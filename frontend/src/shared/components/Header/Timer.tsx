import React, { useEffect, useRef } from 'react';
import styles from './Timer.module.scss';

const Timer: React.FC = () => {
  const dateRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (dateRef.current) {
        dateRef.current.textContent = now.toLocaleDateString();
      }
      if (timeRef.current) {
        timeRef.current.textContent = now.toLocaleTimeString();
      }
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <span ref={dateRef} className={styles['timer__date']} />
      <span ref={timeRef} className={styles['timer__time']} />
    </>
  );
};

export default Timer;
