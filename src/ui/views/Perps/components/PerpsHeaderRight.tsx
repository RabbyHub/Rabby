import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconHistory } from '@/ui/assets/swap/history-cc.svg';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';
import { ReactComponent as RcIconPending } from '@/ui/assets/perps/IconSpin.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/perps/IconYellowArrow.svg';
import { AccountHistoryItem } from '@/ui/models/perps';
import { useWallet } from '@/ui/utils';

interface PerpsHeaderRightProps {
  isLogin: boolean;
  localLoadingHistory: AccountHistoryItem[];
}

export const PerpsHeaderRight: React.FC<PerpsHeaderRightProps> = ({
  isLogin,
  localLoadingHistory,
}) => {
  const wallet = useWallet();
  const history = useHistory();
  const loadingNumber = useMemo(
    () =>
      localLoadingHistory.filter((item) => item.status === 'pending').length,
    [localLoadingHistory]
  );
  const coin = undefined;

  return (
    <div className="flex items-center absolute top-[50%] translate-y-[-50%] right-0 gap-[16px]">
      <div
        className="text-r-neutral-title1 hover:text-r-blue-default cursor-pointer relative hit-slop-8"
        onClick={() => {
          wallet.openInDesktop('/desktop/perps');
        }}
      >
        <RcIconFullscreen />
      </div>
      <div className="flex items-center">
        {loadingNumber > 0 ? (
          <div
            className="flex justify-center items-center cursor-pointer rounded-full px-4 py-6 bg-rb-orange-light-1 border border-rb-orange-light-2"
            onClick={() => {
              history.push(`/perps/history/${coin}`);
            }}
          >
            <RcIconPending className="ml-4 w-16 h-16 rounded-full mr-4 animate-spin" />
            <span className="text-15 text-rb-orange-default mr-4">
              {loadingNumber}
            </span>
            <RcIconArrowRight className="w-16 h-16 text-rb-orange-default" />
          </div>
        ) : (
          <div
            className="flex items-center gap-[16px] cursor-pointer relative hit-slop-8 text-r-neutral-title1 hover:text-r-blue-default"
            onClick={() => {
              history.push(`/perps/history/${coin}`);
            }}
          >
            <RcIconHistory />
          </div>
        )}
      </div>
    </div>
  );
};
