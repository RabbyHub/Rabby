import React, { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { TokenSelectPopup } from './TokenSelectPopup';
import { useTranslation } from 'react-i18next';
import { useAsync, useDebounce } from 'react-use';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ReactComponent as RcIconInfo } from '@/ui/assets/perps/IconInfo.svg';
import {
  batchQueryTokens,
  queryTokensCache,
} from '@/ui/utils/portfolio/tokenUtils';
import { useWallet } from '@/ui/utils';
import { ARB_USDC_TOKEN_ID, ARB_USDC_TOKEN_ITEM } from '../constants';
import { ARB_USDC_TOKEN_SERVER_CHAIN } from '../constants';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { TokenWithChain } from '@/ui/component';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { formatUsdValue } from '../../../utils/number';
import BigNumber from 'bignumber.js';
import { ToConfirmBtn } from '@/ui/component/ToConfirmButton';
import {
  supportedDirectSign,
  useDirectSigning,
  useMiniApprovalGas,
  useStartDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import clsx from 'clsx';
import { Account } from '@/background/service/preference';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM } from '@/types/chain';
import { Tx } from 'background/service/openapi';
import { useRabbyDispatch } from '@/ui/store';
import { formatTokenAmount } from '@debank/common';

export type PerpsDepositAmountPopupProps = PopupProps & {
  type: 'deposit' | 'withdraw';
  updateMiniSignTx: (amount: number) => void;
  availableBalance: string;
  currentPerpsAccount: Account | null;
  isPreparingSign: boolean;
  setIsPreparingSign: (isPreparingSign: boolean) => void;
  handleDeposit: () => void;
  miniTxs: Tx[];
  handleWithdraw?: (amount: number) => Promise<boolean>;
  onClose: () => void;
  clearMiniSignTx: () => void;
  clearMiniSignTypeData?: () => void;
};

