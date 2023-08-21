import React, { useEffect, useMemo, useState } from 'react';
import { CHAINS_ENUM, CHAINS } from '@debank/common';
import { message, Button, Switch } from 'antd';
import styled from 'styled-components';
import { RPCItem } from 'background/service/rpc';
import { PageHeader } from 'ui/component';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import ChainIcon from 'ui/component/ChainIcon';
import EditRPCModal from './components/EditRPCModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconEdit from 'ui/assets/custom-rpc/edit.svg';
import IconDelete from 'ui/assets/custom-rpc/delete.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';
import { findChainByEnum } from '@/utils/chain';
import { useTranslation } from 'react-i18next';

const RPCItemWrapper = styled.div`
  background: #ffffff;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  margin-bottom: 8px;
  height: 56px;
  border: 1px solid transparent;
  align-items: center;
  .switch-wrapper {
    margin-right: 12px;
  }
  .right {
    margin-left: 12px;
    max-width: 194px;
    p {
      max-width: 194px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0;
      &:nth-child(1) {
        margin-bottom: 2px;
        font-size: 13px;
        font-weight: 500;
        line-height: 18px;
        color: #13141a;
      }
      &:nth-child(2) {
        font-weight: 400;
        font-size: 13px;
        line-height: 15px;
        color: #4b4d59;
      }
    }
  }
  .operation {
    justify-content: flex-end;
    opacity: 0;
    align-items: center;
    display: flex;
    flex: 1;
    .icon {
      width: 16px;
      height: 16px;
      cursor: pointer;
      user-select: none;
      &:nth-child(1) {
        margin-right: 12px;
      }
    }
  }
  .chain-icon-comp {
    img {
      width: 24px;
      height: 24px;
    }
  }
  &:hover {
    background: var(--r-blue-light, #eef1ff);
    border: 1px solid var(--r-blue-default, #7084ff);
    border-radius: 6px;
    .operation {
      opacity: 1;
    }
  }
`;

const RPCListContainer = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0 20px;
`;

const Footer = styled.div`
  height: 76px;
  background: #ffffff;
  padding: 16px 0;
  display: flex;
  justify-content: center;
`;

const RPCItemComp = ({
  item,
  onEdit,
}: {
  item: { id: CHAINS_ENUM; rpc: RPCItem; nonce: number };
  onEdit(item: { id: CHAINS_ENUM; rpc: RPCItem }): void;
}) => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  const chainItem = useMemo(() => {
    return findChainByEnum(item.id);
  }, [item]);

  const handleEdit = () => {
    onEdit(item);
  };

  const handleSwitchRPCEnable = async (val: boolean) => {
    await dispatch.customRPC.setRPCEnable({
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
    await dispatch.customRPC.deleteCustomRPC(item.id);
    matomoRequestEvent({
      category: 'CustomRPC',
      action: 'delete',
      label: item.id,
    });
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
    <RPCItemWrapper>
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
        <img src={IconEdit} className="icon icon-edit" onClick={handleEdit} />
        <img
          src={IconDelete}
          className="icon icon-delete"
          onClick={handleDelete}
        />
      </div>
    </RPCItemWrapper>
  );
};

const CustomRPC = () => {
  const { t } = useTranslation();
  const { customRPC } = useRabbySelector((s) => ({
    ...s.customRPC,
  }));
  const dispatch = useRabbyDispatch();
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
    await dispatch.customRPC.setCustomRPC({
      chain: selectedChain,
      url,
    });
    setChainSelectorVisible(false);
    setRPCModalVisible(false);
    setEditRPC(null);
    matomoRequestEvent({
      category: 'CustomRPC',
      action: 'add',
      label: selectedChain,
    });
  };

  const handleCancelEditCustomRPC = () => {
    setRPCModalVisible(false);
    setEditRPC(null);
  };

  useEffect(() => {
    dispatch.customRPC.getAllRPC();
  }, []);

  useEffect(() => {
    if (!rpcModalVisible && !chainSelectorVisible) {
      setNonce(nonce + 1);
    }
  }, [rpcModalVisible, chainSelectorVisible]);

  const NoAddressUI = (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-tx.png"
        alt="no address"
      />
      <p className="text-gray-content text-14 text-center font-medium">
        {t('page.customRpc.empty')}
      </p>
    </div>
  );

  return (
    <div className="custom-rpc">
      <PageHeader className="pt-[24px] mx-[20px] mb-16">
        {t('page.customRpc.title')}
      </PageHeader>
      <p className="text-gray-subTitle text-14 mb-20 px-20">
        {t('page.customRpc.desc')}
      </p>
      {rpcList.length <= 0 ? (
        NoAddressUI
      ) : (
        <RPCListContainer>
          {rpcList.map((rpc) => (
            <RPCItemComp item={rpc} onEdit={handleEditRPC} />
          ))}
        </RPCListContainer>
      )}
      <Footer>
        <Button
          size="large"
          type="primary"
          className="w-[172px]"
          onClick={handleClickAdd}
        >
          {t('page.customRpc.add')}
        </Button>
      </Footer>
      <ChainSelectorModal
        visible={chainSelectorVisible}
        onChange={handleChainChanged}
        onCancel={handleCancelSelectChain}
        showRPCStatus
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
