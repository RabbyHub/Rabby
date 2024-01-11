import { formatNumber } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import React from 'react';
import { ReactComponent as IconLink } from 'ui/assets/rabby-points/link.svg';
import { ReactComponent as Icon1st } from 'ui/assets/rabby-points/1st.svg';
import { ReactComponent as Icon2st } from 'ui/assets/rabby-points/2st.svg';
import { ReactComponent as Icon3st } from 'ui/assets/rabby-points/3st.svg';
import clsx from 'clsx';

interface User {
  id: string;
  logo_url: string;
  web3_id: string;
  claimed_points: number;
  index: number;
  className?: string;
  showCurrentUser?: boolean;
}

export const TopUserItem = (props: User) => {
  return (
    <div
      className={clsx(
        'h-[56px] pl-[20px] pr-[4px] py-[12px] flex items-center',
        props.showCurrentUser &&
          'sticky bottom-0 bg-r-neutral-bg-1 bg-opacity-95 border-0 border-t-[0.5px] border-rabby-neutral-line  backdrop-blur-[4px]',
        props.className
      )}
    >
      <div className="group flex items-center">
        <img src={props.logo_url} className="w-[28px] h-[28px]" />
        <div className="ml-[12px] mr-[4px] text-[15px] font-medium text-r-neutral-black">
          {props.web3_id || ellipsisAddress(props.id)}
        </div>
        <IconLink className="w-[14px] h-[14px] opacity-0 group-hover:opacity-100" />
      </div>
      <div className="ml-auto flex items-center">
        <div className="text-[15px] font-medium text-r-neutral-title1 text-right">
          {formatNumber(props.claimed_points, 0)}
        </div>
        <div
          className={clsx(
            'w-[78px] text-center text-r-neutral-foot text-[15px]',
            props.showCurrentUser && 'relative right-[-4px]'
          )}
        >
          {props.index === 1 && (
            <Icon1st
              viewBox="0 0 75 52"
              className={clsx(props.showCurrentUser && 'h-[56px] w-auto')}
            />
          )}
          {props.index === 2 && (
            <Icon2st
              viewBox="0 0 75 52"
              className={clsx(props.showCurrentUser && 'h-[56px] w-auto')}
            />
          )}
          {props.index === 3 && (
            <Icon3st
              viewBox="0 0 75 52"
              className={clsx(props.showCurrentUser && 'h-[56px] w-auto')}
            />
          )}
          {props.index > 3 && (
            <div className="ml-[23px]">
              {props.index > 100 ? '100+' : props.index}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export const TopBoard = () => {
  return <div></div>;
};
