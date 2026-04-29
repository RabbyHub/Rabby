import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import {
  ARB_USDC_TOKEN_ITEM,
  HYPE_SEND_ASSET_TOKEN_MAP,
  getSpotBalanceKey,
} from '@/ui/views/Perps/constants';
import { QUOTE_ASSET_ICON_MAP } from '@/ui/views/Perps/components/quoteAssetIcons';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemoizedFn } from 'ahooks';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { ReactComponent as RcIconTransferCC } from '@/ui/assets/perps/IconTransferCC.svg';
import { useWallet } from '@/ui/utils';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2/state/TypedDataSignatureManager';
import { Account } from '@/background/service/preference';
import { TokenWithChain } from '@/ui/component';
import { KEYRING_TYPE } from '@/constant';

interface TransferToPerpsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TransferToPerpsModal: React.FC<TransferToPerpsModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const spotBalancesMap = useRabbySelector(
    (s) => s.perps.spotState.balancesMap
  );
  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );
  const [amount, setAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
    }
  }, [visible]);

  const spotUsdc = spotBalancesMap[getSpotBalanceKey('USDC')];
  const balanceBN = useMemo(() => new BigNumber(spotUsdc?.available || 0), [
    spotUsdc?.available,
  ]);
  const balanceNum = useMemo(() => balanceBN.toNumber(), [balanceBN]);

  const amountBN = useMemo(() => new BigNumber(amount || 0), [amount]);

  const errorMessage = useMemo(() => {
    if (!amount) return '';
    if (!amountBN.isFinite() || amountBN.lte(0)) {
      return t('page.perps.PerpsTransferToPerps.invalidAmount');
    }
    if (amountBN.gt(balanceBN)) {
      return t('page.perps.PerpsTransferToPerps.insufficientBalance');
    }
    return '';
  }, [amount, amountBN, balanceBN, t]);

  const canSubmit = !errorMessage && amountBN.gt(0) && !submitting;

  const handlePercent = useMemoizedFn((pct: number) => {
    if (balanceBN.lte(0)) return;
    const v = balanceBN
      .times(pct)
      .decimalPlaces(2, BigNumber.ROUND_DOWN)
      .toFixed();
    setAmount(v);
  });

  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );

  const executeSignTypedData = useMemoizedFn(
    async (actions: any[], account: Account): Promise<string[]> => {
      if (!actions || actions.length === 0) {
        throw new Error('no signature, try later');
      }
      let result: string[] = [];
      if (canUseDirectSubmitTx) {
        typedDataSignatureStore.close();
        const isLocalWallet =
          account.type === KEYRING_TYPE.SimpleKeyring ||
          account.type === KEYRING_TYPE.HdKeyring;
        result = await typedDataSignatureStore.start(
          {
            txs: actions.map((item) => ({
              data: item,
              from: account.address,
              version: 'V4',
            })),
            config: {
              account,
              mode: isLocalWallet ? undefined : 'UI',
              getContainer: '.desktop-perps-transfer-to-perps-modal',
            },
            wallet,
          },
          {}
        );
        typedDataSignatureStore.close();
      } else {
        for (const actionObj of actions) {
          const signature = await wallet.sendRequest<string>(
            {
              method: 'eth_signTypedDataV4',
              params: [account.address, JSON.stringify(actionObj)],
            },
            { account }
          );
          result.push(signature);
        }
      }
      return result;
    }
  );

  const handleSubmit = useMemoizedFn(async () => {
    if (!canSubmit) return;
    if (!currentPerpsAccount) {
      message.error('No active perps account');
      return;
    }
    setSubmitting(true);
    try {
      const sdk = getPerpsSDK();
      if (!sdk.exchange) {
        throw new Error('Hyperliquid no exchange client');
      }

      const action = sdk.exchange.prepareSendAsset({
        destination: currentPerpsAccount.address,
        amount: amountBN.toFixed(),
        token: HYPE_SEND_ASSET_TOKEN_MAP.USDC,
        sourceDex: 'spot',
        destinationDex: '',
      });

      const [signature] = await executeSignTypedData(
        [action],
        currentPerpsAccount
      );

      await sdk.exchange.sendSendAsset({
        action: action.message as any,
        nonce: action.nonce || 0,
        signature,
      });

      message.success('Transfer submitted');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to transfer to perps:', error);
      message.error({
        duration: 1.5,
        content: error?.message || 'Transfer failed',
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal
      visible={visible}
      onCancel={submitting ? undefined : onClose}
      footer={null}
      centered
      width={400}
      closable={!submitting}
      closeIcon={<RcIconCloseCC className="w-14 text-r-neutral-title-1" />}
      bodyStyle={{ padding: 0, height: '520px', maxHeight: '520px' }}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      maskClosable={!submitting}
      keyboard={!submitting}
      className="modal-support-darkmode desktop-perps-transfer-to-perps-modal"
    >
      <PopupContainer>
        <div className="bg-rb-neutral-bg-0 h-[520px] flex flex-col relative overflow-hidden">
          <div className="px-20 pt-16 pb-20 flex-1 flex flex-col">
            <h3 className="text-[18px] font-medium text-r-neutral-title-1 text-center mb-20">
              {t('page.perps.PerpsTransferToPerps.title')}
            </h3>

            <div className="text-13 text-r-neutral-title-1 mb-8">
              {t('page.perps.PerpsTransferToPerps.title')}
            </div>
            <div className="relative bg-r-neutral-card1 rounded-[12px] px-16 py-14 mb-16">
              <div className="flex items-center mb-12">
                <span className="text-r-neutral-foot text-13 w-40">
                  {t('page.perps.PerpsTransferToPerps.from')}
                </span>
                <span className="text-r-neutral-title-1 text-15 font-medium">
                  {t('page.perps.PerpsTransferToPerps.spot')}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-r-neutral-foot text-13 w-40">
                  {t('page.perps.PerpsTransferToPerps.to')}
                </span>
                <span className="text-r-neutral-title-1 text-15 font-medium">
                  {t('page.perps.PerpsTransferToPerps.perps')}
                </span>
              </div>
              <RcIconTransferCC className="absolute right-16 top-1/2 -translate-y-1/2 text-r-neutral-foot" />
            </div>

            <div className="flex justify-between items-center mb-8">
              <span className="text-13 text-r-neutral-title-1">
                {t('page.perps.PerpsTransferToPerps.amount')}
              </span>
              <span className="text-r-neutral-foot text-13">
                {t('page.perps.PerpsTransferToPerps.balance')}:
                {balanceNum.toFixed(2)} USDC
              </span>
            </div>
            <div className="bg-r-neutral-card1 rounded-[12px] px-16 py-14 mb-16">
              <div className="flex items-center gap-8">
                <Input
                  bordered={false}
                  size="large"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 p-0 text-[28px] leading-[34px] font-medium text-r-neutral-title-1"
                  disabled={submitting}
                />
                <div
                  className={clsx(
                    'inline-flex items-center justify-center gap-6 px-[12px] h-[42px]',
                    'text-[18px] font-medium text-rb-neutral-title-1 border border-solid border-rabby-neutral-line rounded-[8px]'
                  )}
                >
                  <TokenWithChain
                    token={ARB_USDC_TOKEN_ITEM}
                    hideChainIcon
                    hideConer
                    width="24px"
                    height="24px"
                  />
                  <span>USDC</span>
                </div>
              </div>
            </div>

            <div className="flex gap-8 mb-16">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePercent(p)}
                  className={clsx(
                    'flex-1 h-[36px] rounded-[8px] text-13 font-medium',
                    'bg-r-neutral-card1 border border-solid border-transparent',
                    'text-r-neutral-title-1',
                    'hover:border-rb-brand-default hover:text-rb-brand-default',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                  )}
                  disabled={submitting}
                >
                  {p === 1
                    ? t('page.perps.PerpsTransferToPerps.max')
                    : `${p * 100}%`}
                </button>
              ))}
            </div>

            {errorMessage ? (
              <div className="text-13 text-r-red-default">{errorMessage}</div>
            ) : null}

            <div className="flex-1" />

            <Button
              block
              size="large"
              type="primary"
              className="h-[44px] rounded-[8px] text-15 font-medium"
              disabled={!canSubmit}
              loading={submitting}
              onClick={handleSubmit}
            >
              {t('page.perps.PerpsTransferToPerps.submit')}
            </Button>
          </div>
        </div>
      </PopupContainer>
    </Modal>
  );
};

export default TransferToPerpsModal;
