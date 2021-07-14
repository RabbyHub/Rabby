import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { AddressList, StrayPageWithButton } from 'ui/component';
import { getUiType } from 'ui/utils';
import { IconImportSuccess } from 'ui/assets';
import { Account } from 'background/service/preference';
import SuccessLogo from 'ui/assets/success-logo.svg';
import clsx from 'clsx';

const { AddressItem } = AddressList;

const ImportSuccess = ({ isPopup = false }: { isPopup?: boolean }) => {
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
      NextButtonContent={t('OK')}
      onNextClick={handleNextClick}
      footerFixed={false}
      noPadding={isPopup}
      isScrollContainer={isPopup}
    >
      {isPopup && (
        <header className="create-new-header create-password-header h-[264px]">
          <img
            className="rabby-logo"
            src="/images/logo-gray.png"
            alt="rabby logo"
          />
          <img
            className="unlock-logo w-[128px] h-[128px] mx-auto"
            src={SuccessLogo}
          />
          <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
            {t('Imported successfully')}
          </p>
          <img src="/images/success-mask.png" className="mask" />
        </header>
      )}
      <div
        className={clsx(
          'flex flex-col justify-center text-center h-[472px] lg:h-auto',
          {
            'flex-1': isPopup,
            'overflow-auto': isPopup,
            'px-20': isPopup,
          }
        )}
      >
        {!isPopup && (
          <>
            <img
              src={IconImportSuccess}
              className="mx-auto mb-18 w-[100px] h-[100px]"
            />
            <div className="text-green text-20 mb-2">{title}</div>
            <div className="text-title text-15 mb-12">
              <Trans
                i18nKey="AddressCount"
                values={{ count: accounts?.length }}
              />
            </div>
          </>
        )}
        <div className="lg:w-[460px] lg:h-[200px] overflow-y-auto">
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
