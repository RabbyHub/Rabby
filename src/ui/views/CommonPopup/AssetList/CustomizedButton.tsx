import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';
import { useTranslation } from 'react-i18next';

interface Props {
  onClickLink: () => void;
  isTestnet: boolean;
}

export const CustomizedButton: React.FC<Props> = ({
  onClickLink,
  isTestnet,
}) => {
  const { customize } = useRabbySelector((store) =>
    isTestnet ? store.account.testnetTokens : store.account.tokens
  );
  const list = useSortToken(customize);
  const { t } = useTranslation();

  return (
    <TokenButton
      label="customized"
      linkText={t('page.dashboard.assets.customLinkText')}
      description={t('page.dashboard.assets.customDescription')}
      tokens={list}
      onClickLink={onClickLink}
    />
  );
};
