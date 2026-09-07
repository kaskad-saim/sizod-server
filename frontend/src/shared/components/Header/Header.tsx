import styles from './Header.module.scss';
import Timer from './Timer.tsx';

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => (
  <div className={styles['header']}>
    <div className={styles['header__title']}>
      <span className={styles['header__brand']}>СИЗОД</span>
      {title}
    </div>
    <div className={styles['header__box']}>
      <Timer />
    </div>
  </div>
);

export default Header;