export const PerpsDepositAmountPopup: React.FC<PerpsDepositAmountPopupProps> = ({
  visible,
  type,
  isPreparingSign,
  onClose,
  miniTxs,
  updateMiniSignTx,
  currentPerpsAccount,
  availableBalance,
  setIsPreparingSign,
  handleDeposit,
  handleWithdraw,
  clearMiniSignTx,
  clearMiniSignTypeData,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const isSigningLoading = useDirectSigning();
  const [isLoading, setIsLoading] = React.useState(false);
  const [amount, setAmount] = React.useState<string>('');
  const [tokenVisible, setTokenVisible] = React.useState(false);
  const [selectedToken, setSelectedToken] = React.useState<TokenItem | null>(
    ARB_USDC_TOKEN_ITEM
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wallet = useWallet();
  const startDirectSigning = useStartDirectSigning();

  const { value: usdcTokenInfo, loading: usdcLoading } = useAsync(async () => {
    if (!currentPerpsAccount?.address || !visible) return null;
    const info = await wallet.openapi.getToken(
      currentPerpsAccount.address,
      ARB_USDC_TOKEN_SERVER_CHAIN,
      ARB_USDC_TOKEN_ID
    );
    return info;
  }, [currentPerpsAccount?.address, visible]);

  const { value: list, loading } = useAsync(async () => {
    if (!currentPerpsAccount?.address || !visible) return [];
    const res = await queryTokensCache(currentPerpsAccount.address, wallet);
    const usdcToken = res.find(
      (t) =>
        t.id === ARB_USDC_TOKEN_ID && t.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
    setSelectedToken(usdcToken || ARB_USDC_TOKEN_ITEM);
    return res;
  }, [currentPerpsAccount?.address, visible]);

  React.useEffect(() => {
    if (!visible) {
      setAmount('');
      setIsLoading(false);
    }
  }, [visible]);

  React.useEffect(() => {
    if (visible && inputRef.current) {
      // 使用 setTimeout 确保弹窗完全渲染后再聚焦
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const amountValidation = React.useMemo(() => {
    const amountValue = Number(amount) || 0;
    if (amountValue === 0) {
      return { isValid: false, error: null };
    }

    if (type === 'withdraw') {
      if (amountValue > Number(availableBalance)) {
        return {
          isValid: false,
          error: 'insufficient_balance',
          errorMessage: t('page.perps.insufficientBalance'),
        };
      }
      if (amountValue < 2) {
        return {
          isValid: false,
          error: 'minimum_limit',
          errorMessage: t('page.perps.depositAmountPopup.minimumWithdrawSize'),
        };
      }

      return { isValid: true, error: null };
    } else {
      if (amountValue < 5) {
        return {
          isValid: false,
          error: 'minimum_limit',
          errorMessage: t('page.perps.depositAmountPopup.minimumDepositSize'),
        };
      }

      if (amountValue > (usdcTokenInfo?.amount || 0)) {
        return {
          isValid: false,
          error: 'insufficient_balance',
          errorMessage: t('page.perps.insufficientBalance'),
        };
      }
      return { isValid: true, error: null };
    }
  }, [amount, t, usdcTokenInfo?.amount]);

  const isValidAmount = useMemo(() => amountValidation.isValid, [
    amountValidation.isValid,
  ]);

  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );

  const miniApprovalGas = useMiniApprovalGas();
  const gasReadyContent = useMemo(() => {
    return (
      !!miniApprovalGas &&
      !miniApprovalGas.loading &&
      !!miniApprovalGas.gasCostUsdStr
    );
  }, [miniApprovalGas]);

  // 金额变更后，防抖更新 mini sign tx，避免每次输入都触发
  useDebounce(
    () => {
      if (!visible || type === 'withdraw') return;
      updateMiniSignTx(Number(amount) || 0);
    },
    300,
    [amount, visible, updateMiniSignTx, type]
  );

  useDebounce(
    () => {
      if (canUseDirectSubmitTx && miniTxs?.length && isPreparingSign) {
        if (gasReadyContent) {
          const gasError =
            gasReadyContent && miniApprovalGas?.showGasLevelPopup;
          const chainInfo = findChainByServerID(ARB_USDC_TOKEN_SERVER_CHAIN)!;
          const gasTooHigh =
            !!gasReadyContent &&
            !!miniApprovalGas?.gasCostUsdStr &&
            new BigNumber(
              miniApprovalGas?.gasCostUsdStr?.replace(/\$/g, '')
            ).gt(chainInfo.enum === CHAINS_ENUM.ETH ? 10 : 1);

          if (gasError || gasTooHigh) {
            handleDeposit();
          } else {
            startDirectSigning();
          }
        }
        console.log('gasReadyContent', gasReadyContent);
      } else {
        setIsPreparingSign(false);
      }
    },
    300,
    [
      startDirectSigning,
      canUseDirectSubmitTx,
      miniTxs,
      gasReadyContent,
      isPreparingSign,
      handleDeposit,
    ]
  );

  // 获取错误状态下的文字颜色
  const getMarginTextColor = () => {
    if (amountValidation.error) {
      return 'text-r-red-default';
    }
    return 'text-r-neutral-title-1';
  };

  return (
    <Popup
      placement="bottom"
      height={368}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onClose}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-20 font-medium text-r-neutral-title-1 mb-16 text-center mt-16">
          {type === 'deposit'
            ? t('page.perps.deposit')
            : t('page.perps.withdraw')}
        </div>
        <div className="px-16">
          <div
            className={`flex flex-col bg-r-neutral-card1 rounded-[8px] ${
              type === 'withdraw' ? 'h-[180px]' : 'h-[200px]'
            }`}
          >
            <div className="h-[152px] flex items-center justify-center flex-col">
              <input
                className={`mt-12 text-[40px] bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none ${getMarginTextColor()}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
                ref={inputRef}
                autoFocus
                placeholder="$0"
                value={amount ? `$${amount}` : ''}
                onChange={(e) => {
                  let value = e.target.value;

                  // 移除美元符号
                  if (value.startsWith('$')) {
                    value = value.slice(1);
                  }

                  // 只允许数字和小数点
                  if (/^\d*\.?\d*$/.test(value) || value === '') {
                    setAmount(value);
                  }
                }}
              />
              {type === 'withdraw' && (
                <div className="text-13 text-r-neutral-body text-center">
                  {t('page.perps.availableBalance', {
                    balance: formatUsdValue(
                      availableBalance,
                      BigNumber.ROUND_DOWN
                    ),
                  })}
                </div>
              )}
              <div className="text-13 text-r-red-default text-center mt-8 h-[22px]">
                {amountValidation.errorMessage || ''}
              </div>
            </div>
            <div
              onClick={() => {
                if (type === 'deposit') {
                  setTokenVisible(true);
                }
              }}
              className={`w-full flex items-center justify-between text-13 text-r-neutral-body px-16 h-[48px] border-t-[0.5px] border-solid border-rabby-neutral-line ${
                type === 'withdraw' ? '' : 'cursor-pointer'
              }`}
            >
              <div className="text-r-neutral-title-1 font-medium text-13">
                {type === 'deposit'
                  ? t('page.perps.depositAmountPopup.payWith')
                  : t('page.perps.depositAmountPopup.receiveToken')}
              </div>
              {selectedToken ? (
                <div className={'flex items-center'}>
                  <TokenWithChain
                    token={selectedToken}
                    hideConer
                    width="20px"
                    height="20px"
                  />
                  <div className="text-r-neutral-title-1 font-medium text-13 ml-4">
                    {type === 'withdraw'
                      ? getTokenSymbol(selectedToken)
                      : formatTokenAmount(usdcTokenInfo?.amount || 0, 2)}
                  </div>
                  {type === 'deposit' && (
                    <ThemeIcon
                      className="icon icon-arrow-right ml-4"
                      src={RcIconArrowRight}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line flex items-center justify-center flex-col">
          {type === 'withdraw' && (
            <div className="mb-10 flex flex-row items-center justify-center">
              <div className="text-[11px] text-r-neutral-foot text-center">
                {t('page.perps.depositAmountPopup.feeTip')}
              </div>
              <Tooltip
                overlayClassName={clsx('rectangle')}
                placement="top"
                title={t('page.perps.depositAmountPopup.feeTipTooltip')}
                align={{ targetOffset: [0, 0] }}
              >
                <RcIconInfo
                  viewBox="0 0 12 12"
                  width={12}
                  height={12}
                  className="text-rabby-neutral-foot ml-4"
                />
              </Tooltip>
            </div>
          )}
          {type === 'deposit' ? (
            <Button
              block
              disabled={!isValidAmount}
              size="large"
              type="primary"
              loading={isSigningLoading || isPreparingSign}
              className="h-[48px] text-r-neutral-title2 text-15 font-medium"
              style={{
                height: 48,
              }}
              onClick={async () => {
                if (canUseDirectSubmitTx) {
                  clearMiniSignTypeData?.();
                  setIsPreparingSign(true);
                } else {
                  handleDeposit();
                }
                return true;
              }}
            >
              {t('page.perps.deposit')}
            </Button>
          ) : (
            <Button
              block
              disabled={!isValidAmount}
              size="large"
              type="primary"
              loading={isLoading}
              className="h-[48px] text-r-neutral-title2 text-15 font-medium"
              style={{
                height: 48,
              }}
              onClick={async () => {
                setIsLoading(true);
                clearMiniSignTx();
                await handleWithdraw?.(Number(amount));
                setIsLoading(false);
                onClose?.();
              }}
            >
              {t('page.perps.withdraw')}
            </Button>
          )}
        </div>
      </div>

      <TokenSelectPopup
        visible={tokenVisible}
        usdcTokenInfo={usdcTokenInfo}
        changeAccount={async () => {
          if (currentPerpsAccount) {
            await dispatch.account.changeAccountAsync(currentPerpsAccount);
          }
        }}
        list={list || []}
        onCancel={() => setTokenVisible(false)}
        onSelect={(t) => {
          setSelectedToken(t);
          setTokenVisible(false);
        }}
      />
    </Popup>
  );
};

export default PerpsDepositAmountPopup;
