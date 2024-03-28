import { ExplainTxResponse } from 'background/service/openapi';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SvgIconOpenExternal } from 'ui/assets';
import IconUser from 'ui/assets/address-management.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import { splitNumberByStep } from 'ui/utils/number';

export const TransactionExplain = ({
  isFailed,
  isSubmitFailed,
  isCancel,
  isWithdrawed,
  explain,
  onOpenScan,
}: {
  isFailed: boolean;
  isSubmitFailed: boolean;
  isCancel: boolean;
  isWithdrawed: boolean;
  explain?: ExplainTxResponse;
  onOpenScan(): void;
}) => {
  const { t } = useTranslation();
  let icon: React.ReactNode = (
    <img className="icon icon-explain" src={IconUnknown} />
  );
  let content: string | React.ReactNode = t(
    'page.activities.signedTx.explain.unknown'
  );
  if (explain) {
    if (explain.type_cancel_nft_collection_approval) {
      icon = (
        <img
          src={
            explain.type_cancel_nft_collection_approval
              .spender_protocol_logo_url || IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.cancelNFTCollectionApproval"
          values={{
            protocol:
              explain.type_cancel_nft_collection_approval
                .spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_nft_collection_approval) {
      icon = (
        <img
          src={
            explain.type_nft_collection_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.nftCollectionApproval"
          values={{
            protocol:
              explain.type_nft_collection_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_cancel_single_nft_approval) {
      icon = (
        <img
          src={
            explain.type_cancel_single_nft_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.cancelSingleNFTApproval"
          values={{
            protocol:
              explain.type_cancel_single_nft_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_single_nft_approval) {
      icon = (
        <img
          src={
            explain.type_single_nft_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.singleNFTApproval"
          values={{
            protocol:
              explain.type_single_nft_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_nft_send) {
      icon = <img className="icon icon-explain" src={IconUser} />;
      content = `${t('page.activities.signedTx.explain.send', {
        amount: splitNumberByStep(explain.type_nft_send.token_amount),
        symbol: 'NFT',
      })}`;
    } else if (explain.type_cancel_token_approval) {
      icon = (
        <img
          src={
            explain.type_cancel_token_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.cancel"
          values={{
            token: explain.type_cancel_token_approval.token_symbol,
            protocol:
              explain.type_cancel_token_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_token_approval) {
      icon = (
        <img
          src={
            explain.type_token_approval.spender_protocol_logo_url || IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.approve"
          values={{
            token: explain.type_token_approval.token_symbol,
            count: explain.type_token_approval.is_infinity
              ? t('page.activities.signedTx.common.unlimited')
              : splitNumberByStep(explain.type_token_approval.token_amount),
            protocol:
              explain.type_token_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_send) {
      icon = <img className="icon icon-explain" src={IconUser} />;
      content = `${t('page.activities.signedTx.explain.send', {
        amount: splitNumberByStep(explain.type_send.token_amount),
        symbol: explain.type_send.token_symbol,
      })}`;
    } else if (explain.type_call) {
      icon = (
        <img
          src={explain.type_call.contract_protocol_logo_url || IconUnknown}
          className="icon icon-explain"
        />
      );
      content = explain.type_call.action;
    }
  }

  return (
    <div className="tx-explain" onClick={onOpenScan}>
      {icon || <img className="icon icon-explain" src={IconUnknown} />}
      <div className="flex flex-1 justify-between">
        <div className="flex flex-1 items-center tx-explain__text">
          <span>
            {content || t('page.activities.signedTx.explain.unknown')}
          </span>
          <SvgIconOpenExternal className="icon icon-external" />
        </div>
        <span className="text-red-light text-14 font-normal text-right">
          {isCancel && t('page.activities.signedTx.status.canceled')}
          {isFailed && t('page.activities.signedTx.status.failed')}
          {isSubmitFailed &&
            !isWithdrawed &&
            t('page.activities.signedTx.status.submitFailed')}
          {isWithdrawed && t('page.activities.signedTx.status.withdrawed')}
        </span>
      </div>
    </div>
  );
};
