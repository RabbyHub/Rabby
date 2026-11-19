import { TokenWithChain } from '@/ui/component';
import React from 'react';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from '@/ui/utils/token';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcImgArrowDownCC } from '@/ui/assets/swap/arrow-down-cc.svg';
import styles from './TokenRender.module.css';

export const TokenRender = ({
  openTokenModal,
  token,
  type = 'swap',
}: {
  token?: TokenItem | undefined;
  openTokenModal: () => void;
  type?: 'swap' | 'bridge';
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.tokenRenderWrapper} onClick={openTokenModal}>
      {token ? (
        <div className="token">
          <TokenWithChain
            width="24px"
            height="24px"
            token={token}
            hideConer
            hideChainIcon
          />
          <span className="text" title={getTokenSymbol(token)}>
            {getTokenSymbol(token)}
          </span>
          <RcImgArrowDownCC
            viewBox="0 0 16 16"
            className="arrow text-r-neutral-body w-16 h-16"
          />
        </div>
      ) : (
        <div className="select">
          <span>{t('page.swap.select-token')}</span>
          <RcImgArrowDownCC
            viewBox="0 0 16 16"
            className="arrow text-r-neutral-body w-16 h-16"
          />
        </div>
      )}
    </div>
  );
};
