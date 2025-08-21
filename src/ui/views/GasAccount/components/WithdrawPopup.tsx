import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup, Item, Empty } from '@/ui/component';
import { Button, message, Skeleton, Tooltip } from 'antd';
import { PopupProps } from '@/ui/component/Popup';
import { noop } from 'lodash';
import { FixedSizeList } from 'react-window';
import clsx from 'clsx';
import { useGasAccountRefresh, useGasAccountSign } from '../hooks';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { ReactComponent as RcIconHelp } from 'ui/assets/tokenDetail/IconHelp.svg';

import { formatUsdValue, useAlias, useWallet } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';
import { GasAccountCloseIcon } from './PopupCloseIcon';
import { findChainByServerID } from '@/utils/chain';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { CSSProperties } from 'styled-components';
import styled from 'styled-components';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import {
  GasAccountInfo,
  RechargeChainItem,
  WithdrawListAddressItem,
} from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';
import IconArrowRight from 'ui/assets/dashboard/settings/icon-right-arrow.svg';

enum SelectorStatus {
  Hidden,
  Address,
  Chain,
}

const WrapperDiv = styled.div`
  .ant-btn-primary {
    height: 48px;
  }
`;

const AddressRightAreaInItem = ({
  account,
}: {
  account?: {
    address: string;
    type: string;
    brandName: string;
  };
}) => {
  const [alias] = useAlias(account?.address || '');

  const addressTypeIcon = useBrandIcon({
    address: account?.address || '',
    brandName: account?.brandName || '',
    type: account?.type || '',
  });

  return (
    <div className={clsx('flex items-center gap-[6px] ', ['rounded-[2px]'])}>
      <img src={addressTypeIcon} className="w-18 h-18" />
      <div className="flex flex-col overflow-hidden">
        <span className="text-14 font-medium text-r-neutral-title-1 truncate">
          {alias}
        </span>
      </div>
    </div>
  );
};

