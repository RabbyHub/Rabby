import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { Switch, message, Modal } from 'antd';
import { PageHeader, Field, StrayPageWithButton } from 'ui/component';
import { Chain } from 'background/service/chain';
import { CHAINS, CHAINS_ENUM } from 'consts';
import './style.less';

export const ChainManagementList = ({ inStart = false }) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [enableChains, setEnableChains] = useState<Chain[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);

  const disableChain = async (chainEnum: CHAINS_ENUM) => {
    setEnableChains(enableChains.filter((chain) => chain.enum !== chainEnum));
    await wallet.disableChain(chainEnum);
  };

  const handleSwitchChain = async (
    chainEnum: CHAINS_ENUM,
    checked: boolean
  ) => {
    if (checked) {
      setEnableChains([...enableChains, CHAINS[chainEnum]]);
      await wallet.enableChain(chainEnum);
    } else {
      if (enableChains.length > 1) {
        if (inStart) {
          await disableChain(chainEnum);
          return;
        }

        Modal.confirm({
          centered: true,
          title: t('disableChainAlert'),
          className: 'disable-chain',
          bodyStyle: {
            backgroundColor: 'transparent',
          },
          okText: t('Disable'),
          cancelText: t('Cancel'),
          width: '360px',
          onOk: async () => {
            const sites = await wallet.getSitesByDefaultChain(chainEnum);
            if (sites.length > 0) {
              sites.forEach((site) => {
                wallet.removeConnectedSite(site.origin);
              });
            }

            await disableChain(chainEnum);
          },
        });
      } else {
        message.error(t('At least one enabled chain is required'));
      }
    }
  };

  const init = async () => {
    setEnableChains(await wallet.getEnableChains());
    setChains(await wallet.getSupportChains());
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      {chains.map((chain) => (
        <Field
          key={chain.enum}
          leftIcon={<img src={chain.logo} className="icon icon-chain" />}
          unselect
          rightIcon={
            <Switch
              defaultChecked={!!enableChains.find((c) => c.enum === chain.enum)}
              checked={!!enableChains.find((c) => c.enum === chain.enum)}
              onChange={(checked) => handleSwitchChain(chain.enum, checked)}
            />
          }
        >
          <div className="chain-info">
            <p className="text-13">{chain.name}</p>
            <p className="text-12">
              {t('Chain ID')}: {chain.id}
            </p>
          </div>
        </Field>
      ))}
    </>
  );
};

export const StartChainManagement = () => {
  const history = useHistory();
  const { t } = useTranslation();

  const handleNextClick = () => {
    history.replace('/no-address');
  };

  return (
    <StrayPageWithButton
      NextButtonContent="OK"
      hasDivider
      onNextClick={handleNextClick}
      noPadding
      headerClassName="mb-24"
    >
      <header className="create-new-header create-password-header h-[140px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <p className="text-24 mt-32 mb-0 text-white text-center font-bold">
          {t('Enable Chains')}
        </p>
      </header>
      <div className="chain-management p-20 min-h-full">
        <ChainManagementList inStart />
      </div>
    </StrayPageWithButton>
  );
};

const ChainManagement = () => {
  const { t } = useTranslation();
  return (
    <div className="chain-management">
      <PageHeader>{t('Chain Management')}</PageHeader>
      <ChainManagementList />
    </div>
  );
};

export default ChainManagement;
