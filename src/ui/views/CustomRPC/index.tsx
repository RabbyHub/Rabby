import React, { useEffect, useMemo, useState } from 'react';
import { CHAINS_ENUM, CHAINS } from '@debank/common';
import { message, Button } from 'antd';
import styled from 'styled-components';
import { Item, PageHeader, Modal } from 'ui/component';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import ChainIcon from 'ui/component/ChainIcon';
import EditRPCModal from './components/EditRPCModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import IconEdit from 'ui/assets/custom-rpc/edit.svg';
import IconDelete from 'ui/assets/custom-rpc/delete.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';

const RPCItemWrapper = styled.div`
  background: #ffffff;
  border-radius: 6px;
  padding: 12px 16px;
  display: flex;
  margin-bottom: 8px;
  height: 56px;
  border: 1px solid transparent;
  .right {
    margin-left: 12px;
    p {
      max-width: 194px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0;
      &:nth-child(1) {
        margin-bottom: 2px;
        font-size: 15px;
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
    flex: 1;
    justify-content: flex-end;
    display: none;
    align-items: center;
    .icon {
      width: 20px;
      height: 20px;
      cursor: pointer;
      user-select: none;
      &:nth-child(1) {
        margin-right: 20px;
      }
    }
  }
  &:hover {
    background: rgba(134, 151, 255, 0.1);
    border: 1px solid #8697ff;
    border-radius: 6px;
    .operation {
      display: flex;
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

const RPCItem = ({
  item,
  onEdit,
}: {
  item: { id: CHAINS_ENUM; rpc: string };
  onEdit(item: { id: CHAINS_ENUM; rpc: string }): void;
}) => {
  const dispatch = useRabbyDispatch();

  const chain = useMemo(() => {
    return CHAINS[item.id];
  }, [item]);

  const handleEdit = () => {
    onEdit(item);
  };

  const handleDelete = async () => {
    await dispatch.customRPC.deleteCustomRPC(item.id);
    message.success({
      duration: 0.5,
      icon: <i />,
      content: (
        <div>
          <div className="flex gap-4 mb-4">
            <img src={IconSuccess} alt="" />
            Deleted
          </div>
        </div>
      ),
    });
  };

  return (
    <RPCItemWrapper>
      <ChainIcon chain={item.id} customRPC={item.rpc} />
      <div className="right">
        <p>{chain.name}</p>
        <p title={item.rpc}>{item.rpc}</p>
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
    rpc: string;
  } | null>(null);

  const rpcList = useMemo(() => {
    return Object.keys(customRPC).map((key) => ({
      id: key as CHAINS_ENUM,
      rpc: customRPC[key],
    }));
  }, [customRPC]);

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

  const handleEditRPC = (item: { id: CHAINS_ENUM; rpc: string }) => {
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
  };

  const handleCancelEditCustomRPC = () => {
    setRPCModalVisible(false);
    setEditRPC(null);
  };

  useEffect(() => {
    dispatch.customRPC.getAllRPC();
  }, []);

  const NoAddressUI = (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-tx.png"
        alt="no address"
      />
      <p className="text-gray-content text-14 text-center font-medium">
        No custom RPC
      </p>
    </div>
  );

  return (
    <div className="custom-rpc">
      <PageHeader className="pt-[24px] mx-[20px] mb-16">Custom RPC</PageHeader>
      <p className="text-gray-subTitle text-14 mb-20 px-20">
        Once added, the custom RPC will replace Rabby's node. To continue using
        Rabby's node, delete the custom RPC.
      </p>
      {rpcList.length <= 0 ? (
        NoAddressUI
      ) : (
        <RPCListContainer>
          {rpcList.map((rpc) => (
            <RPCItem item={rpc} onEdit={handleEditRPC} />
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
          Add RPC
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
