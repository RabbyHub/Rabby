import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Empty, Item, Popup, TokenWithChain } from '@/ui/component';
import { Space, Tooltip } from 'antd';
import { PopupProps } from '@/ui/component/Popup';
import { SvgIconLoading } from 'ui/assets';
import { FixedSizeList } from 'react-window';
import styled from 'styled-components';
import { noop } from 'lodash';
import clsx from 'clsx';
import { useAsync } from 'react-use';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_CLASS } from '@/constant';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChainByServerID } from '@/utils/chain';
import { L2_DEPOSIT_ADDRESS_MAP } from '@/constant/gas-account';
import { GasAccountCloseIcon } from './PopupCloseIcon';
import { Input } from 'antd';
import {
  useStartDirectSigning,
  DirectSubmitProvider,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { MiniApproval } from '../../Approval/components/MiniSignTx';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { GasAccountDepositButton } from './GasAccountDepositButton';

const amountList = [10, 100];

const Wrapper = styled.div`
  .input {
    font-weight: 500;
    font-size: 18px;
    border: none;
    border-radius: 4px;
    background: transparent;

    .ant-input {
      width: min-content;
      border-radius: 0;
      text-align: center;
      font-weight: 500;
      font-size: 18px;
    }
  }

  .warning {
    color: var(--r-red-default, #e34935);
    font-size: 13px;
    height: 16px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    position: relative;
    margin-top: 8px;
  }
`;

const TokenSelector = ({
  visible,
  onClose,
  cost,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  cost: number;
  onChange: (token: TokenItem) => void;
}) => {
  const { t } = useTranslation();

  const wallet = useWallet();
  const account = useCurrentAccount();
  const { value: list, loading } = useAsync(
    () => wallet.openapi.getGasAccountTokenList(account!.address),
    [account?.address]
  );

  const sortedList = React.useMemo(
    () => list?.sort((a, b) => b.amount - a.amount) || [],
    [list]
  );

  const Row = React.useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: TokenItem[];
      style: CSSProperties;
    }) => {
      const item = data[index];
      const disabled = new BigNumber(item.amount || 0).lt(cost);

      return (
        <Tooltip
          overlayClassName={clsx('rectangle')}
          placement="top"
          visible={disabled ? undefined : false}
          title={t('page.gasTopUp.InsufficientBalanceTips')}
          align={{ targetOffset: [0, -30] }}
        >
          <div
            key={item.id}
            style={style}
            className={clsx(
              'flex justify-between items-center cursor-pointer px-[20px] h-[52px] border border-transparent  rounded-[6px]',
              'text-13 font-medium text-r-neutral-title-1',
              !disabled && 'hover:border-rabby-blue-default',
              !disabled && 'hover:bg-r-blue-light-1',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => {
              if (!disabled) {
                onChange(item);
                onClose();
              }
            }}
          >
            <Space size={12}>
              <TokenWithChain token={item} hideConer />
              <span>{getTokenSymbol(item)}</span>
            </Space>
            <div>{formatUsdValue(item.amount * item.price || 0)}</div>
          </div>
        </Tooltip>
      );
    },
    [cost, onChange]
  );

  return (
    <Popup
      placement="right"
      width={'100%'}
      visible={visible}
      onClose={onClose}
      getContainer={false}
      bodyStyle={{
        padding: 0,
      }}
      contentWrapperStyle={{
        boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
        borderRadius: '16px 16px 0px 0',
        height: 500,
      }}
      closeIcon={<GasAccountCloseIcon />}
      closable
    >
      <div className="flex flex-col h-full pt-20">
        <div>
          <div className="relative flex justify-center items-center text-center">
            <div className="text-20 font-medium text-center text-r-neutral-title-1 ">
              {t('page.gasTopUp.Deposit-tip')}
            </div>
          </div>
          <div className="px-20">
            <div className="flex justify-between border-b-[0.5px] border-rabby-neutral-line text-12 text-r-neutral-body pt-[24px] pb-8">
              <div>{t('page.gasTopUp.Token')}</div>
              <div>{t('page.gasTopUp.Balance')}</div>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 relative">
          {!loading && sortedList?.length === 0 && (
            <Empty className="pt-[80px]">
              <div className="text-14 text-r-neutral-body mb-12">
                {t('page.gasTopUp.No_Tokens')}
              </div>
            </Empty>
          )}
          {loading && (
            <div className="flex flex-col items-center justify-center pt-[80px]">
              <SvgIconLoading
                className="animate-spin"
                fill="var(--r-blue-default, #7084ff)"
              />
              <div className="mt-12 text-r-neutral-title-1">
                {t('page.gasTopUp.Loading_Tokens')}
              </div>
            </div>
          )}

          {!loading && (
            <FixedSizeList
              width={'100%'}
              height={402}
              itemCount={sortedList?.length || 0}
              itemData={sortedList}
              itemSize={52}
            >
              {Row}
            </FixedSizeList>
          )}
        </div>
      </div>
    </Popup>
  );
};

