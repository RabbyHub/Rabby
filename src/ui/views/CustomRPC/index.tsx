import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useCustomRPCStore } from '@/ui/state/customRPC';
import { findChain, findChainByEnum, getTestnetChainList } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { Button, Switch, message } from 'antd';
import type { RPCItem } from 'background/service/rpc';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconDelete } from 'ui/assets/custom-rpc/delete.svg';
import { ReactComponent as RcIconEdit } from 'ui/assets/custom-rpc/edit.svg';
import IconSuccess from 'ui/assets/success.svg';
import { PageHeader } from 'ui/component';
import ChainIcon from 'ui/component/ChainIcon';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import EditRPCModal from './components/EditRPCModal';
import { useHistory, useLocation } from 'react-router-dom';
import { useMemoizedFn } from 'ahooks';
import styles from './index.module.css';

const RPCItemComp = ({
  item,
  onEdit,
}: {
  item: { id: CHAINS_ENUM; rpc: RPCItem; nonce: number };
  onEdit(item: { id: CHAINS_ENUM; rpc: RPCItem }): void;
}) => {
  const setRPCEnable = useCustomRPCStore((state) => state.setRPCEnable);
  const deleteCustomRPC = useCustomRPCStore((state) => state.deleteCustomRPC);
  const { t } = useTranslation();

  const chainItem = useMemo(() => {
    return findChainByEnum(item.id);
  }, [item]);

  const handleEdit = () => {
    onEdit(item);
  };

  const handleSwitchRPCEnable = async (val: boolean) => {
    await setRPCEnable({
      chain: item.id,
      enable: val,
    });
    message.success({
      duration: 0.5,
      icon: <i />,
      content: (
        <div>
          <div className="flex gap-4 mb-4">
            <img src={IconSuccess} alt="" />
            {val ? t('page.customRpc.opened') : t('page.customRpc.closed')}
          </div>
        </div>
      ),
    });
  };

  const handleDelete = async () => {
    await deleteCustomRPC(item.id);
    message.success({
      duration: 0.5,
      icon: <i />,
      content: (
        <div>
          <div className="flex gap-4 mb-4">
            <img src={IconSuccess} alt="" />
            {t('global.Deleted')}
          </div>
        </div>
      ),
    });
  };

  return (
    <div className={styles.rpcItemWrapper}>
      <div className="switch-wrapper">
        <Switch checked={item.rpc.enable} onChange={handleSwitchRPCEnable} />
      </div>
      <ChainIcon
        chain={item.id}
        customRPC={item.rpc?.enable ? item.rpc.url : undefined}
        nonce={item.nonce}
      />
      <div className="right">
        <p>{chainItem?.name || ''}</p>
        <p title={item.rpc.url}>{item.rpc.url}</p>
      </div>
      <div className="operation">
        <ThemeIcon
          src={RcIconEdit}
          className="icon icon-edit"
          onClick={handleEdit}
        />
        <ThemeIcon
          src={RcIconDelete}
          className="icon icon-delete"
          onClick={handleDelete}
        />
      </div>
    </div>
  );
};

