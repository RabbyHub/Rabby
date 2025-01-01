import { Button } from 'antd';
import {
  ParseTextResponse,
  ParseTypedDataResponse,
} from 'background/service/openapi';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SafeMessage } from '@rabby-wallet/gnosis-sdk';
import IconChecked from 'ui/assets/checked.svg';
import IconTagYou from 'ui/assets/tag-you.svg';
import IconUnCheck from 'ui/assets/uncheck.svg';
import { NameAndAddress } from 'ui/component';
import { isSameAddress, useWallet } from 'ui/utils';

interface MessageConfirmationsProps {
  confirmations: SafeMessage['confirmations'];
  threshold: number;
  owners: string[];
}

export type ConfirmationProps = {
  owner: string;
  type: string;
  hash: string;
  signature: string | null;
};

export const GnosisMessageQueueConfirmations = ({
  confirmations,
  threshold,
  owners,
}: MessageConfirmationsProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [visibleAccounts, setVisibleAccounts] = useState<Account[]>([]);
  const init = async () => {
    const accounts = await wallet.getAllVisibleAccountsArray();
    setVisibleAccounts(accounts);
  };
  useEffect(() => {
    init();
  }, []);

  return (
    <div className="tx-confirm">
      <div className="tx-confirm__head">
        {confirmations.length >= threshold ? (
          t('Enough signature collected')
        ) : (
          <>
            <span className="number">{threshold - confirmations.length}</span>{' '}
            more confirmation needed
          </>
        )}
      </div>
      <ul className="tx-confirm__list">
        {owners.map((owner) => (
          <li
            className={clsx({
              checked: confirmations.find((confirm) =>
                isSameAddress(confirm.owner, owner)
              ),
            })}
            key={owner}
          >
            <img
              src={
                confirmations.find((confirm) =>
                  isSameAddress(confirm.owner, owner)
                )
                  ? IconChecked
                  : IconUnCheck
              }
              className="icon icon-check"
            />
            <NameAndAddress
              address={owner}
              className="text-13"
              nameClass="max-129 text-13"
              addressClass="text-13"
              noNameClass="no-name"
            />
            {visibleAccounts.find((account) =>
              isSameAddress(account.address, owner)
            ) ? (
              <img src={IconTagYou} className="icon-tag" />
            ) : (
              <></>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
