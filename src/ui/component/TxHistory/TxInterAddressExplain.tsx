import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import React from 'react';
import { NameAndAddress } from '..';
import { getTokenSymbol } from 'ui/utils/token';
import { TxAvatar } from './TxAvatar';
import { useTranslation } from 'react-i18next';
import { TxHistoryItemRow } from '@/db/schema/history';
import {
  GAS_ACCOUNT_RECEIVED_ADDRESS,
  GAS_ACCOUNT_WITHDRAWED_ADDRESSES,
  L2_DEPOSIT_ADDRESS_MAP,
} from '@/constant/gas-account';
import { isSameAddress } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';

const TITLE_CLASS = 'tx-explain-title truncate text-r-neutral-title-1';
const DESC_CLASS = 'tx-explain-desc truncate text-r-neutral-foot';

type TxInterAddressExplainProps = {
  data: TxHistoryItemRow & { isGasDeposit?: boolean };
};

export const TxInterAddressExplain = ({ data }: TxInterAddressExplainProps) => {
  const isCancel = data.cate_id === 'cancel';
  const isApprove = data.cate_id === 'approve';
  const project = data.project_item;
  const { t } = useTranslation();
  let tokenURL = '';
  const chain = findChainByServerID(data.chain);
  const chainDepositAddress = chain
    ? L2_DEPOSIT_ADDRESS_MAP[chain.enum]
    : undefined;

  const projectName = (
    <span>
      {project?.name ? (
        project.name
      ) : data.other_addr ? (
        <NameAndAddress
          className="max-w-[170px] justify-normal gap-4"
          nameClass="m-0 font-normal text-12 text-r-neutral-foot"
          addressClass="text-12 truncate"
          address={data.other_addr}
          copyIcon={!data.is_scam}
        />
      ) : (
        ''
      )}
    </span>
  );

  let interAddressExplain;

  if (data.isGasDeposit) {
    tokenURL = data.sends?.[0]?.token?.logo_url || '';
    interAddressExplain = (
      <>
        <div className={TITLE_CLASS}>Deposited Gas</div>
        <div className={DESC_CLASS}>To Gas Deposit</div>
      </>
    );
  } else if (isCancel) {
    interAddressExplain = (
      <div className={TITLE_CLASS}>{t('page.transactions.explain.cancel')}</div>
    );
  } else if (isApprove) {
    const tokenId = data.token_approve?.token_id || '';

    const approveToken = data.approve_token;

    const amount = data.token_approve?.value || 0;

    // todo: translate
    interAddressExplain = (
      <div className={TITLE_CLASS}>
        Approve {amount < 1e9 ? amount.toFixed(4) : 'infinite'}{' '}
        {`${getTokenSymbol(approveToken)} for `}
        {projectName}
      </div>
    );
  } else if (
    data.cate_id === 'send' &&
    data.other_addr &&
    chainDepositAddress &&
    isSameAddress(data.other_addr, chainDepositAddress)
  ) {
    tokenURL = data.sends?.[0]?.token?.logo_url || '';
    // gas deposit
    interAddressExplain = (
      <>
        <div className={TITLE_CLASS}>Deposited Gas</div>
        <div className={DESC_CLASS}>To Gas Deposit</div>
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
        <div className={TITLE_CLASS}>Received Gas</div>
        <div className={DESC_CLASS}>From Gas Deposit</div>
      </>
    );
  } else if (
    data.cate_id === 'receive' &&
    data.tx?.from_addr &&
    GAS_ACCOUNT_WITHDRAWED_ADDRESSES.some((addr) =>
      isSameAddress(data.tx!.from_addr, addr)
    )
  ) {
    tokenURL = data.receives?.[0]?.token?.logo_url || '';
    // gas withdraw
    interAddressExplain = (
      <>
        <div className={TITLE_CLASS}>Withdrawn Gas</div>
        <div className={DESC_CLASS}>From Gas Deposit</div>
      </>
    );
  } else {
    interAddressExplain = (
      <>
        <div className={TITLE_CLASS}>
          {data.cate_item?.name ??
            (data.tx?.name || t('page.transactions.explain.unknown'))}
        </div>
        <div className={DESC_CLASS}>{projectName}</div>
      </>
    );
  }

  return (
    <div className="ui tx-explain flex items-center gap-8 overflow-hidden text-12">
      {tokenURL ? (
        <img
          src={tokenURL}
          alt=""
          className="tx-icon w-28 h-28 rounded-full object-cover"
        />
      ) : (
        <TxAvatar
          src={data.isGasDeposit ? undefined : data.project_item?.logo_url}
          cateId={data.isGasDeposit ? 'send' : data.cate_id}
          className="tx-icon w-28 h-28 rounded-[2px] object-cover"
        ></TxAvatar>
      )}
      <div className="tx-explain-body flex flex-col justify-center gap-4 overflow-hidden">
        {interAddressExplain}
      </div>
    </div>
  );
};