const CustomRPC = () => {
  const { t } = useTranslation();
  const customRPC = useCustomRPCStore((state) => state.customRPC);
  const getAllRPC = useCustomRPCStore((state) => state.getAllRPC);
  const setCustomRPC = useCustomRPCStore((state) => state.setCustomRPC);
  const [chainSelectorVisible, setChainSelectorVisible] = useState(false);
  const [rpcModalVisible, setRPCModalVisible] = useState(false);
  const [selectedChain, setSelectedChain] = useState<CHAINS_ENUM>(
    CHAINS_ENUM.ETH
  );
  const [editRPC, setEditRPC] = useState<{
    id: CHAINS_ENUM;
    rpc: RPCItem;
  } | null>(null);
  const [nonce, setNonce] = useState(0);

  const history = useHistory();
  const location = useLocation();

  const rpcList = useMemo(() => {
    return Object.keys(customRPC).map((key) => ({
      nonce,
      id: key as CHAINS_ENUM,
      rpc: customRPC[key],
    }));
  }, [customRPC, nonce]);

  const handleChainChanged = (chain: CHAINS_ENUM) => {
    setSelectedChain(chain);
    if (customRPC[chain]) {
      setEditRPC({
        id: chain,
        rpc: customRPC[chain],
      });
    }
    setRPCModalVisible(true);
  };

  const handleEditRPC = (item: { id: CHAINS_ENUM; rpc: RPCItem }) => {
    setSelectedChain(item.id);
    setEditRPC(item);
    setRPCModalVisible(true);
  };

  const handleCancelSelectChain = () => {
    setChainSelectorVisible(false);
  };

  const handleClickAdd = () => {
    setEditRPC(null);
    setChainSelectorVisible(true);
  };

  const handleConfirmCustomRPC = async (url: string) => {
    await setCustomRPC({
      chain: selectedChain,
      url,
    });
    setChainSelectorVisible(false);
    setRPCModalVisible(false);
    setEditRPC(null);
  };

  const handleCancelEditCustomRPC = () => {
    setRPCModalVisible(false);
    setEditRPC(null);
  };

  const handleLocationState = useMemoizedFn(
    (customRPC: Record<string, RPCItem>) => {
      if (location.state) {
        const { chainId, rpcUrl } = location.state as any;
        const chainInfo = findChain({
          id: chainId,
        });
        if (chainInfo) {
          const chain = chainInfo.enum;
          setSelectedChain(chain);
          setEditRPC({
            id: chain,
            rpc: { ...customRPC[chain], url: rpcUrl },
          });
          setRPCModalVisible(true);
        }
      }
    }
  );

  useEffect(() => {
    void getAllRPC().then(handleLocationState);
  }, [getAllRPC, handleLocationState]);

  useEffect(() => {
    if (!rpcModalVisible && !chainSelectorVisible) {
      setNonce(nonce + 1);
    }
  }, [rpcModalVisible, chainSelectorVisible]);

  const NoAddressUI = (
    <div className="flex-1 px-20 pt-[117px] pb-[30px]">
      <img
        className="w-[100px] mx-auto my-0"
        src="/images/nodata-tx.png"
        alt="no address"
      />
      <p className="text-r-neutral-body text-14 text-center font-medium">
        {t('page.customRpc.empty')}
      </p>
    </div>
  );

  return (
    <div className="h-[100vh] relative flex flex-col bg-r-neutral-bg-2">
      <PageHeader
        className="pt-[24px] mx-[20px] mb-16"
        canBack={false}
        closeable
        onClose={() => {
          if (history.length > 1) {
            history.goBack();
          } else {
            history.replace('/');
          }
        }}
      >
        {t('page.customRpc.title')}
      </PageHeader>
      <p className="text-r-neutral-body text-[13px] mb-20 px-20">
        {t('page.customRpc.desc')}
      </p>
      {rpcList.length <= 0 ? (
        NoAddressUI
      ) : (
        <div className="flex-1 overflow-auto px-20 py-0">
          {rpcList.map((rpc) => (
            <RPCItemComp item={rpc} onEdit={handleEditRPC} key={rpc.id} />
          ))}
        </div>
      )}
      <div className="h-[84px] border-t-[0.5px] border-t-r-neutral-line bg-r-neutral-bg1 p-20 flex justify-center">
        <Button size="large" type="primary" block onClick={handleClickAdd}>
          {t('page.customRpc.add')}
        </Button>
      </div>
      <ChainSelectorModal
        visible={chainSelectorVisible}
        onChange={handleChainChanged}
        onCancel={handleCancelSelectChain}
        showRPCStatus
        hideTestnetTab={!getTestnetChainList().length}
      />
      <EditRPCModal
        visible={rpcModalVisible}
        rpcInfo={editRPC}
        chain={selectedChain}
        onCancel={handleCancelEditCustomRPC}
        onConfirm={handleConfirmCustomRPC}
      />
    </div>
  );
};

export default CustomRPC;