const Selector = ({
  accountsList,
  status,
  onClose,
  selectAddressChainList,
  setChain,
  setSelectAddressChainList,
  withdrawList,
}: {
  accountsList: IDisplayedAccountWithBalance[];
  status: SelectorStatus;
  onClose: () => void;
  selectAddressChainList?: WithdrawListAddressItem;
  setChain: (chain: RechargeChainItem) => void;
  setSelectAddressChainList: (item: WithdrawListAddressItem) => void;
  withdrawList: WithdrawListAddressItem[];
}) => {
  const { t } = useTranslation();

  const isSelectChain = useMemo(() => status === SelectorStatus.Chain, [
    status,
  ]);

  const sortedList = useMemo(
    () =>
      isSelectChain
        ? selectAddressChainList?.recharge_chain_list?.sort(
            (a, b) => b.withdraw_limit - a.withdraw_limit
          ) || []
        : withdrawList,
    [selectAddressChainList, withdrawList, isSelectChain]
  );

  const ChainRow = React.useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: RechargeChainItem[];
      style: CSSProperties;
    }) => {
      const item = data[index];
      const chainEnum = findChainByServerID(item.chain_id)!;
      const disabled = !item.withdraw_limit;

      return (
        <div
          className={clsx('w-full h-[68px] flex items-center justify-between')}
        >
          <Item
            key={item.chain_id}
            style={style}
            px={16}
            py={0}
            className={clsx(
              'rounded-[6px] w-full h-[56px] px-16',
              'justify-between',
              !disabled && 'hover:border-blue-light',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            bgColor="var(--r-neutral-card2, #F2F4F7)"
            left={
              <div
                className={clsx('flex items-center gap-[6px] ', [
                  'rounded-[2px]',
                ])}
              >
                <img
                  src={chainEnum.logo}
                  className="w-[20px] h-[20px] rounded-full"
                />
                <span className="text-r-neutral-title-1 text-[14px] leading-[17px] font-medium">
                  {chainEnum.name}
                </span>
              </div>
            }
            right={
              <span className="text-r-neutral-title-1 text-[14px] leading-[17px] font-medium">
                {formatUsdValue(item.withdraw_limit, BigNumber.ROUND_DOWN)}
              </span>
            }
            onClick={() => {
              if (!disabled) {
                setChain(item);
                onClose();
              }
            }}
          />
        </div>
      );
    },
    [isSelectChain]
  );

  const AddressRow = React.useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: WithdrawListAddressItem[];
      style: CSSProperties;
    }) => {
      const item = data[index];
      const disabled = !item.total_withdraw_limit;
      const account = accountsList.find(
        (i) => i.address === item.recharge_addr
      );

      return (
        <div
          className={clsx('w-full h-[68px] flex items-center justify-between')}
        >
          <Item
            key={item.recharge_addr}
            style={style}
            px={16}
            py={0}
            className={clsx(
              'rounded-[6px] w-full h-[56px] px-16 mb-12',
              'justify-between',
              !disabled && 'hover:border-blue-light',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            bgColor="var(--r-neutral-card2, #F2F4F7)"
            left={<AddressRightAreaInItem account={account} />}
            right={
              <span className="text-r-neutral-body text-[14px] leading-[17px] font-medium">
                {formatUsdValue(
                  item.total_withdraw_limit,
                  BigNumber.ROUND_DOWN
                )}
              </span>
            }
            onClick={() => {
              if (!disabled) {
                setSelectAddressChainList(item);
                onClose();
              }
            }}
          />
        </div>
      );
    },
    [isSelectChain, accountsList]
  );

  return (
    <Popup
      placement="right"
      width={'100%'}
      visible={
        status === SelectorStatus.Chain || status === SelectorStatus.Address
      }
      onClose={onClose}
      getContainer={false}
      bodyStyle={{
        padding: 0,
      }}
      contentWrapperStyle={{
        boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
        borderRadius: '16px 16px 0px 0',
        height: 440,
      }}
      closeIcon={<GasAccountCloseIcon />}
      closable
    >
      <div className="flex flex-col h-full pt-20">
        <div>
          <div className="relative flex justify-center items-center text-center">
            <div className="text-20 font-medium text-center text-r-neutral-title-1 ">
              {isSelectChain
                ? t('page.gasAccount.withdrawPopup.selectDestinationChain')
                : t('page.gasAccount.withdrawPopup.selectRecipientAddress')}
            </div>
          </div>
          <div className="px-20">
            <div className="flex justify-between text-14 text-r-neutral-body pt-[24px] pb-8">
              <div>
                {isSelectChain
                  ? t('page.gasAccount.withdrawPopup.destinationChain')
                  : t('page.gasAccount.withdrawPopup.recipientAddress')}
              </div>
              <div className="flex items-center flex-row gap-4">
                {t('page.gasAccount.withdrawPopup.withdrawalLimit')}
                <Tooltip
                  overlayClassName={clsx('rectangle')}
                  placement="topLeft"
                  title={
                    isSelectChain
                      ? t('page.gasAccount.withdrawPopup.riskMessageFromChain')
                      : t(
                          'page.gasAccount.withdrawPopup.riskMessageFromAddress'
                        )
                  }
                  align={{ targetOffset: [0, 0] }}
                >
                  <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 relative px-20">
          {!sortedList?.length ? null : isSelectChain ? (
            <FixedSizeList<RechargeChainItem[]>
              width={'100%'}
              height={328}
              itemCount={sortedList?.length || 0}
              itemData={sortedList as RechargeChainItem[]}
              itemSize={68}
            >
              {ChainRow}
            </FixedSizeList>
          ) : (
            <FixedSizeList<WithdrawListAddressItem[]>
              width={'100%'}
              height={328}
              itemCount={sortedList?.length || 0}
              itemData={sortedList as WithdrawListAddressItem[]}
              itemSize={68}
            >
              {AddressRow}
            </FixedSizeList>
          )}
          {!sortedList?.length && (
            <Empty
              className="mt-[75px]"
              title={
                <span className="text-14 text-r-neutral-foot text-center">
                  {isSelectChain
                    ? t('page.gasAccount.withdrawPopup.noEligibleChain')
                    : t('page.gasAccount.withdrawPopup.noEligibleAddr')}
                </span>
              }
            />
          )}
        </div>
      </div>
    </Popup>
  );
};