const CUSTOM_AMOUNT = 0;

const GasAccountDepositContent = ({
  onClose,
  handleRefreshHistory,
}: {
  onClose: () => void;
  handleRefreshHistory: () => void;
}) => {
  const { t } = useTranslation();
  const [selectedAmount, setAmount] = useState(amountList[0]);
  const [tokenListVisible, setTokenListVisible] = useState(false);
  const [token, setToken] = useState<TokenItem | undefined>(undefined);
  const [formattedValue, setFormattedValue] = useState('');
  const [rawValue, setRawValue] = useState(0);

  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const [isPreparingSign, setIsPreparingSign] = useState(false);

  const isDirectSignAccount =
    currentAccount?.type === KEYRING_CLASS.PRIVATE_KEY ||
    currentAccount?.type === KEYRING_CLASS.MNEMONIC;

  const startDirectSigning = useStartDirectSigning();

  const depositAmount = useMemo(() => {
    if (selectedAmount === CUSTOM_AMOUNT && rawValue) {
      return rawValue;
    }
    return selectedAmount;
  }, [selectedAmount, rawValue]);

  const amountPass = useMemo(() => {
    if (selectedAmount === CUSTOM_AMOUNT) {
      return rawValue >= 1 && rawValue <= 500;
    }
    return true;
  }, [rawValue, selectedAmount]);

  const depositBtnDisabled = useMemo(() => {
    return !token || !amountPass || isPreparingSign;
  }, [token, amountPass, isPreparingSign]);

  const canUseDirectSubmitTx = useMemo(() => {
    if (!isDirectSignAccount || !token || !depositAmount) return false;

    const chainEnum = findChainByServerID(token.chain);
    if (!chainEnum) return false;

    return true;
  }, [isDirectSignAccount, token, depositAmount]);

  const [forceRefresh, refresh] = useState(0);
  const handleNoSignConfirm = async () => {
    setIsPreparingSign(true);
  };
  const topUpGasAccount = useCallback(() => {
    if (!token || !amountPass) return;
    const chainEnum = findChainByServerID(token.chain)!;
    wallet.topUpGasAccount({
      to: L2_DEPOSIT_ADDRESS_MAP[chainEnum.enum],
      chainServerId: chainEnum.serverId,
      tokenId: token.id,
      amount: Number(depositAmount),
      rawAmount: new BigNumber(depositAmount)
        .times(10 ** token.decimals)
        .toFixed(0),
    });
    window.close();
  }, [token?.chain, token?.id, amountPass, depositAmount]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/[^0-9]/g, '');

    // only integer and no string
    if (inputValue === '' || /^\d*$/.test(inputValue)) {
      // no only 0
      if (inputValue === '0') {
        inputValue = '';
      } else {
        inputValue = inputValue.replace(/^0+/, '') || ''; // remove 0
      }

      // add $ prefix
      if (inputValue && !inputValue.startsWith('$')) {
        inputValue = `$${inputValue}`;
      }

      setFormattedValue(inputValue);
      const numericValue = inputValue.replace(/[^0-9]/g, '');
      setRawValue(numericValue ? parseInt(numericValue, 10) : 0);
    }
  };

  const selectCustomAmount = () => {
    setAmount(CUSTOM_AMOUNT);
  };

  const handleNoSignResolve = async (txHash: string) => {
    try {
      if (!txHash || !token || !currentAccount) {
        console.error('Missing required data for rechargeGasAccount');
        return;
      }
      const gasAccountData = await wallet.getGasAccountSig();
      const { sig, accountId } = gasAccountData || {};

      if (!sig || !accountId) {
        console.error('Gas account not logged in');
        return;
      }
      const chainEnum = findChainByServerID(token.chain);
      if (!chainEnum) {
        console.error('Invalid chain');
        return;
      }
      const nonce = await wallet.getNonceByChain(
        currentAccount.address,
        chainEnum.id
      );

      if (typeof nonce !== 'number') {
        console.error('Failed to get nonce');
        return;
      }
      const depositAmountNumber = Number(depositAmount);
      await wallet.openapi.rechargeGasAccount({
        sig: sig,
        account_id: accountId,
        tx_id: txHash,
        chain_id: chainEnum.serverId,
        amount: depositAmountNumber,
        user_addr: currentAccount.address,
        nonce: nonce - 1,
      });
    } catch (error) {
      console.error('Failed to recharge gas account:', error);
    } finally {
      setTimeout(() => {
        refresh((e) => e + 1);
        handleRefreshHistory();
        onClose();
      }, 500);
    }
  };

  const errorTips = useMemo(() => {
    if (selectedAmount === CUSTOM_AMOUNT && rawValue && rawValue > 500) {
      return t('page.gasAccount.depositPopup.invalidAmount');
    }
  }, [rawValue, selectedAmount]);

  const openTokenList = () => {
    if (!amountPass) return;
    setTokenListVisible(true);
  };

  const { value: txs, loading } = useAsync(async () => {
    if (!token || !amountPass || !currentAccount || !isDirectSignAccount) {
      return [] as Tx[];
    }
    const chainEnum = findChainByServerID(token.chain)!;
    const rawAmount = new BigNumber(depositAmount)
      .times(10 ** token.decimals)
      .toFixed(0);
    const txs = await wallet.buildDepositTxs({
      to: L2_DEPOSIT_ADDRESS_MAP[chainEnum.enum],
      chainServerId: chainEnum.serverId,
      tokenId: token.id,
      rawAmount,
      account: currentAccount,
    });
    return txs as Tx[];
  }, [token, amountPass, currentAccount, depositAmount, forceRefresh]);

  const miniSignTxs = useMemo(() => (loading ? [] : txs), [loading, txs]);

  useEffect(() => {
    if (token && depositAmount && token.amount < depositAmount) {
      setToken(undefined);
    }
  }, [depositAmount]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center leading-normal">
      <div className="text-20 font-medium text-r-neutral-title1 mt-20 mb-[12px]">
        {t('page.gasAccount.depositPopup.title')}
      </div>
      <div className="text-center text-13 text-r-neutral-body px-20">
        {t('page.gasAccount.depositPopup.desc')}
      </div>

      <div className="w-full px-20">
        <div className="mt-12 mb-8 text-13 text-r-neutral-body">
          {t('page.gasAccount.depositPopup.amount')}
        </div>
        <Wrapper className="flex justify-between flex-col">
          <div className="flex items-center justify-between">
            {amountList.map((amount) => (
              <div
                key={amount}
                onClick={() => setAmount(amount)}
                className={clsx(
                  'flex items-center justify-center cursor-pointer',
                  'rounded-[6px] w-[114px] h-[52px]',
                  'text-18 font-medium',
                  'bg-r-neutral-card2',
                  'border border-solid border-transparent',
                  'hover:bg-r-blue-light-2 hover:border-rabby-blue-default',
                  selectedAmount === amount
                    ? 'bg-r-blue-light-1 border-rabby-blue-default text-r-blue-default'
                    : 'text-r-neutral-title1'
                )}
              >
                ${amount}
              </div>
            ))}
            <Input
              className={clsx(
                'flex items-center justify-center',
                'rounded-[6px] w-[114px] h-[52px]',
                'text-18 font-medium text-center',
                'border border-solid border-rabby-neutral-line',
                'hover:bg-r-blue-light-2 hover:border-rabby-blue-default',
                'input',
                selectedAmount === CUSTOM_AMOUNT
                  ? 'bg-r-blue-light-1 border-rabby-blue-default'
                  : 'text-r-neutral-title1'
              )}
              style={{
                '--r-neutral-card-2': 'transparent',
              }}
              bordered={false}
              value={formattedValue}
              onChange={onInputChange}
              onFocus={selectCustomAmount}
              placeholder="$1-500"
              // prefix={<div>$</div>}
            />
          </div>
          {<div className={clsx('warning')}>{errorTips || ''}</div>}
        </Wrapper>

        <div className="mt-12 mb-8 text-13 text-r-neutral-body">
          {t('page.gasAccount.depositPopup.token')}
        </div>
        <Item
          px={16}
          py={0}
          className={clsx(
            'rounded-[6px] w-full h-[52px]',
            !amountPass && 'opacity-50 cursor-not-allowed'
          )}
          bgColor="var(--r-neutral-card2, #F2F4F7)"
          left={
            token ? (
              <div className="flex items-center gap-12">
                <TokenWithChain
                  token={token}
                  hideConer
                  width="24px"
                  height="24px"
                />
                <span className="text-15 font-medium text-r-neutral-title1">
                  {getTokenSymbol(token)}
                </span>
              </div>
            ) : (
              <span className="text-15 font-medium text-r-neutral-title1">
                {t('page.gasAccount.depositPopup.selectToken')}
              </span>
            )
          }
          onClick={openTokenList}
        />
      </div>
      <div className="w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line flex items-center justify-center">
        <GasAccountDepositButton
          isPreparingSign={isPreparingSign}
          setIsPreparingSign={setIsPreparingSign}
          startDirectSigning={startDirectSigning}
          canUseDirectSubmitTx={canUseDirectSubmitTx}
          disabled={depositBtnDisabled}
          topUpOnSignPage={topUpGasAccount}
          topUpDirect={handleNoSignConfirm}
          isDirectSignAccount={isDirectSignAccount}
          chainServerId={token?.chain}
          miniSignTxs={miniSignTxs}
        />
      </div>

      <TokenSelector
        visible={tokenListVisible}
        onClose={() => setTokenListVisible(false)}
        cost={depositAmount}
        onChange={setToken}
      />
      <MiniApproval
        isPreparingSign={isPreparingSign}
        setIsPreparingSign={setIsPreparingSign}
        txs={miniSignTxs}
        onClose={() => {
          setIsPreparingSign(false);
          refresh((e) => e + 1);
        }}
        onReject={() => {
          refresh((e) => e + 1);
          setIsPreparingSign(false);
        }}
        onResolve={(tx) => {
          handleNoSignResolve(tx);
          refresh((e) => e + 1);
          setIsPreparingSign(false);
        }}
        onPreExecError={() => {
          setIsPreparingSign(false);
          topUpGasAccount();
          refresh((e) => e + 1);
        }}
        directSubmit
        // onGasAmountChange={setGasAmount}
        canUseDirectSubmitTx={canUseDirectSubmitTx}
      />
    </div>
  );
};

interface GasAccountDepositPopupProps extends PopupProps {
  handleRefreshHistory: () => void;
}

export const GasAccountDepositPopup = (props: GasAccountDepositPopupProps) => {
  return (
    <DirectSubmitProvider>
      <Popup
        placement="bottom"
        height={410}
        isSupportDarkMode
        bodyStyle={{
          padding: 0,
        }}
        closable
        destroyOnClose
        push={false}
        closeIcon={<GasAccountCloseIcon />}
        {...props}
      >
        <GasAccountDepositContent
          onClose={props.onCancel || props.onClose || noop}
          handleRefreshHistory={props.handleRefreshHistory}
        />
      </Popup>
    </DirectSubmitProvider>
  );
};
