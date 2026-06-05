import { TxHistoryItemRow } from '@/db/schema/history';
import {
  GAS_ACCOUNT_RECEIVED_ADDRESS,
  GAS_ACCOUNT_WITHDRAWED_ADDRESS,
  L2_DEPOSIT_ADDRESS_MAP,
} from '@/constant/gas-account';
import { NameAndAddress, TxAvatar } from '@/ui/component';
import { isSameAddress } from '@/ui/utils';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getTokenSymbol } from 'ui/utils/token';

type TxInterAddressExplainProps = {
  data: TxHistoryItemRow & { isGasDeposit?: boolean };
};

export const DesktopTxExplain = ({ data }: TxInterAddressExplainProps) => {
  const isCancel = data.cate_id === 'cancel';
  const isApprove = data.cate_id === 'approve';
  const project = data.project_item;
  const { t } = useTranslation();
  let tokenURL = '';

  const projectName = (
    <span>
      {project?.name ? (
        project.name
      ) : data.other_addr ? (
        <NameAndAddress
          className="justify-start"
          nameClass="text-[14px] leading-[17px] font-normal"
          copyIconClass="w-[14px] h-[14px]"
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
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {t('page.transactions.explain.depositedGas')}
        </div>
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {t('page.transactions.explain.To')}{' '}
          {t('page.transactions.explain.gasDeposit')}
        </div>
      </>
    );
  } else if (isCancel) {
    interAddressExplain = (
      <div className="text-[14px] leading-[17px] text-r-neutral-title1">
        {t('page.transactions.explain.cancel')}
      </div>
    );
  } else if (isApprove) {
    const tokenId = data.token_approve?.token_id || '';
    const tokenUUID = `${data.chain}_token:${tokenId}`;

    const approveToken = data.approve_token;

    const amount = data.token_approve?.value || 0;

    // todo: translate
    interAddressExplain = (
      <div className="text-[14px] leading-[17px] text-r-neutral-title1">
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
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {t('page.transactions.explain.depositedGas')}
        </div>
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
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
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {t('page.transactions.explain.receivedGas')}
        </div>
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
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
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {t('page.transactions.explain.withdrawGas')}
        </div>
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {t('page.transactions.explain.From')}{' '}
          {t('page.transactions.explain.gasDeposit')}
        </div>
      </>
    );
  } else {
    interAddressExplain = (
      <>
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {data.cate_item?.name ??
            (data.tx?.name || t('page.transactions.explain.unknown'))}
        </div>
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {projectName}
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-[8px]">
      <TxAvatar
        src={
          tokenURL ||
          (data.isGasDeposit ? undefined : data.project_item?.logo_url)
        }
        cateId={data.isGasDeposit ? 'send' : data.cate_id}
        className="w-[32px] h-[32px] rounded-[4px]"
      ></TxAvatar>
      <div className="flex flex-col gap-[6px]">{interAddressExplain}</div>
    </div>
  );
};
