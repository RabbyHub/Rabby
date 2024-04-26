import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';
import { useTranslation } from 'react-i18next';

type Props = {
  onClickButton: () => void;
  isTestnet: boolean;
};

export const CustomizedButton: React.FC<Props> = ({
  onClickButton,
  isTestnet,
}) => {
  const { customize } = useRabbySelector((store) =>
    isTestnet ? store.account.testnetTokens : store.account.tokens
  );
  const list = useSortToken(customize);
  const { t } = useTranslation();

  return (
    <TokenButton
      label={t('page.dashboard.tokenDetail.customizedButton')}
      buttonText={t('page.dashboard.assets.customButtonText')}
      description={t('page.dashboard.assets.customDescription')}
      tokens={list}
      onClickButton={onClickButton}
    />
  );
};
