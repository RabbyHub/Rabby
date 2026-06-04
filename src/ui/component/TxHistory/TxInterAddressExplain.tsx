import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import React from 'react';
import { NameAndAddress } from '..';
import { getTokenSymbol } from 'ui/utils/token';
import { TxAvatar } from './TxAvatar';
import { useTranslation } from 'react-i18next';
import { TxHistoryItemRow } from '@/db/schema/history';
import {
  GAS_ACCOUNT_RECEIVED_ADDRESS,
  GAS_ACCOUNT_WITHDRAWED_ADDRESS,
  L2_DEPOSIT_ADDRESS_MAP,
} from '@/constant/gas-account';
import { isSameAddress } from '@/ui/utils';

type TxInterAddressExplainProps = {
  data: TxHistoryItemRow;
};

export const TxInterAddressExplain = ({ data }: TxInterAddressExplainProps) => {
  const isCancel = data.cate_id === 'cancel';
  const isApprove = data.cate_id === 'approve';
  const project = data.project_item;
  console.log('TxInterAddressExplain', data);
  const { t } = useTranslation();
  let tokenURL = '';

  const projectName = (
    <span>
      {project?.name ? (
        project.name
      ) : data.other_addr ? (
        <NameAndAddress address={data.other_addr} copyIcon={!data.is_scam} />
      ) : (
        ''
      )}
    </span>
  );

  let interAddressExplain;

  if (isCancel) {
    interAddressExplain = (
      <div className="tx-explain-title">
        {t('page.transactions.explain.cancel')}
      </div>
    );
  } else if (isApprove) {
    const tokenId = data.token_approve?.token_id || '';

    const approveToken = data.approve_token;

    const amount = data.token_approve?.value || 0;

    // todo: translate
    interAddressExplain = (
      <div className="tx-explain-title">
        Approve {amount < 1e9 ? amount.toFixed(4) : 'infinite'}{' '}
        {`${getTokenSymbol(approveToken)} for `}
        {projectName}
      </div>
    );
  } else if (
    data.cate_id === 'send' &&
    data.other_addr &&
    Object.values(L2_DEPOSIT_ADDRESS_MAP).includes(
      data.other_addr.toLowerCase()
    )
  ) {
    tokenURL = data.sends?.[0]?.token?.logo_url || '';
    // gas deposit
    interAddressExplain = (
      <>
        <div className="tx-explain-title">
          {t('page.transactions.explain.depositedGas')}
        </div>
        <div className="tx-explain-desc">
          {t('page.transactions.explain.To')}{' '}
          {t('page.transactions.explain.gasDeposit')}
        </div>
      </>
    );
  } else if (
    data.cate_id === 'receive' &&
    data.tx?.from_addr &&
    isSameAddress(data.tx.from_addr, GAS_ACCOUNT_RECEIVED_ADDRESS)
  ) {
    tokenURL = data.receives?.[0]?.token?.logo_url || '';
    // gas received
    interAddressExplain = (
      <>
        <div className="tx-explain-title">
          {t('page.transactions.explain.receivedGas')}
        </div>
        <div className="tx-explain-desc">
          {t('page.transactions.explain.From')}{' '}
          {t('page.transactions.explain.gasDeposit')}
        </div>
      </>
    );
  } else if (
    data.cate_id === 'receive' &&
    data.tx?.from_addr &&
    isSameAddress(data.tx.from_addr, GAS_ACCOUNT_WITHDRAWED_ADDRESS)
  ) {
    tokenURL = data.receives?.[0]?.token?.logo_url || '';
    // gas withdraw
    interAddressExplain = (
      <>
        <div className="tx-explain-title">
          {t('page.transactions.explain.withdrawGas')}
        </div>
        <div className="tx-explain-desc">
          {t('page.transactions.explain.From')}{' '}
          {t('page.transactions.explain.gasDeposit')}
        </div>
      </>
    );
  } else {
    interAddressExplain = (
      <>
        <div className="tx-explain-title">
          {data.cate_item?.name ??
            (data.tx?.name || t('page.transactions.explain.unknown'))}
        </div>
        <div className="tx-explain-desc">{projectName}</div>
      </>
    );
  }

  return (
    <div className="ui tx-explain">
      {tokenURL ? (
        <img src={tokenURL} alt="" className="tx-icon rounded-full" />
      ) : (
        <TxAvatar
          src={data.project_item?.logo_url}
          cateId={data.cate_id}
          className="tx-icon"
        ></TxAvatar>
      )}
      <div className="tx-explain-body">{interAddressExplain}</div>
    </div>
  );
};
