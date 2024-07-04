import React from 'react';

import { EcologyNavBar } from '@/ui/component/Ecology/EcologyNavBar';
import { DbkButton } from '../../components/DbkButton';
import bridgeImg from '@/ui/assets/ecology/bridge-img.svg';
import dkbNftImg from '@/ui/assets/ecology/dbk-nft.png';
import clsx from 'clsx';
import { findChain } from '@/utils/chain';
import { Input } from 'antd';
import { NameAndAddress } from '@/ui/component';
import { ActivityPopup } from './components/ActivityPopup';
import { WithdrawConfirmPopup } from './components/WithdrawConfirmPopup ';

export const DbkChainBridgePage = () => {
  const chain = findChain({
    id: 1,
  });
  return (
    <div className="bg-r-neutral-bg2 h-full">
      <EcologyNavBar className="sticky top-0" />
      <div className="p-[20px]">
        <div className="rounded-[8px] bg-r-neutral-card1 px-[16px] pt-[20px] pb-[16px]">
          <div className="flex justify-center mb-[16px]">
            <div className="inline-flex items-center bg-r-neutral-card2 rounded-full p-[2px]">
              <div
                className={clsx(
                  'rounded-full min-h-[28px] min-w-[88px] cursor-pointer',
                  'bg-r-orange-DBK p-[6px] text-center',
                  'text-[13px] leading-[16px] text-r-neutral-title2 font-bold'
                )}
              >
                Deposit
              </div>
              <div
                className={clsx(
                  'rounded-full min-h-[28px] min-w-[88px] cursor-pointer',
                  'p-[6px] text-center',
                  'text-[13px] leading-[16px] text-r-neutral-body font-bold'
                )}
              >
                Withdraw
              </div>
            </div>
          </div>
          <div className="rounded-[8px] border-[0.5px] border-rabby-neutral-line p-[12px] flex items-center mb-[16px]">
            <div className="flex items-center gap-[8px]">
              <img src={chain?.logo} alt="" className="w-[28px] h-[28px]" />
              <div>
                <div className="text-[12px] leading-[14px] font-medium text-r-neutral-foot mb-[2px]">
                  From
                </div>
                <div className="text-[15px] leading-[18px] font-bold">
                  {chain?.name}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              <img src={chain?.logo} alt="" className="w-[28px] h-[28px]" />
              <div>
                <div className="text-[12px] leading-[14px] font-medium text-r-neutral-foot mb-[2px]">
                  To
                </div>
                <div className="text-[15px] leading-[18px] font-bold">
                  {chain?.name}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[8px] bg-r-neutral-card-2 p-[12px] mb-[16px]">
            <div className="flex items-center justify-between mb-[4px]">
              <Input type="number"></Input>
              <div className="">ETH</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium min-w-0 truncate">
                $3,522.12
              </div>
              <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium underline cursor-pointer min-w-0 truncate">
                Balance: 1.9807
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
                  <NameAndAddress address="x" copyIcon={false}></NameAndAddress>
                </div>
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="text-[13px] text-r-neutral-body leading-[16px] flex-shrink-0">
                  Receive on DBK Chain
                </div>
                <div className="ml-auto  min-w-0">
                  <div className="text-[13px] leading-[16px] text-r-neutral-title-1 font-semibold">
                    0.9999 ETH
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="text-[13px] text-r-neutral-body leading-[16px] flex-shrink-0">
                  Completion time
                </div>
                <div className="ml-auto  min-w-0">
                  <div className="text-[13px] leading-[16px] text-r-neutral-title-1 font-semibold truncate">
                    0.9999 ETH 0.9999 ETHo0.9999 ETH 0.9999 ETH
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-[12px]">
                <div className="text-[13px] text-r-neutral-body leading-[16px flex-shrink-0]">
                  Gas fee
                </div>
                <div className="ml-auto min-w-0">
                  <NameAndAddress address="x" copyIcon={false}></NameAndAddress>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="fixed bottom-0 left-0 right-0 px-[20px] py-[18px] bg-r-neutral-bg-1 border-t-[0.5px] border-rabby-neutral-line">
        <DbkButton className="w-full h-[44px]">Deposit</DbkButton>
      </footer>
      {/* <ActivityPopup /> */}
      <WithdrawConfirmPopup />
    </div>
  );
};
