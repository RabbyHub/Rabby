import React from 'react';
import styles from './Dots.module.css';

export const Dots: React.FC = () => {
  return (
    <span className={styles.dots}>
      <span className="dot1">.</span>
      <span className="dot2">.</span>
      <span className="dot3">.</span>
    </span>
  );
};
