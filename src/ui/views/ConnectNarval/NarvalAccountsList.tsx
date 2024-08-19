import {
  MultiSelectAddressList,
  Navbar,
  StrayPageWithButton,
} from '@/ui/component';
import { useWallet, useWalletRequest } from '@/ui/utils';
import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { KEYRING_CLASS } from '@/constant';
import { useRepeatImportConfirm } from '../../utils/useRepeatImportConfirm';
import { safeJSONParse } from '@/utils';
import { NarvalAccount } from '@/background/service/keyring/eth-narval-keyring';
import { Input } from 'antd';
import IconSearch from 'ui/assets/search.svg';
import './style.less';

export type AccountItem = { address: string; index: number };

const NarvalAccountsList = () => {
  const history = useHistory();
  const wallet = useWallet();
  const isWide = useMedia('(min-width: 401px)');
  const { t } = useTranslation();
  const { show, contextHolder } = useRepeatImportConfirm();
  const { state } = useLocation<{
    connectionId: string;
    accounts: NarvalAccount[];
    selectedAccounts: NarvalAccount[];
  }>();
  const [accounts, setAccounts] = React.useState<AccountItem[]>([]);
  const [filteredAccounts, setFilteredAccounts] = React.useState<AccountItem[]>(
    []
  );
  const [selectedAccounts, setSelectedAccounts] = React.useState<AccountItem[]>(
    []
  );
  const [searchKeyword, setSearchKeyword] = React.useState('');
  const [run, loading] = useWalletRequest(wallet.selectNarvalAccounts, {
    async onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts: accounts.map(({ address }, index) => {
            return {
              address,
              index: index + 1,
              type: KEYRING_CLASS.Narval,
              alianName: `Narval Account #${index + 1}`,
            };
          }),
          title: t('page.newAddress.importedSuccessfully'),
          editing: true,
          importedAccount: true,
          importedLength: accounts.length,
        },
      });
    },
    onError(err) {
      if (err?.message?.includes('DuplicateAccountError')) {
        const address = safeJSONParse(err.message)?.address;

        show({
          address,
          type: KEYRING_CLASS.Narval,
        });
      }
    },
  });

  useEffect(() => {
    const allAccounts = state.accounts.map((a, index) => ({
      address: a.address,
      index: index + 1,
    }));

    setAccounts(allAccounts);
    setFilteredAccounts(allAccounts);

    const selectedAddresses = state.selectedAccounts.map((a) => a.address);

    setSelectedAccounts(
      allAccounts.filter((a) => selectedAddresses.includes(a.address))
    );
  }, [state]);

  useEffect(() => {
    if (!searchKeyword) {
      setFilteredAccounts(accounts);
      return;
    }

    const keyword = searchKeyword.toLowerCase();

    setFilteredAccounts(
      accounts.filter((a) => a.address.toLowerCase().includes(keyword))
    );
  }, [accounts, searchKeyword]);

  const onBack = () => {
    history.replace('/dashboard');
  };

  const onNext = () => {
    const selectedAddresses = selectedAccounts.map((a) => a.address);

    const filteredAccounts = state.accounts.filter((a) =>
      selectedAddresses.includes(a.address)
    );

    run(state.connectionId, filteredAccounts);
  };

  return (
    <>
      {contextHolder}
      <StrayPageWithButton
        custom={isWide}
        hasBack={false}
        spinning={loading}
        hasDivider
        noPadding
        className={clsx(isWide && 'rabby-stray-page')}
        NextButtonContent="Select"
        onBackClick={onBack}
        onNextClick={onNext}
        backDisabled={false}
        nextDisabled={!selectedAccounts.length}
      >
        <Navbar onBack={onBack}>Select Accounts</Navbar>
        <div className="rabby-container widget-has-ant-input">
          <div className="px-20 pt-24">
            <div className="flex flex-col gap-16">
              <Input
                placeholder="Search by address"
                autoComplete="off"
                size="large"
                spellCheck={false}
                prefix={<img src={IconSearch} />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                autoFocus
              />
              <div className="flex flex-col gap-4">
                <p>{filteredAccounts.length} accounts found:</p>
                <MultiSelectAddressList
                  accounts={filteredAccounts}
                  type={KEYRING_CLASS.Narval}
                  value={selectedAccounts}
                  onChange={setSelectedAccounts}
                />
              </div>
            </div>
          </div>
        </div>
      </StrayPageWithButton>
    </>
  );
};

export default NarvalAccountsList;
