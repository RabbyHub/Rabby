import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconHistory } from '@/ui/assets/swap/history.svg';
// import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconPending } from '@/ui/assets/perps/IconSpin.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/perps/IconYellowArrow.svg';
import { AccountHistoryItem } from '@/ui/models/perps';

interface PerpsHeaderRightProps {
  isLogin: boolean;
  localLoadingHistory: AccountHistoryItem[];
}

export const PerpsHeaderRight: React.FC<PerpsHeaderRightProps> = ({
  isLogin,
  localLoadingHistory,
}) => {
  const history = useHistory();
  const loadingNumber = useMemo(
    () =>
      localLoadingHistory.filter((item) => item.status === 'pending').length,
    [localLoadingHistory]
  );
  const coin = undefined;

  if (!isLogin) {
    return null;
  }

  return loadingNumber > 0 ? (
    <div
      className="flex justify-center items-center cursor-pointer absolute right-0 rounded-full px-4 py-6 bg-rb-orange-light-1 border border-rb-orange-light-2"
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
      className="flex items-center gap-20 absolute top-[50%] translate-y-[-50%] right-0 cursor-pointer hit-slop-8"
      onClick={() => {
        history.push(`/perps/history/${coin}`);
      }}
    >
      <ThemeIcon src={RcIconHistory} />
    </div>
  );
};
