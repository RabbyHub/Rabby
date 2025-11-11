import React, { useCallback, useEffect, useMemo } from 'react';
import { Button, Skeleton, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { useAsync, useDebounce } from 'react-use';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ReactComponent as RcIconInfo } from '@/ui/assets/perps/IconInfo.svg';
import {
  batchQueryTokens,
  queryTokensCache,
} from '@/ui/utils/portfolio/tokenUtils';
import { isSameAddress, useWallet } from '@/ui/utils';
import { ARB_USDC_TOKEN_ID, ARB_USDC_TOKEN_ITEM } from '../constants';
import { ARB_USDC_TOKEN_SERVER_CHAIN } from '../constants';
import { PerpBridgeQuote, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { TokenWithChain } from '@/ui/component';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { formatNumber, formatUsdValue } from '../../../utils/number';
import BigNumber from 'bignumber.js';
import { ToConfirmBtn } from '@/ui/component/ToConfirmButton';
import {
  supportedDirectSign,
  useDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import clsx from 'clsx';
import { Account } from '@/background/service/preference';
import { getTokenSymbol, tokenAmountBn } from '@/ui/utils/token';
import { findChainByEnum, findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM } from '@/types/chain';
import { Tx } from 'background/service/openapi';
import { useRabbyDispatch } from '@/ui/store';
import { getPerpsSDK } from '../sdkManager';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import TokenSelectPopup from './TokenSelectPopup';

export type PerpsDepositAmountPopupProps = PopupProps & {
  type: 'deposit' | 'withdraw';
  updateMiniSignTx: (
    amount: number,
    token: TokenItem,
    gasPrice: number,
    needMinusOne?: boolean
  ) => void;
  accountValue: string;
  availableBalance: string;
  currentPerpsAccount: Account | null;
  quoteLoading: boolean;
  bridgeQuote: PerpBridgeQuote | null;
  isPreparingSign: boolean;
  setIsPreparingSign: (isPreparingSign: boolean) => void;
  handleDeposit: () => void;
  miniTxs: Tx[];
  handleWithdraw?: (amount: number) => Promise<boolean>;
  onClose: () => void;
  clearMiniSignTx: () => void;
  clearMiniSignTypeData?: () => void;
  resetBridgeQuoteLoading: () => void;
  handleSignDepositDirect: (hash: string) => Promise<void>;
};

export const PerpsDepositAmountPopup: React.FC<PerpsDepositAmountPopupProps> = ({
  visible,
  type,
  quoteLoading,
  bridgeQuote,
  isPreparingSign,
  onClose,
  miniTxs,
  updateMiniSignTx,
  currentPerpsAccount,
  availableBalance,
  accountValue,
  setIsPreparingSign,
  handleDeposit,
  handleWithdraw,
  clearMiniSignTx,
  clearMiniSignTypeData,
  resetBridgeQuoteLoading,
  handleSignDepositDirect,
}) => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const [isWithdrawLoading, setIsWithdrawLoading] = React.useState(false);
  const [usdValue, setUsdValue] = React.useState<string>('');
  const [tokenVisible, setTokenVisible] = React.useState(false);
  const [selectedToken, setSelectedToken] = React.useState<TokenItem | null>(
    null
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wallet = useWallet();
  const [tokenList, setTokenList] = React.useState<TokenItem[]>([]);
  const [tokenListLoading, setTokenListLoading] = React.useState(false);
  const [gasPrice, setGasPrice] = React.useState<number>(0);

  const { value: _tokenInfo, loading: tokenLoading } = useAsync(async () => {
    if (!currentPerpsAccount?.address || !visible || !selectedToken)
      return null;
    const info = await wallet.openapi.getToken(
      currentPerpsAccount.address,
      selectedToken?.chain,
      selectedToken?.id
    );
    return info;
  }, [currentPerpsAccount?.address, visible, selectedToken]);

  const { value: isMissingRole } = useAsync(async () => {
    if (Number(accountValue)) {
      // has account value no need fetch api to check
      return false;
    }

    if (!currentPerpsAccount?.address || !visible) return false;
    const sdk = getPerpsSDK();
    const { role } = await sdk.info.getUserRole(currentPerpsAccount.address);
    return role === 'missing';
  }, [currentPerpsAccount?.address, visible, accountValue]);

  const tokenInfo = useMemo(() => {
    return _tokenInfo || selectedToken || ARB_USDC_TOKEN_ITEM;
  }, [_tokenInfo, selectedToken]);

  const fetchTokenList = useCallback(async () => {
    setTokenListLoading(true);
    if (!currentPerpsAccount?.address || !visible) return [];
    const res = await queryTokensCache(currentPerpsAccount.address, wallet);
    const usdcToken = res.find(
      (t) =>
        t.id === ARB_USDC_TOKEN_ID && t.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
    // setSelectedToken(usdcToken || ARB_USDC_TOKEN_ITEM);
    setTokenListLoading(false);
    setTokenList(res);

    const tokenRes = await batchQueryTokens(
      currentPerpsAccount.address,
      wallet,
      undefined,
      false,
      false
    );
    setTokenList(tokenRes);
    return res;
  }, [currentPerpsAccount?.address, visible]);

  useEffect(() => {
    fetchTokenList();
  }, [fetchTokenList]);

  React.useEffect(() => {
    if (!visible) {
      setUsdValue('');
      setSelectedToken(null);
      setIsWithdrawLoading(false);
      setGasPrice(0);
    }
  }, [visible]);

  const isDirectDeposit = useMemo(() => {
    return (
      selectedToken?.id === ARB_USDC_TOKEN_ID &&
      selectedToken?.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
  }, [selectedToken]);

  useEffect(() => {
    if (visible && type === 'deposit') {
      setTokenVisible(true);
    }
  }, [visible, type]);

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
    const value = Number(usdValue) || 0;
    if (!usdValue) {
      return { isValid: false, error: null };
    }

    if (type === 'withdraw') {
      if (value > Number(availableBalance)) {
        return {
          isValid: false,
          error: 'insufficient_balance',
          errorMessage: t('page.perps.insufficientBalance'),
        };
      }
      if (value < 2) {
        return {
          isValid: false,
          error: 'minimum_limit',
          errorMessage: t('page.perps.depositAmountPopup.minimumWithdrawSize'),
        };
      }

      return { isValid: true, error: null };
    } else {
      if (value < 5) {
        return {
          isValid: false,
          error: 'minimum_limit',
          errorMessage: t('page.perps.depositAmountPopup.minimumDepositSize'),
        };
      }

      const tokenAmount = (tokenInfo?.amount || 0) * (tokenInfo?.price || 0);
      if (value > tokenAmount) {
        return {
          isValid: false,
          error: 'insufficient_balance',
          errorMessage: t('page.perps.insufficientBalance'),
        };
      }
      return { isValid: true, error: null };
    }
  }, [usdValue, t, tokenInfo]);

  const isValidAmount = useMemo(() => amountValidation.isValid, [
    amountValidation.isValid,
  ]);

  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );

  const depositMaxUsdValue = useMemo(() => {
    return Number((tokenInfo?.amount || 0) * (tokenInfo?.price || 0));
  }, [tokenInfo]);

  const { value: gasList } = useAsync(async () => {
    if (!selectedToken?.chain) {
      return [];
    }

    return wallet.gasMarketV2({
      chainId: selectedToken.chain,
    });
  }, [selectedToken?.chain]);

  const chainInfo = useMemo(() => {
    return (
      findChainByServerID(
        selectedToken?.chain || ARB_USDC_TOKEN_SERVER_CHAIN
      ) || null
    );
  }, [selectedToken?.chain]);

  const tokenIsNativeToken = useMemo(() => {
    if (selectedToken && selectedToken.chain) {
      return isSameAddress(
        selectedToken.id,
        chainInfo?.nativeTokenAddress || ''
      );
    }
    return false;
  }, [selectedToken, chainInfo?.nativeTokenAddress]);

  const nativeTokenDecimals = useMemo(
    () => chainInfo?.nativeTokenDecimals || 1e18,
    [chainInfo?.nativeTokenDecimals]
  );

  const gasLimit = useMemo(
    () => (chainInfo?.enum === CHAINS_ENUM.ETH ? 1000000 : 2000000),
    [chainInfo?.enum]
  );

  const handleMax = React.useCallback(() => {
    if (tokenInfo) {
      if (tokenIsNativeToken && gasList) {
        const checkGasIsEnough = (price: number) => {
          return new BigNumber(tokenInfo?.raw_amount_hex_str || 0, 16).gte(
            new BigNumber(gasLimit).times(price)
          );
        };
        const normalPrice =
          gasList?.find((e) => e.level === 'normal')?.price || 0;
        const isNormalEnough = checkGasIsEnough(normalPrice);
        if (isNormalEnough) {
          const val = tokenAmountBn(tokenInfo).minus(
            new BigNumber(gasLimit)
              .times(normalPrice)
              .div(10 ** nativeTokenDecimals)
          );
          setUsdValue(
            val
              .times(tokenInfo?.price || 0)
              .decimalPlaces(2, BigNumber.ROUND_DOWN)
              .toFixed()
          );
          setGasPrice(normalPrice);
          return;
        }
      }
      setGasPrice(0);
      setUsdValue(
        tokenAmountBn(tokenInfo)
          ?.times(tokenInfo?.price || 0)
          .decimalPlaces(2, BigNumber.ROUND_DOWN)
          .toFixed()
      );
    }
  }, [tokenInfo, nativeTokenDecimals, gasList, gasLimit, tokenIsNativeToken]);

  // 金额变更后，防抖更新 mini sign tx，避免每次输入都触发
  useDebounce(
    () => {
      if (!visible || type === 'withdraw') return;
      if (!isValidAmount) return;
      updateMiniSignTx(
        Number(usdValue),
        tokenInfo || ARB_USDC_TOKEN_ITEM,
        gasPrice,
        isMissingRole
      );
    },
    300,
    [
      gasPrice,
      usdValue,
      visible,
      updateMiniSignTx,
      type,
      tokenInfo,
      isMissingRole,
    ]
  );

  useEffect(() => {
    if (type === 'deposit' || visible) {
      if (isValidAmount) {
        resetBridgeQuoteLoading();
      } else {
        clearMiniSignTx();
      }
    }
  }, [isValidAmount, type, visible]);

  const { openDirect, close: closeSign } = useMiniSigner({
    account: currentPerpsAccount!,
  });

  const estReceiveUsdValue = useMemo(() => {
    const value =
      (bridgeQuote?.to_token_amount || 0) * ARB_USDC_TOKEN_ITEM.price;
    return isMissingRole ? value - 1 : value;
  }, [bridgeQuote, tokenInfo, isMissingRole]);

  const quoteError = useMemo(() => {
    return type === 'deposit' &&
      selectedToken?.id !== ARB_USDC_TOKEN_ID &&
      isValidAmount &&
      !quoteLoading &&
      !bridgeQuote?.tx
      ? t('page.perps.depositAmountPopup.fetchQuoteFailed')
      : '';
  }, [bridgeQuote, quoteLoading, type, selectedToken, t, isValidAmount]);

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
      height={400}
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
              type === 'withdraw' ? 'h-[140px]' : 'h-[140px]'
            }`}
          >
            <div className="h-[140px] flex items-center justify-center flex-col">
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
                value={usdValue ? `$${usdValue}` : ''}
                onChange={(e) => {
                  let value = e.target.value;

                  // 移除美元符号
                  if (value.startsWith('$')) {
                    value = value.slice(1);
                  }

                  // 只允许数字和小数点
                  if (/^\d*\.?\d*$/.test(value) || value === '') {
                    setUsdValue(value);
                  }
                }}
              />
              {type === 'withdraw' ? (
                <div className="text-13 text-r-neutral-body text-center flex items-center justify-center gap-6">
                  {t('page.perps.availableBalance', {
                    balance: formatUsdValue(
                      availableBalance,
                      BigNumber.ROUND_DOWN
                    ),
                  })}
                  <div
                    className="text-r-blue-default bg-r-blue-light1 rounded-[4px] px-6 py-2 cursor-pointer"
                    onClick={() => {
                      setUsdValue(
                        new BigNumber(availableBalance)
                          .decimalPlaces(2, BigNumber.ROUND_DOWN)
                          .toFixed()
                      );
                    }}
                  >
                    Max
                  </div>
                </div>
              ) : (
                <div className="text-13 text-r-neutral-body text-center flex items-center justify-center gap-6">
                  {t('page.perps.balanceAvailable', {
                    balance: formatUsdValue(
                      depositMaxUsdValue,
                      BigNumber.ROUND_DOWN
                    ),
                  })}
                  <div
                    className="text-r-blue-default bg-r-blue-light1 rounded-[4px] px-6 py-2 cursor-pointer"
                    onClick={handleMax}
                  >
                    Max
                  </div>
                </div>
              )}
              <div className="text-13 text-r-red-default text-center mt-8 h-[22px]">
                {amountValidation.errorMessage || quoteError || ''}
              </div>
            </div>
          </div>
          <div
            onClick={() => {
              if (type === 'deposit') {
                setTokenVisible(true);
              }
            }}
            className={`mt-12 bg-r-neutral-card1 rounded-[8px] w-full flex items-center justify-between text-13 text-r-neutral-body px-16 h-[48px] border border-transparent ${
              type === 'withdraw'
                ? ''
                : 'hover:bg-r-blue-light1 hover:border-rabby-blue-default cursor-pointer'
            }`}
          >
            <div className="text-r-neutral-title-1 font-medium text-13">
              {type === 'deposit'
                ? t('page.perps.depositAmountPopup.payWith')
                : t('page.perps.depositAmountPopup.receiveToken')}
            </div>
            <div className={'flex items-center'}>
              <TokenWithChain
                token={selectedToken || ARB_USDC_TOKEN_ITEM}
                hideConer
                width="20px"
                height="20px"
              />
              <div
                className={'text-r-neutral-title-1 font-medium text-13 ml-4'}
              >
                {type === 'withdraw'
                  ? getTokenSymbol(ARB_USDC_TOKEN_ITEM)
                  : getTokenSymbol(selectedToken || ARB_USDC_TOKEN_ITEM)}
              </div>
              {type === 'deposit' && (
                <ThemeIcon
                  className="icon icon-arrow-right ml-4"
                  src={RcIconArrowRight}
                />
              )}
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
          {type === 'deposit' &&
            isValidAmount &&
            selectedToken?.id !== ARB_USDC_TOKEN_ID &&
            !quoteError &&
            (quoteLoading ? (
              <div className="mb-10 h-[18px] flex flex-row items-center justify-center">
                <Skeleton.Button
                  active={true}
                  className="h-[16px] mb-8 block rounded-[4px]"
                  style={{ width: 128 }}
                />
              </div>
            ) : (
              <div className="mb-10 flex h-[18px] flex-row items-center justify-center">
                <div className="text-[11px] text-r-neutral-foot text-center">
                  {t('page.perps.depositAmountPopup.estReceive', {
                    balance: formatUsdValue(estReceiveUsdValue),
                  })}
                </div>
                <Tooltip
                  overlayClassName={clsx('rectangle')}
                  placement="top"
                  title={t('page.perps.depositAmountPopup.estReceiveTooltip', {
                    number: bridgeQuote?.duration || 0,
                  })}
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
            ))}
          {type === 'deposit' ? (
            <Button
              block
              disabled={
                !isValidAmount ||
                Boolean(quoteError) ||
                (!isDirectDeposit && quoteLoading)
              }
              size="large"
              type="primary"
              loading={isPreparingSign}
              className="h-[48px] text-r-neutral-title2 text-15 font-medium"
              style={{
                height: 48,
              }}
              onClick={async () => {
                if (canUseDirectSubmitTx && miniTxs.length) {
                  clearMiniSignTypeData?.();
                  setIsPreparingSign(true);
                  closeSign();
                  try {
                    const hashes = await openDirect({
                      txs: miniTxs,
                      checkGasFeeTooHigh: true,
                      ga: {
                        category: 'Perps',
                        source: 'Perps',
                        trigger: 'Perps',
                      },
                    });
                    if (hashes && hashes.length > 0) {
                      handleSignDepositDirect(hashes[hashes.length - 1]);
                      setTimeout(() => {
                        onClose?.();
                      }, 500);
                    }
                  } catch (error) {
                    console.log('deposit error', error);
                    if (error === MINI_SIGN_ERROR.USER_CANCELLED) {
                      onClose();
                      return;
                    }
                    handleDeposit();
                  } finally {
                    setIsPreparingSign(false);
                  }
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
              loading={isWithdrawLoading}
              className="h-[48px] text-r-neutral-title2 text-15 font-medium"
              style={{
                height: 48,
              }}
              onClick={async () => {
                setIsWithdrawLoading(true);
                clearMiniSignTx();
                await handleWithdraw?.(Number(usdValue));
                setIsWithdrawLoading(false);
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
        tokenListLoading={tokenListLoading}
        changeAccount={async () => {
          if (currentPerpsAccount) {
            await dispatch.account.changeAccountAsync(currentPerpsAccount);
          }
        }}
        list={tokenList || []}
        onCancel={() => {
          if (type === 'deposit' && !selectedToken) {
            onClose();
          }

          setTokenVisible(false);
        }}
        onSelect={(t) => {
          setUsdValue('');
          setSelectedToken(t);
          setTokenVisible(false);
          inputRef.current?.focus();
        }}
      />
    </Popup>
  );
};

export default PerpsDepositAmountPopup;
