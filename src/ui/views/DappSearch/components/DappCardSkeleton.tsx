import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';

const Wraper = styled.div`
  border: 1px solid transparent;
  &:hover {
    border: 1px solid var(--r-blue-default, #7084ff);
    box-shadow: 0px 4px 4px 0px rgba(112, 132, 255, 0.12);
  }
`;

export const DappCardSkeleton = () => {
  return (
    <Wraper
      className={clsx(
        'p-[16px] bg-r-neutral-card1 cursor-pointer rounded-[8px]'
      )}
    >
      <div className="flex items-center pb-[4px]">
        <div className="flex items-center gap-[12px]">
          <Skeleton.Avatar
            active={true}
            className="bg-r-neutral-card3, w-[32px] h-[32px]"
          ></Skeleton.Avatar>
          <div className="min-w-0">
            <div className="text-r-neutral-title1 font-medium text-[16px] leading-[19px] mb-[2px]">
              <Skeleton.Input
                active={true}
                className="bg-r-neutral-card3, rounded-[2px] w-[107px] h-[18px]"
              ></Skeleton.Input>
            </div>
            <div className="text-r-neutral-foot text-[13px] leading-[16px]">
              <Skeleton.Input
                active={true}
                className="bg-r-neutral-card3, rounded-[2px] w-[85px] h-[14px]"
              ></Skeleton.Input>
            </div>
          </div>
        </div>
      </div>
      <Skeleton.Input
        active={true}
        className="bg-r-neutral-card3, rounded-[2px] w-full h-[20px]"
      ></Skeleton.Input>
    </Wraper>
  );
};
