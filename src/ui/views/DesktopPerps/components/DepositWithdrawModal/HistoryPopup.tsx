import React, { useMemo } from 'react';
import { useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { AccountHistoryItem } from '@/ui/models/perps';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconOpenExternal } from 'ui/assets/perps/icon-jump.svg';
import { formatUsdValue, openInTab, sinceTime } from '@/ui/utils';
import { ReactComponent as RcIconDeposit } from '@/ui/assets/perps/IconDeposit.svg';
import { ReactComponent as RcIconPending } from '@/ui/assets/perps/IconPending.svg';
import { ReactComponent as RcIconWithdraw } from '@/ui/assets/perps/IconWithdraw.svg';
import { ReactComponent as RcIconNoSrc } from '@/ui/assets/perps/IconNoSrc.svg';
import { ReactComponent as RcIconBack } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';
import { ellipsisAddress } from '@/ui/utils/address';
import { SvgIconCross } from '@/ui/assets';

interface HistoryPopupProps {
  visible: boolean;
  onClose: () => void;
}

interface HistoryAccountItemProps {
  data: AccountHistoryItem;
}

const HistoryAccountItemRow: React.FC<HistoryAccountItemProps> = ({ data }) => {
  const { time, type, status, usdValue, hash } = data;
  const { t } = useTranslation();

  const isRealDeposit = useMemo(
    () => type === 'deposit' || type === 'receive',
    [type]
  );

  const ImgAvatar = useMemo(() => {
    if (status === 'pending') {
      return <RcIconPending className="w-32 h-32 rounded-full animate-spin" />;
    }

    if (isRealDeposit) {
      return (
        <ThemeIcon src={RcIconDeposit} className="w-32 h-32 rounded-full" />
      );
    }
    return (
      <ThemeIcon src={RcIconWithdraw} className="w-32 h-32 rounded-full" />
    );
  }, [status, isRealDeposit]);

  return (
    <div
      className={clsx(
        'w-full bg-r-neutral-card1 rounded-[8px] px-12 py-10 flex items-center justify-between mb-8'
      )}
    >
      <div className="flex items-center">
        {ImgAvatar}
        <div className="flex flex-col ml-10">
          <div className="text-15 text-r-neutral-title-1 font-medium">
            {isRealDeposit ? t('page.perps.deposit') : t('page.perps.withdraw')}
          </div>
          {status === 'pending' ? (
            <div className="text-13 font-medium text-r-orange-default">
              {t('page.perps.pending')}
            </div>
          ) : (
            <div className="text-13 font-medium text-r-neutral-foot">
              {sinceTime(time / 1000)}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end">
        <div
          className={clsx(
            'text-15 font-medium',
            isRealDeposit ? 'text-r-green-default' : 'text-r-red-default'
          )}
        >
          {isRealDeposit ? '+' : '-'}
          {`${formatUsdValue(usdValue)}`}
        </div>
        {/* <div
          className="text-13 text-r-neutral-foot cursor-pointer items-center flex gap-4"
          onClick={() => {
            openInTab(`https://app.hyperliquid.xyz/explorer/tx/${hash}`);
          }}
        >
          {ellipsisAddress(hash)}
          <RcIconOpenExternal />
        </div> */}
      </div>
    </div>
  );
};

export const HistoryPopup: React.FC<HistoryPopupProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const { localLoadingHistory, userAccountHistory } = useRabbySelector(
    (state) => state.perps
  );

  // Combine and sort history list
  const historyList = useMemo(() => {
    const list = [...localLoadingHistory, ...userAccountHistory];
    return list.sort((a, b) => b.time - a.time);
  }, [localLoadingHistory, userAccountHistory]);

  if (!visible) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-r-neutral-bg-2 z-10 flex flex-col">
      {/* Header */}
      <div className="px-20 pt-16 pb-12 flex items-center justify-between relative">
        <div className="cursor-pointer p-4 -ml-4" onClick={onClose}>
          <RcIconBack className="w-20 h-20 rotate-180 text-r-neutral-title-1" />
        </div>
        <h3 className="text-[20px] font-medium text-r-neutral-title-1 absolute left-1/2 -translate-x-1/2">
          {t('page.perps.history')}
        </h3>
        <div className="cursor-pointer p-4 -mr-4" onClick={onClose}>
          <SvgIconCross className="w-14 fill-current text-r-neutral-title-1" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-20 pb-20 trades-container-no-scrollbar">
        {historyList.length > 0 ? (
          historyList.map((item, index) => (
            <HistoryAccountItemRow key={`${item.hash}-${index}`} data={item} />
          ))
        ) : (
          <div className="flex items-center justify-center gap-8 bg-r-neutral-bg-1 rounded-[8px] p-20 h-[120px] flex-col">
            <ThemeIcon src={RcIconNoSrc} className="w-24 h-24" />
            <div className="text-13 text-r-neutral-foot">
              {t('page.gasAccount.history.noHistory')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPopup;
