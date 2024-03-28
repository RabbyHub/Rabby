import React from 'react';

import { TransactionGroup } from '@/background/service/transactionHistory';
import IconUnknown from '@/ui/assets/icon-unknown.svg';
import IconCopy from '@/ui/assets/pending/icon-copy.svg';
import IconOpenExternal from '@/ui/assets/pending/icon-external.svg';
import { Copy } from '@/ui/component';
import { openInTab } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import { findChainByID } from '@/utils/chain';
import { findMaxGasTx } from '@/utils/tx';
import { useTranslation } from 'react-i18next';
import { getTxScanLink } from '@/utils';

export const TxHash = ({ tx }: { tx: TransactionGroup }) => {
  const chain = findChainByID(tx.chainId);
  const maxGasTx = findMaxGasTx(tx.txs);
  const { t } = useTranslation();

  const handleOpenExternal = () => {
    if (!chain || !maxGasTx?.hash) {
      return;
    }

    openInTab(getTxScanLink(chain?.scanLink, maxGasTx.hash), false);
  };
  return (
    <div>
      {maxGasTx?.hash ? (
        <div className="flex items-center gap-[6px] opacity-70">
          <img src={chain?.logo || IconUnknown} className="w-[16px] h-[16px]" />
          <div className="text-r-neutral-title-2 text-[13px] leading-[16px]">
            {t('page.pendingDetail.TxHash.hash')}:{' '}
            {maxGasTx?.hash ? ellipsisAddress(maxGasTx?.hash) : ''}
          </div>

          <>
            <img
              src={IconOpenExternal}
              className="cursor-pointer w-[14px] h-[14px]"
              alt=""
              onClick={handleOpenExternal}
            />
            <Copy
              data={maxGasTx?.hash}
              icon={IconCopy}
              className="w-[14px] h-[14px]"
            />
          </>
        </div>
      ) : null}
    </div>
  );
};
