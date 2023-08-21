import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';
import { useTranslation } from 'react-i18next';

interface Props {
  onClickLink: () => void;
  isTestnet: boolean;
}

export const BlockedButton: React.FC<Props> = ({ onClickLink, isTestnet }) => {
  const { blocked } = useRabbySelector((store) =>
    isTestnet ? store.account.testnetTokens : store.account.tokens
  );
  const list = useSortToken(blocked);
  const { t } = useTranslation();

  return (
    <TokenButton
      label={t('page.dashboard.tokenDetail.blockedButton')}
      tokens={list}
      linkText={t('page.dashboard.assets.blockLinkText')}
      description={t('page.dashboard.assets.blockDescription')}
      onClickLink={onClickLink}
      hiddenSubTitle
    />
  );
};
