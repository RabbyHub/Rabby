import { Button } from 'antd';
import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  border: 0.3px solid var(--r-neutral-line, #d3d8e0);
  border-radius: 5px;
  padding: 12px 0;
  padding-top: 14px;
`;

interface ClaimItem {
  id: number;
  title: string;
  desc: string;
  expired_at: number; // 活动过期时间
  claimable_points: number; // 当前地址可领取的积分
}
export const ClaimItem = (props: ClaimItem) => {
  const claim = () => {
    // todo
  };
  return (
    <Wrapper className="border ">
      <div className="flex items-center justify-between pb-[12px] px-[16px] border-b border-rabby-neutral-line">
        <div>{props.title}</div>
        <Button
          type="primary"
          className="w-[100px] h-[32px] text-r-neutral-title-2 text-[13px] font-medium"
          disabled={props.claimable_points <= 0}
          onClick={claim}
        >
          claim
        </Button>
      </div>
      <div className="pt-[12px] text-r-neutral-foot font-[12px] px-[16px]">
        {props.desc}
      </div>
    </Wrapper>
  );
};
