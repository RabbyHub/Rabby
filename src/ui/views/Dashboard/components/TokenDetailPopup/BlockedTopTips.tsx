import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Switch } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './BlockedTopTips.module.css';

interface Props {
  isAdded?: boolean;
  onOpen(): void;
  onClose(): void;
  token: TokenItem;
}
export const BlockedTopTips = ({ onOpen, onClose, isAdded, token }: Props) => {
  const { t } = useTranslation();

  const isCustomizedHasAdded = useMemo(() => {
    return !token.is_core && isAdded;
  }, [token, isAdded]);

  return isAdded ? (
    <div className="flex flex-row bg-r-neutral-card-1 rounded-[8px] px-16 py-12 items-center justify-between gap-20">
      <div
        className="text-r-neutral-body text-13"
        style={{
          lineHeight: 'normal',
          fontWeight: 500,
        }}
      >
        {!token.is_core
          ? t('page.dashboard.tokenDetail.customizedHasAddedTips')
          : t('page.dashboard.tokenDetail.blockedTips')}
      </div>
      <Switch
        className={styles.switch}
        size="small"
        checked={isAdded}
        onChange={(val) => {
          if (val) {
            onOpen();
          } else {
            onClose();
          }
        }}
      />
    </div>
  ) : null;
};
