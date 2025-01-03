import React, { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Empty, Item, Popup, TokenWithChain } from '@/ui/component';
import { Button, Space, Tooltip } from 'antd';
import { PopupProps } from '@/ui/component/Popup';
import { SvgIconLoading } from 'ui/assets';
import { FixedSizeList } from 'react-window';
import styled from 'styled-components';
import { noop } from 'lodash';
import clsx from 'clsx';
import { useAsync } from 'react-use';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChainByServerID } from '@/utils/chain';
import { L2_DEPOSIT_ADDRESS_MAP } from '@/constant/gas-account';
import { GasAccountCloseIcon } from './PopupCloseIcon';
import { Input } from 'antd';

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
              !disabled && 'hover:border-blue-light',
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
              {t('page.gasTopUp.Select-from-supported-tokens')}
            </div>
          </div>
          <div className="px-20">
            <div className="flex justify-between border-b-[0.5px] border-rabby-neutral-line text-12 text-r-neutral-body pt-[24px] pb-8">
              <div>{t('page.gasTopUp.Token')}</div>
              <div>{t('page.gasTopUp.Value')}</div>
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

const GasAccountDepositContent = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const [selectedAmount, setAmount] = useState(amountList[0]);
  const [tokenListVisible, setTokenListVisible] = useState(false);
  const [token, setToken] = useState<TokenItem | undefined>(undefined);
  const [formattedValue, setFormattedValue] = useState('');
  const [rawValue, setRawValue] = useState(0);

  const wallet = useWallet();

  const depositAmount = useMemo(() => {
    if (selectedAmount === CUSTOM_AMOUNT && rawValue) {
      return rawValue;
    }
    return selectedAmount;
  }, [selectedAmount, rawValue]);

  const topUpGasAccount = () => {
    if (token) {
      const chainEnum = findChainByServerID(token.chain)!;
      wallet.topUpGasAccount({
        to: L2_DEPOSIT_ADDRESS_MAP[chainEnum.enum],
        chainServerId: chainEnum.serverId,
        tokenId: token.id,
        amount: depositAmount,
        rawAmount: new BigNumber(depositAmount)
          .times(10 ** token.decimals)
          .toFixed(0),
      });
      window.close();
    }
  };

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

  const errorTips = useMemo(() => {
    if (selectedAmount === CUSTOM_AMOUNT && rawValue && rawValue > 500) {
      return t('page.gasAccount.depositPopup.invalidAmount');
    }
  }, [rawValue, selectedAmount]);

  const amountPass = useMemo(() => {
    if (selectedAmount === CUSTOM_AMOUNT) {
      return rawValue >= 1 && rawValue <= 500;
    }
    return true;
  }, [rawValue, selectedAmount]);

  const openTokenList = () => {
    if (!amountPass) return;
    setTokenListVisible(true);
  };

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
                  'hover:bg-r-blue-light-1 hover:border-rabby-blue-default',
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
                'border border-solid border-transparent',
                'hover:bg-r-blue-light-1 hover:border-rabby-blue-default',
                'bg-r-neutral-card2',
                'input',
                selectedAmount === CUSTOM_AMOUNT
                  ? 'bg-r-blue-light-1 border-rabby-blue-default'
                  : 'text-r-neutral-title1'
              )}
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
        <Button
          onClick={topUpGasAccount}
          block
          size="large"
          type="primary"
          className="h-[48px] text-r-neutral-title2 text-15 font-medium"
          disabled={!token || !amountPass}
        >
          {t('global.Confirm')}
        </Button>
      </div>

      <TokenSelector
        visible={tokenListVisible}
        onClose={() => setTokenListVisible(false)}
        cost={depositAmount}
        onChange={setToken}
      />
    </div>
  );
};

export const GasAccountDepositPopup = (props: PopupProps) => {
  return (
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
      />
    </Popup>
  );
};
