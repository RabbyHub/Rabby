import React from 'react';
import styled from 'styled-components';
import { CHAINS, CHAINS_ENUM } from '@debank/common';

import IconOpenExternal from '@/ui/assets/open-external-gray.svg';
import IconCopy from '@/ui/assets/icon-copy.svg';
import { ellipsisAddress } from '@/ui/utils/address';
import { Copy } from '@/ui/component';
import { Button } from 'antd';

const Wrapper = styled.div`
  border-radius: 8px;
  background: var(--r-neutral-card-1, #fff);

  /* padding: 16px 0 14px 0; */
`;

export const Header = () => {
  return (
    <Wrapper>
      <div className="layout-container">
        <div className="flex leading-[24px]">
          <div className="pt-[24px] pb-[14px]">
            <div className="flex items-center gap-[8px]">
              <img
                src={CHAINS[CHAINS_ENUM.ETH].logo}
                className="w-[24px] h-[24px]"
              />
              <div className="text-r-neutral-title-1 font-medium text-[20px]">
                Tx Hash:{' '}
                {ellipsisAddress('0x1234567890123456789012345678901234567890')}
              </div>
              <img src={IconOpenExternal} className="cursor-pointer" alt="" />
              <Copy data="abc" />
            </div>
            <div className="inline-block mt-[24px] rounded-[4px] bg-r-blue-light-1 px-[16px] py-[10px] text-r-neutral-title-1 text-[20px] leading-[24px] font-medium">
              Predicted to be packed in 17s
            </div>
          </div>
          <div className="ml-auto pt-[16px] pb-[20px]">
            <div className="flex items-center gap-[8px] justify-end">
              <div className="flex items-center gap-[4px] rounded-[4px] text-r-neutral-title-2 text-[16px] leading-[19px] font-medium bg-r-orange-default p-[8px]">
                Pending: Broadcasted
              </div>
              <div className="rounded-[4px] border-[0.5px] border-r-neutral-line px-[13px] py-[8px] text-r-neutral-body text-[13px] leading-[16px] font-medium">
                Instant
              </div>
            </div>
            <div className="flex items-center gap-[12px] mt-[24px] justify-end">
              <Button
                className="h-[36px] border-blue-light text-blue-light hover:bg-[#8697FF1A] active:bg-[#0000001A] rounded-[4px] before:content-none z-10 flex items-center justify-center gap-2 border-[0.5px]"
                ghost
              >
                Speed up
              </Button>
              <Button
                className="h-[36px] border-blue-light text-blue-light hover:bg-[#8697FF1A] active:bg-[#0000001A] rounded-[4px] before:content-none z-10 flex items-center justify-center gap-2 border-[0.5px]"
                ghost
              >
                1 Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
};
