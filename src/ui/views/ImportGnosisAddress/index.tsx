import React, { useEffect, useState } from 'react';
import { useDebounce } from 'react-use';
import { Input, Form } from 'antd';
import Safe from '@rabby-wallet/gnosis-sdk';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CHAINS, CHAINS_ENUM, KEYRING_TYPE } from 'consts';
import { isValidAddress } from 'ethereumjs-util';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { FieldCheckbox } from 'ui/component';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import { Chain } from '@/background/service/openapi';
import './style.less';

const SUPPORT_CHAINS = [
  CHAINS_ENUM.ETH,
  CHAINS_ENUM.BSC,
  CHAINS_ENUM.POLYGON,
  // CHAINS_ENUM.DAI,
];

const ImportGnosisAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedChain, setSelectedChain] = useState<null | Chain>(null);

  const handleStep1Finish = () => {
    setCurrentStep(2);
  };

  const handleChainChanged = (chain: Chain, checked: boolean) => {
    if (!checked) return;
    setSelectedChain(chain);
  };

  const Step2 = () => {
    const [address, setAddress] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [canSubmit, setCanSubmit] = useState(false);
    const [importedAccounts, setImportedAccounts] = useState<any[]>([]);
    const [form] = Form.useForm();

    const [run] = useWalletRequest(wallet.importGnosisAddress, {
      onSuccess(accounts) {
        history.replace({
          pathname: '/popup/import/success',
          state: {
            accounts,
            title: t('Imported successfully'),
            editing: true,
            importedAccount: true,
            importedLength: importedAccounts && importedAccounts?.length,
          },
        });
      },
      onError(err) {
        form.setFields([
          {
            name: 'address',
            errors: [err?.message || t('Not a valid address')],
          },
        ]);
      },
    });

    const init = async () => {
      const importedAccounts = await wallet.getTypedAccounts(
        KEYRING_TYPE.GnosisKeyring
      );
      console.log(importedAccounts);
      if (importedAccounts && importedAccounts[0].accounts) {
        setImportedAccounts(importedAccounts[0].accounts);
      }
    };

    const handleNextClick = () => {
      run(address, selectedChain!.id.toString());
    };

    const handleValuesChange = (data: { address: string }) => {
      setAddress(data.address);
    };

    const validateAddress = async (address) => {
      if (!address) return;
      if (!isValidAddress(address)) {
        setErrorMsg(t('Not a valid address'));
        return;
      }
      try {
        setLoading(true);
        const safe = await Safe.getSafeInfo(address, selectedChain!.network);
        switch (safe.version) {
          case '1.3.0':
          case '1.2.0':
          case '1.1.1':
            break;
          default:
            throw new Error('Version not supported');
        }
        setErrorMsg('');
        setCanSubmit(true);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        setErrorMsg(`This address does not exist on ${selectedChain!.name}`);
      }
    };

    useDebounce(() => validateAddress(address), 500, [address]);

    useEffect(() => {
      if (address && isValidAddress(address)) {
        setLoading(true);
      }
    }, [address]);

    useEffect(() => {
      init();
    }, []);

    return (
      <StrayPageWithButton
        onSubmit={handleNextClick}
        form={form}
        hasBack
        hasDivider
        noPadding
        className="step2"
        onBackClick={() => setCurrentStep(1)}
        nextDisabled={loading || !canSubmit}
        formProps={{ onValuesChange: handleValuesChange }}
        nextLoading={loading}
      >
        <header className="create-new-header create-password-header h-[264px]">
          <img
            className="rabby-logo"
            src="/images/logo-gray.png"
            alt="rabby logo"
          />
          <img
            className="unlock-logo w-[80px] h-[80px] mb-20 mx-auto"
            src={IconGnosis}
          />
          <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
            {t('Gnosis Safe')}
          </p>
          <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
            {t('Add address')}
          </p>
          <img src="/images/gnosis-mask-2.png" className="mask" />
        </header>
        <div className="relative p-20">
          <Form.Item name="address" className="mb-8">
            <Input
              prefix={<img src={selectedChain?.logo} className="w-16 h-16" />}
              size="large"
              autoFocus
              placeholder={t('Please input address')}
            />
          </Form.Item>
          <p className="text-pink text-12 mb-0">{errorMsg}</p>
        </div>
      </StrayPageWithButton>
    );
  };

  const Step1 = () => {
    return (
      <StrayPageWithButton
        onSubmit={handleStep1Finish}
        hasBack
        hasDivider
        noPadding
        className="step1"
        nextDisabled={selectedChain === null}
      >
        <header className="create-new-header create-password-header h-[200px]">
          <img
            className="rabby-logo"
            src="/images/logo-gray.png"
            alt="rabby logo"
          />
          <img
            className="unlock-logo w-[80px] h-[80px] mb-20 mx-auto"
            src={IconGnosis}
          />
          <p className="text-24 mb-4 mt-0 text-white text-center font-medium">
            {t('Which chain is your address on')}
          </p>
          <img src="/images/gnosis-mask-1.png" className="mask" />
        </header>
        <div className="relative p-20">
          {Object.values(CHAINS)
            .sort((a, b) => {
              if (
                SUPPORT_CHAINS.includes(a.enum) &&
                !SUPPORT_CHAINS.includes(b.enum)
              ) {
                return -1;
              }
              if (
                SUPPORT_CHAINS.includes(b.enum) &&
                !SUPPORT_CHAINS.includes(a.enum)
              ) {
                return 1;
              }
              return 0;
            })
            .map((chain) => (
              <FieldCheckbox
                key={chain.network}
                leftIcon={<img src={chain.logo} className="w-28 h-28" />}
                rightSlot={
                  SUPPORT_CHAINS.find(
                    (item) => item === chain.enum
                  ) ? undefined : (
                    <span className="text-black text-12">Coming soon</span>
                  )
                }
                showCheckbox={
                  !!SUPPORT_CHAINS.find((item) => item === chain.enum)
                }
                disable={!SUPPORT_CHAINS.find((item) => item === chain.enum)}
                checked={selectedChain?.network === chain.network}
                onChange={(checked: boolean) =>
                  handleChainChanged(chain, checked)
                }
              >
                {chain.name}
              </FieldCheckbox>
            ))}
        </div>
      </StrayPageWithButton>
    );
  };

  return (
    <div className="import-gnosis h-full">
      {currentStep === 1 ? <Step1 /> : <Step2 />}
    </div>
  );
};

export default ImportGnosisAddress;
