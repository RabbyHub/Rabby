import React, { useState } from 'react';

import { NameAndAddress } from '@/ui/component';
import { findChain } from '@/utils/chain';
import { Input } from 'antd';
import clsx from 'clsx';
import { DbkButton } from '../../components/DbkButton';
import { ActivityPopup } from './components/ActivityPopup';
import { WithdrawConfirmPopup } from './components/WithdrawConfirmPopup';
import { ReactComponent as RcIconHistory } from '@/ui/assets/ecology/icon-history-cc.svg';
import { ReactComponent as RcIconArrow } from '@/ui/assets/ecology/icon-arrow-right-cc.svg';
import { Loading3QuartersOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { DBK_CHAIN_ID } from '@/constant';
import { useRequest } from 'ahooks';
import { formatAmount, formatUsdValue, useWallet } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import BigNumber from 'bignumber.js';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';

const Warper = styled.div`
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    /* display: none; <- Crashes Chrome on hover */
    -webkit-appearance: none;
    margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
  }
  .ant-input {
    border: none !important;
    background: transparent !important;
    font-size: 28px;
    line-height: 34px;
    color: var(--r-neutral-title1, #192945);
    font-weight: 700;
    padding: 0;
  }
`;

export const DbkChainBridge = () => {
  const [isShowActivityPopup, setIsShowActivityPopup] = React.useState(false);
  const [
    isShowWithdrawConfirmPopup,
    setIsShowWithdrawConfirmPopup,
  ] = React.useState(false);

  const tabs = [
    {
      key: 'deposit' as const,
      label: 'Deposit',
    },
    {
      key: 'withdraw' as const,
      label: 'Withdraw',
    },
  ];
  const [activeTab, setActiveTab] = React.useState<'deposit' | 'withdraw'>(
    'deposit'
  );

  const fromChain = findChain({
    id: 1,
  });

  const targetChain = findChain({
    id: DBK_CHAIN_ID,
  });

  const wallet = useWallet();

  const account = useCurrentAccount();

  const { data: payToken } = useRequest(async () => {
    if (!account?.address || !fromChain?.serverId) {
      return;
    }
    return wallet.openapi.getToken(account.address, fromChain.serverId, 'eth');
  });

  const [payAmount, setPayAmount] = useState('');

  const extraInfo = {
    toAddress: account?.address,
    receiveAmount: payAmount,
    receiveTokenSymbol: payToken ? getTokenSymbol(payToken) : '',
    completeTime: '~ 10 minutes',
    // todo
    gasFee: '$10',
  };

  return (
    <Warper className="bg-r-neutral-bg2">
      <div className="p-[20px]">
        <div className="rounded-[8px] bg-r-neutral-card1 px-[16px] pt-[20px] pb-[16px]">
          <div className="flex justify-center mb-[16px] relative">
            <div className="inline-flex items-center bg-r-neutral-card2 rounded-full p-[2px]">
              {tabs.map((item) => {
                const isActive = item.key === activeTab;
                return (
                  <div
                    key={item.key}
                    onClick={() => {
                      setActiveTab(item.key);
                    }}
                    className={clsx(
                      'rounded-full min-h-[28px] min-w-[88px] cursor-pointer',
                      'p-[6px] text-center',
                      'text-[13px] leading-[16px]  font-bold',
                      isActive
                        ? 'bg-r-orange-DBK text-r-neutral-title2'
                        : 'text-r-neutral-body'
                    )}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
            <div
              className="absolute right-0 top-[50%] translate-y-[-50%] cursor-pointer text-r-neutral-title-1"
              onClick={() => {
                setIsShowActivityPopup(true);
              }}
            >
              <RcIconHistory />
              <div className="text-r-orange-DBK relative cursor-pointer">
                <Loading3QuartersOutlined className="text-[18px] animate-spin block" />
                <div className="text-[13px] leading-[13px] absolute left-0 right-0 top-0 bottom-0 flex items-center justify-center">
                  1
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[8px] border-[0.5px] border-rabby-neutral-line p-[12px] flex items-center justify-between mb-[16px]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-[8px]">
                <img
                  src={fromChain?.logo}
                  alt=""
                  className="w-[28px] h-[28px]"
                />
                <div className="min-w-0">
                  <div className="text-[12px] leading-[14px] font-medium text-r-neutral-foot mb-[2px]">
                    From
                  </div>
                  <div className="text-[15px] leading-[18px] font-bold truncate">
                    {fromChain?.name}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-r-neutral-foot flex-shrink-0">
              <RcIconArrow />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-end gap-[8px]">
                <img
                  src={targetChain?.logo}
                  alt=""
                  className="w-[28px] h-[28px]"
                />
                <div className="min-w-0">
                  <div className="text-[12px] leading-[14px] font-medium text-r-neutral-foot mb-[2px]">
                    To
                  </div>
                  <div className="text-[15px] leading-[18px] font-bold truncate">
                    {targetChain?.name}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[8px] bg-r-neutral-card-2 p-[12px] mb-[16px]">
            <div className="flex items-center justify-between mb-[4px] gap-[6px]">
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!/^\d*(\.\d*)?$/.test(v)) {
                    return;
                  }
                  setPayAmount(v);
                }}
                className="min-w-0 flex-1"
                placeholder="0"
              ></Input>
              {payToken ? (
                <div className="flex items-center gap-[8px]">
                  <img
                    src={payToken?.logo_url}
                    alt=""
                    className="w-[18px] h-[18px]"
                  />
                  <div className="text-r-neutral-title1 text-[15px] leading-[18px] font-bold">
                    {payToken ? getTokenSymbol(payToken) : ''}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium min-w-0 truncate">
                {payAmount
                  ? `${formatUsdValue(
                      new BigNumber(payAmount)
                        .times(payToken?.price || 0)
                        .toString(10)
                    )}`
                  : ''}
              </div>
              <div
                className="text-r-neutral-foot text-[13px] leading-[16px] font-medium underline cursor-pointer min-w-0 truncate"
                onClick={() => {
                  setPayAmount((payToken?.amount || 0).toString());
                }}
              >
                Balance: {formatAmount(payToken?.amount || 0)}
              </div>
            </div>
          </div>
          <div className="rounded-[8px] border-[0.5px] border-rabby-neutral-line p-[12px]">
            <div className="flex flex-col gap-[12px]">
              <div className="flex items-center gap-[12px]">
                <div className="text-[13px] text-r-neutral-body leading-[16px] flex-shrink-0">
                  To address
                </div>
                <div className="ml-auto min-w-0">
                  <NameAndAddress
                    address={extraInfo.toAddress || ''}
                    copyIcon={false}
                  ></NameAndAddress>
                </div>
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="text-[13px] text-r-neutral-body leading-[16px] flex-shrink-0">
                  Receive on {targetChain?.name}
                </div>
                <div className="ml-auto  min-w-0">
                  <div className="text-[13px] leading-[16px] text-r-neutral-title-1 font-semibold">
                    {formatAmount(extraInfo.receiveAmount || 0)}{' '}
                    {extraInfo.receiveTokenSymbol}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="text-[13px] text-r-neutral-body leading-[16px] flex-shrink-0">
                  Completion time
                </div>
                <div className="ml-auto  min-w-0">
                  <div className="text-[13px] leading-[16px] text-r-neutral-title-1 font-semibold truncate">
                    {extraInfo.completeTime}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="text-[13px] text-r-neutral-body leading-[16px flex-shrink-0]">
                  Gas fee
                </div>
                <div className="ml-auto min-w-0">{extraInfo.gasFee}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 px-[20px] py-[18px] bg-r-neutral-bg-1 border-t-[0.5px] border-rabby-neutral-line">
        <DbkButton className="w-full h-[44px]">
          {activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}
        </DbkButton>
      </footer>
      <ActivityPopup
        visible={isShowActivityPopup}
        onClose={() => {
          setIsShowActivityPopup(false);
        }}
      />
      <WithdrawConfirmPopup
        visible={isShowWithdrawConfirmPopup}
        onClose={() => {
          setIsShowWithdrawConfirmPopup(false);
        }}
      />
    </Warper>
  );
};