const WithdrawContent = ({
  balance,
  onClose,
  handleRefreshHistory,
  gasAccountInfo,
}: {
  balance: number;
  handleRefreshHistory: () => void;
  onClose: () => void;
  gasAccountInfo?: GasAccountInfo;
}) => {
  const { t } = useTranslation();
  const [selectorStatus, setSelectorStatus] = useState<SelectorStatus>(
    SelectorStatus.Hidden
  );
  const [chain, setChain] = useState<RechargeChainItem>();
  const [
    selectAddressChainList,
    setSelectAddressChainList,
  ] = useState<WithdrawListAddressItem>();
  const { sig, accountId } = useGasAccountSign();
  const wallet = useWallet();

  const account = useCurrentAccount();
  const [btnLoading, setBtnLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [withdrawList, setWithdrawList] = useState<WithdrawListAddressItem[]>();
  const { refresh } = useGasAccountRefresh();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await wallet.openapi.getWithdrawList({
        sig: sig!,
        id: accountId!,
      });
      if (res) {
        const data = res
          ?.filter((item) => {
            const { recharge_addr } = item;
            const idx = accountsList.findIndex(
              (i) => i.address === recharge_addr
            );
            return idx > -1;
          })
          .sort((a, b) => b.total_withdraw_limit - a.total_withdraw_limit);

        setWithdrawList(data);
        setSelectAddressChainList(data[0]);
      }
    } catch (e) {
      console.error(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sig && accountId) {
      fetchData();
    }
  }, [sig, accountId]);

  const { accountsList } = useRabbySelector((s) => ({
    ...s.accountToDisplay,
  }));

  const withdraw = async () => {
    if (
      !gasAccountInfo?.withdrawable_balance ||
      gasAccountInfo.withdrawable_balance <= 0 ||
      !selectAddressChainList ||
      !chain
    ) {
      return;
    }

    try {
      setBtnLoading(true);
      const chainWithdrawLimit =
        selectAddressChainList.recharge_chain_list?.find(
          (item) => item.chain_id === chain.chain_id
        )?.withdraw_limit || 0;

      const amount = Math.min(
        gasAccountInfo.withdrawable_balance,
        chainWithdrawLimit
      );

      const res: any = await wallet.openapi.withdrawGasAccount({
        sig: sig!,
        account_id: accountId!,
        amount,
        user_addr: selectAddressChainList.recharge_addr,
        fee: chain.withdraw_fee,
        chain_id: chain.chain_id,
      });
      if (!res.success) {
        throw new Error(res?.msg || 'withdraw failed');
      }
      refresh();
      handleRefreshHistory();
      onClose();
    } catch (error) {
      message.error(error?.message || String(error));
      console.error(error?.message || String(error));
    } finally {
      setBtnLoading(false);
    }
  };

  const chainInfo = React.useMemo(() => {
    return chain ? findChainByServerID(chain!.chain_id) : undefined;
  }, [chain]);

  const openChainList = () => {
    if (loading) {
      return;
    }
    setSelectorStatus(SelectorStatus.Chain);
  };

  const openAddreesList = () => {
    if (loading) {
      return;
    }
    setSelectorStatus(SelectorStatus.Address);
  };

  const BalanceSuffix = useMemo(() => {
    if (
      !chain ||
      !gasAccountInfo?.withdrawable_balance ||
      gasAccountInfo.withdrawable_balance <= 0
    ) {
      return '';
    } else {
      const chainWithdrawLimit =
        selectAddressChainList?.recharge_chain_list?.find(
          (item) => item.chain_id === chain.chain_id
        )?.withdraw_limit || 0;

      const actualWithdrawableAmount = Math.min(
        gasAccountInfo.withdrawable_balance,
        chainWithdrawLimit
      );
      const usdValue = formatUsdValue(
        actualWithdrawableAmount,
        BigNumber.ROUND_DOWN
      );
      return `${usdValue}`;
    }
  }, [chain, gasAccountInfo?.withdrawable_balance, selectAddressChainList]);

  const withdrawLimitTooLowToCoverFee = useMemo(() => {
    if (!chain || !selectAddressChainList) return false;
    const chainWithdrawLimit =
      selectAddressChainList?.recharge_chain_list?.find(
        (item) => item.chain_id === chain.chain_id
      )?.withdraw_limit || 0;
    return chainWithdrawLimit <= (chain?.withdraw_fee || 0);
  }, [chain, selectAddressChainList]);
  const selectedAccount = useMemo(() => {
    return accountsList.find(
      (i) => i.address === selectAddressChainList?.recharge_addr
    );
  }, [selectAddressChainList, accountsList]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="text-20 font-medium text-r-neutral-title1 mt-20 mb-[12px]">
        {t('page.gasAccount.withdrawPopup.title')}
      </div>
      <div className="text-13 text-r-neutral-body text-center flex gap-4 items-center justify-center mb-20">
        {t('page.gasAccount.withdrawPopup.withdrawalTip', {
          amount: formatUsdValue(
            gasAccountInfo?.withdrawable_balance || 0,
            BigNumber.ROUND_DOWN
          ),
        })}
        {gasAccountInfo?.non_withdrawable_balance &&
        gasAccountInfo.non_withdrawable_balance > 0 ? (
          <Tooltip
            overlayClassName={clsx('rectangle')}
            placement="topLeft"
            title={
              <span>
                {formatUsdValue(
                  gasAccountInfo.non_withdrawable_balance,
                  BigNumber.ROUND_DOWN
                )}{' '}
                of your gas balance is non-withdrawable:
                <br />
                1. Apple Pay / Google Pay
                <br />
                2. Gas Rewards
              </span>
            }
            align={{ targetOffset: [12, 0] }}
          >
            <RcIconHelp className="text-rabby-neutral-foot w-14 h-14" />
          </Tooltip>
        ) : null}
      </div>

      <div className="w-full px-20 py-10">
        <Item
          px={16}
          py={0}
          className="rounded-[6px] w-full h-[52px] mt-12 flex justify-between"
          bgColor="var(--r-neutral-card2, #F2F4F7)"
          left={
            <span className="text-14 text-r-neutral-body">
              {t('page.gasAccount.withdrawPopup.recipientAddress')}
            </span>
          }
          right={
            <div className="flex items-center gap-8">
              {loading ? (
                <div
                  className={clsx('flex items-center gap-[6px] ', [
                    'rounded-[2px]',
                  ])}
                >
                  <Skeleton.Avatar
                    className="rounded-[12px] w-[24px] h-[24px]"
                    active
                  />
                  <div className="flex flex-col overflow-hidden gap-[6px]">
                    <Skeleton.Input
                      className="rounded w-[89px] h-[16px]"
                      active
                    />
                  </div>
                </div>
              ) : selectedAccount ? (
                <AddressRightAreaInItem account={selectedAccount} />
              ) : (
                <span className="text-14 font-medium text-r-neutral-title1">
                  {t('page.gasAccount.withdrawPopup.selectAddr')}
                </span>
              )}
              <img src={IconArrowRight} alt="" />
            </div>
          }
          hoverBorder={!loading}
          onClick={openAddreesList}
        />
        <Item
          px={16}
          py={0}
          className="rounded-[6px] w-full h-[52px] mt-12 flex justify-between"
          bgColor="var(--r-neutral-card2, #F2F4F7)"
          hoverBorder={!loading}
          left={
            <span className="text-14 text-r-neutral-body">
              {t('page.gasAccount.withdrawPopup.destinationChain')}
            </span>
          }
          right={
            <div className="flex items-center gap-8">
              {loading ? (
                <div
                  className={clsx('flex items-center gap-[6px] ', [
                    'rounded-[2px]',
                  ])}
                >
                  <Skeleton.Avatar
                    className="rounded-[12px] w-[24px] h-[24px]"
                    active
                  />
                  <div className="flex flex-col overflow-hidden gap-[6px]">
                    <Skeleton.Input
                      className="rounded w-[89px] h-[16px]"
                      active
                    />
                  </div>
                </div>
              ) : chainInfo ? (
                <div
                  className={clsx('flex items-center gap-[6px] ', [
                    'rounded-[2px]',
                  ])}
                >
                  <img
                    src={chainInfo?.logo}
                    className="w-[18px] h-[18px] rounded-full"
                  />
                  <span className="text-r-neutral-body text-[14px] leading-[17px] font-medium">
                    {chainInfo?.name}
                  </span>
                </div>
              ) : (
                <span className="text-14 font-medium text-r-neutral-title1">
                  {t('page.gasAccount.withdrawPopup.selectChain')}
                </span>
              )}
              <img src={IconArrowRight} alt="" />
            </div>
          }
          onClick={openChainList}
        />
      </div>

      <WrapperDiv
        className={clsx(
          'flex items-center justify-center gap-10',
          'w-full mt-24 px-20 py-14 border-t-[0.5px] border-solid border-rabby-neutral-line flex-col'
        )}
      >
        {Boolean(BalanceSuffix) && (
          <div className="flex items-center justify-center flex-row font-medium text-center text-rabby-neutral-foot text-12">
            <RcIconInfo className="text-rabby-neutral-foot w-14 h-14 mr-4" />
            {t('page.gasAccount.withdrawPopup.deductGasFees')}
            {` ~$${chain?.withdraw_fee.toFixed(2)}`}
          </div>
        )}
        <Tooltip
          overlayClassName={clsx('rectangle')}
          placement="top"
          title={
            withdrawLimitTooLowToCoverFee
              ? t('page.gasAccount.withdrawPopup.amountTooLowCoverFee')
              : undefined
          }
          align={{ targetOffset: [0, 0] }}
        >
          <Button
            type="primary"
            className={clsx(
              'h-[48px] text-14 font-medium text-r-neutral-title-2'
            )}
            onClick={withdraw}
            block
            size="large"
            disabled={
              !chain ||
              !gasAccountInfo?.withdrawable_balance ||
              withdrawLimitTooLowToCoverFee
            }
            loading={btnLoading}
          >
            {t('page.gasAccount.withdrawPopup.title')}
            {` ${BalanceSuffix}`}
          </Button>
        </Tooltip>
      </WrapperDiv>
      {
        <Selector
          accountsList={accountsList}
          status={selectorStatus}
          onClose={() => setSelectorStatus(SelectorStatus.Hidden)}
          selectAddressChainList={selectAddressChainList}
          setChain={setChain}
          setSelectAddressChainList={setSelectAddressChainList}
          withdrawList={withdrawList || []}
        />
      }
    </div>
  );
};

export const WithdrawPopup = (
  props: PopupProps & {
    balance: number;
    handleRefreshHistory: () => void;
    gasAccountInfo?: GasAccountInfo;
  }
) => {
  const {
    balance,
    handleRefreshHistory,
    gasAccountInfo,
    ...popupProps
  } = props;

  return (
    <>
      <Popup
        placement="bottom"
        height={'min-content'}
        isSupportDarkMode
        bodyStyle={{
          padding: 0,
        }}
        closable
        destroyOnClose
        push={false}
        closeIcon={<GasAccountCloseIcon />}
        {...popupProps}
      >
        <WithdrawContent
          onClose={props.onCancel || props.onClose || noop}
          balance={balance}
          handleRefreshHistory={handleRefreshHistory}
          gasAccountInfo={gasAccountInfo}
        />
      </Popup>
    </>
  );
};
