import React, { useEffect, useMemo } from 'react';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { maxBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import { getActionTypeText } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import IconAlert from 'ui/assets/sign/tx/alert.svg';
import {
  CancelTxRequireData,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import styles from './CancelTx.module.css';

const CancelTx = ({
  data,
  requireData,
  raw,
}: {
  data: ParsedTransactionActionData['cancelTx'];
  requireData: CancelTxRequireData;
  chain: Chain;
  raw: Record<string, string | number>;
  engineResults: Result[];
  onChange(tx: Record<string, any>): void;
}) => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  const pendingTx = useMemo(() => {
    let tx: { type: string; gasPrice: number } | null = null;
    requireData.pendingTxs.forEach((group) => {
      let type = t('page.signTx.unknownAction');
      if (group.action) {
        const data = group.action.actionData;
        type = getActionTypeText(data as ParsedTransactionActionData);
      }
      const target = maxBy(group.txs, (item) =>
        Number(item.rawTx.gasPrice || item.rawTx.maxFeePerGas || 0)
      );
      if (target) {
        const res = {
          type,
          gasPrice: Number(
            target.rawTx.gasPrice || target.rawTx.maxFeePerGas || 0
          ),
        };
        if (tx && res.gasPrice > tx.gasPrice) {
          tx = res;
        } else {
          tx = res;
        }
      }
    });
    return tx as { type: string; gasPrice: number } | null;
  }, [requireData]);

  const canCancel = useMemo(() => {
    if (!pendingTx) return true;
    const currentGasPrice = Number(raw.gasPrice || raw.maxFeePerGas || 0);
    return currentGasPrice > pendingTx.gasPrice;
  }, [raw, pendingTx]);

  return (
    <div className={styles.wrapper}>
      {requireData.pendingTxs.length > 0 && (
        <>
          <div className="container">
            <div className="internal-transaction">
              {t('page.signTx.cancelTx.txToBeCanceled')}
              <div className="bg"></div>
            </div>
            {pendingTx && (
              <div className="tx-item flex justify-between">
                <span>{pendingTx.type}</span>
                <span>{pendingTx.gasPrice / 1e9} Gwei</span>
              </div>
            )}
          </div>
          {pendingTx && !canCancel && (
            <div className="flex items-start mt-[15px] mb-24 font-medium text-[14px] leading-[16px] text-r-neutral-title-1">
              <img src={IconAlert} className="w-[15px] mr-10" />
              {t('page.signTx.cancelTx.gasPriceAlert', {
                value: pendingTx.gasPrice / 1e9,
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CancelTx;
