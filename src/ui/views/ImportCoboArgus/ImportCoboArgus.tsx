import { CHAINS, CHAINS_ENUM, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import React from 'react';
import { ChainList } from './ChainList';
import { AddressInput } from './AddressInput';
import { Button, message } from 'antd';
import clsx from 'clsx';
import { Header } from './Header';
import { useApproval, useWallet } from '@/ui/utils';
import { isAddress } from 'web3-utils';
import { SelectAddressPopup } from './SelectAddressPopup';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { findChainByID } from '@/utils/chain';
import { useRepeatImportConfirm } from '@/ui/utils/useRepeatImportConfirm';
import { safeJSONParse } from '@/utils';

type Type = 'select-chain' | 'add-address' | 'select-address';

export const ImportCoboArgus = () => {
  const { state } = useLocation<{
    address: string;
    chainId: number | string;
  }>();
  const { t } = useTranslation();
  const [selectedChain, setSelectedChain] = React.useState<CHAINS_ENUM>();
  const [inputAddress, setInputAddress] = React.useState<string>('');
  const [step, setStep] = React.useState<Type>('select-chain');
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [safeAddress, setSafeAddress] = React.useState<string>('');
  const wallet = useWallet();
  const history = useHistory();
  const [hasImportError, setHasImportError] = React.useState<boolean>(false);
  const { show, contextHolder } = useRepeatImportConfirm();
  const isByImportAddressEvent = !!state;

  const handleNext = React.useCallback(async () => {
    if (selectedChain && step === 'select-chain') {
      setStep('add-address');
    } else if (step === 'add-address') {
      if (!isAddress(inputAddress)) {
        setError(t('page.newAddress.coboSafe.invalidAddress'));
        return;
      }
      try {
        setIsLoading(true);
        const accountAddress = await wallet.coboSafeGetAccountAddress({
          chainServerId: CHAINS[selectedChain!].serverId,
          coboSafeAddress: inputAddress,
        });
        setSafeAddress(accountAddress);
        setStep('select-address');
      } catch (e) {
        setError(t('page.newAddress.coboSafe.invalidAddress'));
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedChain, step, inputAddress]);

  const handleDone = React.useCallback(async () => {
    try {
      const accounts = await wallet.coboSafeImport({
        address: safeAddress,
        networkId: CHAINS[selectedChain!].serverId,
        safeModuleAddress: inputAddress,
      });
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          title: t('page.newAddress.importedSuccessfully'),
          editing: true,
          importedAccount: true,
          importedLength: (
            await wallet.getTypedAccounts(KEYRING_TYPE.CoboArgusKeyring)
          )?.[0]?.accounts?.length,
        },
      });
    } catch (e) {
      if (e.message?.includes?.('DuplicateAccountError')) {
        const address = safeJSONParse(e.message)?.address;
        show({
          address,
          type: KEYRING_CLASS.CoboArgus,
        });
      } else {
        message.error(e.message);
      }
    }
  }, [selectedChain, safeAddress, inputAddress]);

  const [, , rejectApproval] = useApproval();
  const handleClose = React.useCallback(() => {
    rejectApproval();
  }, [rejectApproval]);

  React.useEffect(() => {
    if (!state) return;
    const { chainId, address } = state;
    const chain = findChainByID(
      typeof chainId === 'number' ? chainId : parseInt(chainId, 10)
    );

    if (chain) {
      setStep('add-address');
      setSelectedChain(chain.enum);
      setInputAddress(address);
    }
  }, []);

  return (
    <section className="bg-r-neutral-bg-2 relative">
      {contextHolder}
      <Header hasBack={!isByImportAddressEvent}>
        {step === 'select-chain' &&
          t('page.newAddress.coboSafe.whichChainIsYourCoboAddressOn')}
        {(step === 'add-address' || step === 'select-address') &&
          t('page.newAddress.coboSafe.addCoboArgusAddress')}
      </Header>
      <div className="p-20 h-[calc(100vh-180px)] overflow-y-scroll pb-[100px]">
        {step === 'select-chain' && (
          <ChainList checked={selectedChain} onChecked={setSelectedChain} />
        )}
        {(step === 'add-address' || step === 'select-address') &&
          selectedChain && (
            <AddressInput
              chainEnum={selectedChain}
              value={inputAddress}
              onChange={(val) => {
                setInputAddress(val);
                setError('');
              }}
              error={error}
            />
          )}
        {selectedChain && (
          <SelectAddressPopup
            address={safeAddress}
            onCancel={() => setStep('add-address')}
            onConfirm={handleDone}
            visible={step === 'select-address'}
          />
        )}
      </div>
      <footer
        className={clsx(
          'flex p-[20px]',
          'absolute bottom-0 left-0 right-0',
          'border-t border-t-r-neutral-line',
          'bg-r-neutral-bg-1'
        )}
      >
        <Button
          disabled={
            (step === 'select-chain' && !selectedChain) ||
            (step === 'add-address' && !inputAddress)
          }
          className="w-full h-[44px] m-auto"
          type="primary"
          onClick={hasImportError ? handleClose : handleNext}
          loading={isLoading}
        >
          {hasImportError ? t('global.ok') : t('global.next')}
        </Button>
      </footer>
    </section>
  );
};
