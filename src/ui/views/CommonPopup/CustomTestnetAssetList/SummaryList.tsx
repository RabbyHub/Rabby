import React from 'react';
import clsx from 'clsx';
import { TBody, THeadCell, THeader, Table } from './components/Table';
import { SummaryItem } from './SummaryItem';
import { useSummary } from '@/ui/utils/portfolio/useSummary';
import { useRabbySelector } from '@/ui/store';
import { ReactComponent as InfoSVG } from '@/ui/assets/dashboard/info.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { TokenListSkeleton } from './TokenListViewSkeleton';
import { ReactComponent as SkeletonSummarySVG } from '@/ui/assets/dashboard/skeleton-summary.svg';
import { useTranslation } from 'react-i18next';

interface Props {
  chainId: string | null;
}

export const SummaryList: React.FC<Props> = () => {
  const { t } = useTranslation();

  return (
    <div className={clsx('flex flex-col text-center', 'gap-y-20 mt-[80px]')}>
      <SkeletonSummarySVG className="m-auto" />
      <div className="text-15 text-r-neutral-foot font-medium">
        {t('page.dashboard.assets.comingSoon')}
      </div>
    </div>
  );
};

export const SummaryListTemp: React.FC<Props> = ({ chainId }) => {
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const { list, loading } = useSummary(currentAccount!.address, chainId);
  const { t } = useTranslation();

  if (loading) {
    return <TokenListSkeleton />;
  }

  return (
    <div>
      <Table>
        <THeader>
          <THeadCell className="w-[40%]">
            {t('page.dashboard.assets.table.token')}
          </THeadCell>
          <THeadCell className="w-[30%]">
            {t('page.dashboard.assets.table.balanceValue')}
          </THeadCell>
          <THeadCell
            className={clsx(
              'w-[30%] justify-end relative',
              'flex flex-nowrap gap-x-2'
            )}
          >
            <span>{t('page.dashboard.assets.table.percent')}</span>
            <TooltipWithMagnetArrow
              className="rectangle normal-case w-[max-content]"
              title={t('page.dashboard.assets.table.summaryTips')}
            >
              <InfoSVG />
            </TooltipWithMagnetArrow>
          </THeadCell>
        </THeader>
        <TBody className="mt-8">
          {list?.map((item) => {
            return <SummaryItem key={item.id} item={item as any} />;
          })}
        </TBody>
      </Table>
      <div className="text-12 text-r-neutral-foot leading-[16px] mt-12">
        {t('page.dashboard.assets.table.summaryDescription')}
      </div>
    </div>
  );
};
