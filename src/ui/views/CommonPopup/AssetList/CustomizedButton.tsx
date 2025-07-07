import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useTranslation } from 'react-i18next';
import { useFilteredTokens } from './useFilteredTokens';

type Props = {
  onClickButton: () => void;
  isTestnet: boolean;
  selectChainId?: string | null;
};

export const CustomizedButton: React.FC<Props> = ({
  onClickButton,
  isTestnet,
  selectChainId,
}) => {
  const { sortedCustomize: list } = useFilteredTokens(
    selectChainId || null,
    isTestnet
  );
  const { t } = useTranslation();

  return (
    <TokenButton
      label={t('page.dashboard.tokenDetail.customizedButton')}
      modalTitle={
        list?.length > 1
          ? t('page.dashboard.tokenDetail.customizedListTitles')
          : t('page.dashboard.tokenDetail.customizedListTitle')
      }
      buttonText={t('page.dashboard.assets.customButtonText')}
      description={t('page.dashboard.assets.customDescription')}
      tokens={list}
      onClickButton={onClickButton}
    />
  );
};
