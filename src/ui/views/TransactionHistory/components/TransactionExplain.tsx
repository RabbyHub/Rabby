import { TransactionGroup } from '@/background/service/transactionHistory';
import { getTokenSymbol } from '@/ui/utils/token';
import {
  ApproveNFTRequireData,
  ApproveTokenRequireData,
  ContractCallRequireData,
  ContractRequireData,
  RevokeNFTRequireData,
  RevokeTokenApproveRequireData,
  SwapRequireData,
  WrapTokenRequireData,
} from '@rabby-wallet/rabby-action';
import { ExplainTxResponse } from 'background/service/openapi';
import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { SvgIconOpenExternal } from 'ui/assets';
import IconUser from 'ui/assets/address-management.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import { splitNumberByStep } from 'ui/utils/number';
import { getActionTypeText } from '../../Approval/components/Actions/utils';

export const TransactionExplain = ({
  isFailed,
  isSubmitFailed,
  isCancel,
  isWithdrawed,
  onOpenScan,
  action,
}: {
  isFailed: boolean;
  isSubmitFailed: boolean;
  isCancel: boolean;
  isWithdrawed: boolean;
  explain?: ExplainTxResponse;
  action?: TransactionGroup['action'];
  onOpenScan(): void;
}) => {
  const { t } = useTranslation();

  const { icon, content } = useMemo(() => {
    let icon: React.ReactNode = (
      <img className="icon icon-explain" src={IconUnknown} />
    );
    let content: string | React.ReactNode = t(
      'page.activities.signedTx.explain.unknown'
    );
    if (action) {
      const actionData = action.actionData;
      content = getActionTypeText(actionData);
      if (actionData.swap) {
        const requiredData = action.requiredData as SwapRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.crossToken) {
        const requiredData = action.requiredData as SwapRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.crossSwapToken) {
        const requiredData = action.requiredData as SwapRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.wrapToken) {
        const requiredData = action.requiredData as WrapTokenRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.unWrapToken) {
        const requiredData = action.requiredData as WrapTokenRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.send) {
        icon = <img className="icon icon-explain" src={IconUser} />;
        content = `${t('page.activities.signedTx.explain.send', {
          amount: splitNumberByStep(actionData.send.token.amount),
          symbol: getTokenSymbol(actionData.send.token),
        })}`;
      } else if (actionData.approveToken) {
        const requiredData = action.requiredData as ApproveTokenRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
        content = (
          <Trans
            i18nKey="page.activities.signedTx.explain.approve"
            values={{
              token: getTokenSymbol(actionData.approveToken.token),
              count: actionData.approveToken.token.is_infinity
                ? t('page.activities.signedTx.common.unlimited')
                : splitNumberByStep(actionData.approveToken.token.amount || 0),
              protocol:
                requiredData?.protocol?.name ||
                t('page.activities.signedTx.common.unknownProtocol'),
            }}
            t={t}
          />
        );
      } else if (actionData.revokeToken) {
        const requiredData = action.requiredData as RevokeTokenApproveRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
        content = (
          <Trans
            i18nKey="page.activities.signedTx.explain.cancel"
            values={{
              token: actionData.revokeToken.token?.symbol,
              protocol:
                requiredData?.protocol?.name ||
                t('page.activities.signedTx.common.unknownProtocol'),
            }}
            t={t}
          />
        );
      } else if (actionData.revokePermit2) {
        const requiredData = action.requiredData as RevokeTokenApproveRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.cancelTx) {
        icon = <img src={IconUser} className="icon icon-explain" />;
      } else if (actionData.sendNFT) {
        icon = <img className="icon icon-explain" src={IconUser} />;
        content = `${t('page.activities.signedTx.explain.send', {
          amount: splitNumberByStep(actionData.sendNFT.nft.amount),
          symbol: 'NFT',
        })}`;
      } else if (actionData.approveNFT) {
        const requiredData = action.requiredData as ApproveNFTRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
        content = (
          <Trans
            i18nKey="page.activities.signedTx.explain.singleNFTApproval"
            values={{
              protocol:
                requiredData?.protocol?.name ||
                t('page.activities.signedTx.common.unknownProtocol'),
            }}
            t={t}
          />
        );
      } else if (actionData.revokeNFT) {
        const requiredData = action.requiredData as RevokeNFTRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
        content = (
          <Trans
            i18nKey="page.activities.signedTx.explain.cancelSingleNFTApproval"
            values={{
              protocol:
                requiredData?.protocol?.name ||
                t('page.activities.signedTx.common.unknownProtocol'),
            }}
            t={t}
          />
        );
      } else if (actionData?.revokeNFTCollection) {
        const requiredData = action.requiredData as RevokeNFTRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
        content = (
          <Trans
            i18nKey="page.activities.signedTx.explain.cancelNFTCollectionApproval"
            values={{
              protocol:
                requiredData?.protocol?.name ||
                t('page.activities.signedTx.common.unknownProtocol'),
            }}
            t={t}
          />
        );
      } else if (actionData.approveNFTCollection) {
        const requiredData = action.requiredData as ApproveNFTRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
        content = (
          <Trans
            i18nKey="page.activities.signedTx.explain.nftCollectionApproval"
            values={{
              protocol:
                requiredData?.protocol?.name ||
                t('page.activities.signedTx.common.unknownProtocol'),
            }}
            t={t}
          />
        );
      } else if (actionData.deployContract) {
        // todo
      } else if (actionData.pushMultiSig) {
        // todo
      } else if (actionData.assetOrder) {
        const requiredData = action.requiredData as ContractRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.transferOwner) {
        // todo
      } else if (actionData.multiSwap) {
        const requiredData = action.requiredData as SwapRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.swapLimitPay) {
        const requiredData = action.requiredData as SwapRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.contractCall) {
        const requiredData = action.requiredData as ContractCallRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
        content =
          requiredData?.call?.func ||
          t('page.activities.signedTx.explain.unknown');
      } else if (actionData.common) {
        const requiredData = action.requiredData as ContractCallRequireData | null;
        icon = (
          <img
            src={requiredData?.protocol?.logo_url || IconUnknown}
            className="icon icon-explain"
          />
        );
      } else if (actionData.permit2BatchRevokeToken) {
        // todo
      } else {
        content = t('page.activities.signedTx.explain.unknown');
      }
    }
    return {
      content,
      icon,
    };
  }, [action]);

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
