import React, { useMemo } from 'react';
import { ReactComponent as RcIconBackNew } from 'ui/assets/icon-back-1.svg';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import clsx from 'clsx';
import { findChain } from '@/utils/chain';
import { useHistory } from 'react-router-dom';

interface Props {
  className?: string;
  style?: React.CSSProperties;
  chainId: number;
}
export const EcologyNavBar = ({ className, style, chainId }: Props) => {
  const chain = useMemo(
    () =>
      findChain({
        id: chainId,
      }),
    [chainId]
  );
  const history = useHistory();

  return (
    <div
      className={clsx(
        'flex items-center px-[20px] py-[10px] min-h-[48px]',
        'border-b-[0.5px] border-rabby-neutral-line',
        'bg-r-neutral-bg1',
        className
      )}
      style={style}
    >
      <div className="flex-1">
        <ThemeIcon
          src={RcIconBackNew}
          className="cursor-pointer"
          onClick={() => {
            if (history.length > 1) {
              history.goBack();
            } else {
              history.replace('/');
            }
          }}
        />
      </div>
      <div className="flex-auto">
        <div className="flex items-center justify-center bg-r-neutral-bg2 rounded-full p-[6px] gap-[6px]">
          <img src={chain?.logo} alt="" className="w-[16px] h-[16px]" />
          <div className="text-neutral-body text-[13px] leading-[16px]">
            Provided by {chain?.name}
          </div>
        </div>
      </div>
      <div className="flex-1 text-right"></div>
    </div>
  );
};
