import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { AddressList, StrayPageWithButton } from 'ui/component';
import { getUiType } from 'ui/utils';
import { IconImportSuccess } from 'ui/assets';
import { Account } from 'background/service/preference';

const { AddressItem } = AddressList;

const ImportSuccess = () => {
  const history = useHistory();
  const { state } = useLocation<{
    accounts: Account[];
    hasDivider: boolean;
    title: string;
  }>();
  const { t } = useTranslation();

  const {
    accounts,
    hasDivider = true,
    title = t('Successfully imported'),
  } = state;

  const handleNextClick = () => {
    if (getUiType().isTab) {
      window.close();

      return;
    }
    history.push('/dashboard');
  };

  return (
    <StrayPageWithButton
      hasDivider={hasDivider}
      NextButtonContent="ok"
      onNextClick={handleNextClick}
      footerFixed={false}
    >
      <div className="flex flex-col justify-center text-center h-[472px]">
        <img
          src={IconImportSuccess}
          className="mx-auto mb-18 w-[100px] h-[100px]"
        />
        <div className="text-title text-20 mb-2">
          <Trans i18nKey="AddressCount" values={{ count: accounts?.length }} />
        </div>
        <div className="text-green text-15 mb-12">{title}</div>
        <div className="overflow-auto flex-1 lg:w-[460px]">
          {accounts.map((account) => (
            <AddressItem
              className="mb-12 rounded bg-white py-12 pl-16"
              key={account.address}
              account={account.address}
            />
          ))}
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default ImportSuccess;
