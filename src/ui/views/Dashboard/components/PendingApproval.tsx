import React from 'react';
import { Button } from 'antd';
import clsx from 'clsx';
import { useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';

const PendingApproval = ({
  count,
  onRejectAll,
}: {
  count: number;
  onRejectAll: () => void;
}) => {
  const wallet = useWallet();

  const handleActiveApproval = async () => {
    await wallet.activeFirstApproval();
    window.close();
  };

  const handleOnRejectAll = async () => {
    await wallet.rejectAllApprovals();
    onRejectAll();
  };
  const { t } = useTranslation();

  return (
    <div className="fixed top-0 left-0 z-[999] w-screen h-screen bg-[var(--rabby-custom-ant-drawer-mask)]">
      <div
        className={clsx(
          'absolute left-1/2 -translate-x-1/2 top-[160px] w-[360px]',
          'bg-r-neutral-bg-1 shadow-[0px_20px_20px_rgba(45,48,51,0.16)] rounded-[6px]',
          'pt-40 px-16 pb-24 flex flex-col items-center'
        )}
      >
        <p className="font-medium text-[15px] leading-[22px] mx-0 mt-0 mb-[36px] text-center text-r-neutral-title-1">
          <span className="text-r-blue-default">{count}</span>{' '}
          {count === 1
            ? t('page.dashboard.home.transactionNeedsToSign')
            : t('page.dashboard.home.transactionsNeedToSign')}
        </p>
        <Button
          className="w-[200px] h-[40px] rounded"
          type="primary"
          onClick={handleActiveApproval}
        >
          {count === 1
            ? t('page.dashboard.home.view')
            : t('page.dashboard.home.viewFirstOne')}
        </Button>
        <a
          href="#"
          className="font-medium text-[13px] leading-[15px] text-center mt-16"
          onClick={handleOnRejectAll}
        >
          {t('page.dashboard.home.rejectAll')}
        </a>
      </div>
    </div>
  );
};

export default PendingApproval;
