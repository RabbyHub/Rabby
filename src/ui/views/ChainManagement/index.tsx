import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { Switch, message, Modal } from 'antd';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import { PageHeader, Field, StrayPageWithButton } from 'ui/component';
import { Chain } from 'background/service/chain';
import { CHAINS, CHAINS_ENUM } from 'consts';
import ChainCard from './components/ChainCard';
import DragAndDropList from './components/DragAndDropList';
import './style.less';
export const ChainManagementList = ({ inStart = true }) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [allChains, setAllChains] = useState<Chain[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [savedChains, setSavedChains] = useState<string[]>([]);
  const [savedChainsData, setSavedChainsData] = useState<Chain[]>([]);
  const init = async () => {
    const savedChains = await getPinnedChain();
    const getSupportChains = await wallet.getSupportChains();
    setAllChains(getSupportChains);
    const allChainList = getSupportChains
      .map((item) => {
        if (!savedChains.includes(item.enum)) return item;
      })
      .filter(Boolean);
    setChains(allChainList);
    const savedChainsData = savedChains
      .map((item) => {
        return getSupportChains.find((chain) => chain.enum === item);
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
    await wallet.updateChain(newChain);
    const newSavedChainData = savedChainsData.filter(
      (item) => item.enum !== chainName
    );
    setSavedChainsData(newSavedChainData);
    const newChainData = allChains.find((item) => item.enum === chainName);
    if (newChainData) {
      setChains([...chains, newChainData]);
    }
  };

  const saveToPin = async (chainName: string) => {
    await wallet.saveChain(chainName);
    const newChainData = allChains.find((item) => item.enum === chainName);
    setChains(chains.filter((item) => item.enum !== chainName));
    setSavedChains([...savedChains, chainName]);
    if (newChainData) {
      setSavedChainsData([...savedChainsData, newChainData]);
    }
  };

  const updateChainSort = async (chainList: Chain[]) => {
    const newChain = chainList.map((item) => item.enum);
    await wallet.updateChain(newChain);
    setSavedChainsData(chainList);
  };
  useEffect(() => {
    init();
  }, []);
  return (
    <>
      <div className="pinned-wrapper">
        <div className="flex justify-between items-center">
          <div className="all-title">Pinned</div>
          {savedChainsData.length >= 2 && (
            <div className="drag-sort">Drag to sort</div>
          )}
        </div>
        {savedChainsData.length === 0 && (
          <div className="no-pinned-container">No pinned Chains</div>
        )}
        <div className="droppable">
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
          <div className="all-title">All</div>
          <div className="flex flex-wrap p-8">
            {chains.length > 0 &&
              chains.map((chain) => (
                <ChainCard
                  chain={chain}
                  key={chain.id}
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
