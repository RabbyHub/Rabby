import React from 'react';
import clsx from 'clsx';
import { TBody, THeadCell, THeader, Table } from './components/Table';
import { SummaryItem } from './SummaryItem';
import { useSummary } from '@/ui/utils/portfolio/useSummary';
import { useRabbySelector } from '@/ui/store';
import { ReactComponent as SkeletonSummarySVG } from '@/ui/assets/dashboard/skeleton-summary.svg';

export const SummaryList: React.FC = () => {
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  // const { list, loading } = useSummary(currentAccount!.address, null);

  // return (
  //   <div>
  //     <Table>
  //       <THeader>
  //         <THeadCell className="w-1/2">Asset / Amount</THeadCell>
  //         <THeadCell className="w-1/4">Price</THeadCell>
  //         <THeadCell className="w-1/4 text-right">USD Value</THeadCell>
  //       </THeader>
  //       <TBody className="mt-8">
  //         {list?.map((item) => {
  //           return <SummaryItem key={item.id} item={item} />;
  //         })}
  //       </TBody>
  //     </Table>
  //   </div>
  // );

  return (
    <div className={clsx('flex flex-col text-center', 'gap-y-20 mt-[80px]')}>
      <SkeletonSummarySVG className="m-auto" />
      <div className="text-15 text-gray-comment font-medium">
        Coming Soon...
      </div>
    </div>
  );
};
