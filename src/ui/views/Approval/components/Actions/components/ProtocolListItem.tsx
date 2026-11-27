import React from 'react';
import LogoWithText from './LogoWithText';
import styles from './ProtocolListItem.module.css';

export interface Props {
  protocol: {
    name: string;
    logo_url: string;
  } | null;
}

export const ProtocolListItem: React.FC<Props> = ({ protocol }) => {
  if (!protocol) {
    return <>-</>;
  }

  return (
    <LogoWithText
      className={styles.logoWithText}
      logo={protocol.logo_url}
      text={protocol.name}
      logoRadius="100%"
    />
  );
};
