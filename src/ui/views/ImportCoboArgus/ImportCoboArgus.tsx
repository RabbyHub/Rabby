import { CHAINS, CHAINS_ENUM, KEYRING_TYPE } from '@/constant';
import React from 'react';
import { ChainList } from './ChainList';
import { AddressInput } from './AddressInput';
import { Button, message } from 'antd';
import clsx from 'clsx';
import { Header } from './Header';
import { useWallet } from '@/ui/utils';
import { isAddress } from 'web3-utils';
import { SelectAddressPopup } from './SelectAddressPopup';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type Type = 'select-chain' | 'add-address' | 'select-address';

export const ImportCoboArgus = () => {
  const { t } = useTranslation();
  const [selectedChain, setSelectedChain] = React.useState<CHAINS_ENUM>();
  const [inputAddress, setInputAddress] = React.useState<string>('');
  const [step, setStep] = React.useState<Type>('select-chain');
  const [error, setError] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [safeAddress, setSafeAddress] = React.useState<string>('');
  const wallet = useWallet();
  const history = useHistory();

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
      message.error(e.message);
    }
  }, [selectedChain, safeAddress, inputAddress]);

  return (
    <section className="bg-gray-bg relative">
      <Header>
        {step === 'select-chain' &&
          t('page.newAddress.coboSafe.whichChainIsYourCoboAddressOn')}
        {(step === 'add-address' || step === 'select-address') &&
          t('page.newAddress.coboSafe.addCoboArgusAddress')}
      </Header>

      <div className="p-20 h-[420px] overflow-y-scroll pb-[100px]">
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
          'flex py-[18px]',
          'absolute bottom-0 left-0 right-0',
          'border-t border-gray-divider',
          'bg-white'
        )}
      >
        <Button
          disabled={
            (step === 'select-chain' && !selectedChain) ||
            (step === 'add-address' && !inputAddress)
          }
          className="w-[200px] h-[44px] m-auto"
          type="primary"
          onClick={handleNext}
          loading={isLoading}
        >
          {t('global.next')}
        </Button>
      </footer>
    </section>
  );
};
