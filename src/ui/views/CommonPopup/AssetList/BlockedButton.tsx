import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useTranslation } from 'react-i18next';
import { useFilteredTokens } from './useFilteredTokens';

interface Props {
  onClickLink: () => void;
  isTestnet: boolean;
  selectChainId?: string | null;
}

export const BlockedButton: React.FC<Props> = ({
  onClickLink,
  isTestnet,
  selectChainId,
}) => {
  const { sortedBlocked: list } = useFilteredTokens(
    selectChainId || null,
    isTestnet
  );
  const { t } = useTranslation();

  return (
    <TokenButton
      label={t('page.dashboard.tokenDetail.blockedButton')}
      modalTitle={
        list?.length > 1
          ? t('page.dashboard.tokenDetail.blockedListTitles')
          : t('page.dashboard.tokenDetail.blockedListTitle')
      }
      tokens={list}
      linkText={t('page.dashboard.assets.blockLinkText')}
      description={t('page.dashboard.assets.blockDescription')}
      onClickLink={onClickLink}
    />
  );
};
