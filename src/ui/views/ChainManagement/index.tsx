import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { sortBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import { CHAINS } from 'consts';
import { useWallet } from 'ui/utils';
import { PageHeader, StrayPageWithButton, ChainCard } from 'ui/component';
import { Chain } from 'background/service/openapi';
import DragAndDropList from './components/DragAndDropList';
import './style.less';

export const ChainManagementList = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [chains, setChains] = useState<(Chain | undefined)[]>([]);
  const [savedChains, setSavedChains] = useState<string[]>([]);
  const [savedChainsData, setSavedChainsData] = useState<Chain[]>([]);
  const init = async () => {
    const savedChains = await getPinnedChain();
    const allChainList = sortBy(
      Object.values(CHAINS)
        .map((item) => {
          if (!savedChains.includes(item.enum)) return item;
        })
        .filter(Boolean),
      (item) => item?.name
    );
    setChains(allChainList);
    const savedChainsData = savedChains
      .map((item) => {
        return Object.values(CHAINS).find((chain) => chain.enum === item);
      })
      .filter(Boolean);
    setSavedChainsData(savedChainsData);
  };

  const getPinnedChain = async () => {
    const savedChains = await wallet.getSavedChains();
    setSavedChains(savedChains);
    return savedChains;
  };

  const removeFromPin = async (chainName: string) => {
    const newChain = savedChains.filter((item) => item !== chainName);
    setSavedChains(newChain);
    await wallet.updateChain(newChain);
    const newSavedChainData = savedChainsData.filter(
      (item) => item.enum !== chainName
    );
    setSavedChainsData(newSavedChainData);
    const newChainData = Object.values(CHAINS).find(
      (item) => item.enum === chainName
    );
    if (newChainData) {
      setChains(sortBy([...chains, newChainData], (item) => item?.name));
    }
  };

  const saveToPin = async (chainName: string) => {
    await wallet.saveChain(chainName);
    const newChainData = Object.values(CHAINS).find(
      (item) => item.enum === chainName
    );
    setChains(chains.filter((item) => item?.enum !== chainName));
    setSavedChains([...savedChains, chainName]);
    if (newChainData) {
      setSavedChainsData([...savedChainsData, newChainData]);
    }
  };

  const updateChainSort = async (chainList: Chain[]) => {
    const newChain = chainList.map((item) => item.enum);
    setSavedChainsData(chainList);
    await wallet.updateChain(newChain);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <div className="pinned-wrapper">
        <div className="flex justify-between items-center">
          <div className="all-title">{t('Pinned')}</div>
          {savedChainsData.length >= 2 && (
            <div className="drag-sort">{t('Drag to sort')}</div>
          )}
        </div>
        {savedChainsData.length === 0 && (
          <div className="no-pinned-container">{t('No pinned chains')}</div>
        )}
        <div className="droppable flex flex-wrap">
          {savedChainsData.length > 0 && (
            <DragAndDropList
              pinnedChains={savedChainsData}
              removeFromPin={removeFromPin}
              updateChainSort={updateChainSort}
            />
          )}
        </div>
      </div>
      {chains.length > 0 && (
        <div className="all-wrapper">
          <div className="all-title">{t('All')}</div>
          <div className="flex flex-wrap mt-8">
            {chains.length > 0 &&
              chains.map((chain) => (
                <ChainCard
                  chain={chain}
                  key={chain?.id}
                  showIcon={true}
                  plus
                  saveToPin={saveToPin}
                />
              ))}
          </div>
        </div>
      )}
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
      <header className="create-new-header create-password-header h-[100px]">
        <p className="text-20 mt-42 mb-0 text-white text-center font-bold">
          {t('Pin your frequently used chains')}
        </p>
      </header>
      <div className="chain-management p-20 min-h-full">
        <ChainManagementList />
      </div>
    </StrayPageWithButton>
  );
};

const ChainManagement = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { state } = useLocation<{
    connection?: boolean;
    backurl?: string;
  }>();
  const { connection = false, backurl = '' } = state ?? {};
  const backDashboard = () => {
    history.push({
      pathname: backurl,
      state: {
        showChainsModal: true,
      },
    });
  };
  return (
    <div className="chain-management">
      <PageHeader onBack={backDashboard}>
        {t(connection ? 'All Chain' : 'Chain Management')}
      </PageHeader>
      <ChainManagementList />
    </div>
  );
};

export default ChainManagement;
