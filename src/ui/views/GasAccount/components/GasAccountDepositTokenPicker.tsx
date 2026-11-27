import { Popup, TokenWithChain } from '@/ui/component';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';
import { ellipsisAddress } from '@/ui/utils/address';
import { getTokenSymbol } from '@/ui/utils/token';
import { useAlias } from '@/ui/utils';
import { buildOwnerAccountMap } from './GasAccountDepositTokenForm.utils';
import { DrawerProps, Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import {
  GasAccountAvailableToken,
  getTokenUsdValue,
} from '../hooks/useDepositTokenAvailability';
import IconNoFind from 'ui/assets/tokenDetail/IconNoFind.svg';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

interface GasAccountDepositTokenPickerProps {
  visible?: boolean;
  onClose?(): void;
  onCancel?(): void;
  onSelect?(token: GasAccountAvailableToken): void;
  availableTokens: GasAccountAvailableToken[];
  isCheckingAvailability?: boolean;
  getContainer?: DrawerProps['getContainer'];
}

const GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_HEIGHT = 540;
const GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_LIST_MAX_HEIGHT = 436;
const GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_ROW_HEIGHT = 76;

type GasAccountDepositTokenOwnerAccount = {
  address: string;
  brandName: string;
  type: string;
  alianName?: string;
};

type GasAccountDepositTokenPickerRowContext = {
  ownerAccountMap: Map<string, GasAccountDepositTokenOwnerAccount>;
  showOwnerInfo: boolean;
  onSelect?: GasAccountDepositTokenPickerProps['onSelect'];
  onClose?: GasAccountDepositTokenPickerProps['onClose'];
};

const GasAccountDepositTokenOwnerInfo = ({
  address,
  account,
}: {
  address: string;
  account?: GasAccountDepositTokenOwnerAccount;
}) => {
  const addressTypeIcon = useBrandIcon({
    address,
    brandName: account?.brandName || '',
    type: account?.type || '',
    forceLight: false,
  });
  const [alias] = useAlias(address);
  const displayName = account?.alianName || alias || ellipsisAddress(address);

  return (
    <div className="flex items-center gap-[4px] min-w-0 mt-[2px]">
      {addressTypeIcon ? (
        <img src={addressTypeIcon} className="w-[14px] h-[14px] shrink-0" />
      ) : null}
      <div className="text-12 font-normal leading-[14px] text-r-neutral-foot truncate">
        {displayName}
      </div>
    </div>
  );
};

const GasAccountDepositTokenPickerRow = ({
  item,
  context,
}: {
  item: GasAccountAvailableToken;
  context: GasAccountDepositTokenPickerRowContext;
}) => {
  const usdValue = getTokenUsdValue(item);
  const ownerAccount = context.ownerAccountMap.get(
    item.owner_addr.toLowerCase()
  );

  // h-[76px] is GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_ROW_HEIGHT (the list's
  // fixedItemHeight); the 8px gap is bottom padding below the 68px card.
  return (
    <div className="h-[76px] pb-8">
      <div
        className={clsx(
          'flex w-full justify-between items-center h-[68px] px-16 rounded-[12px] text-left',
          'bg-r-neutral-card1 border border-solid border-transparent',
          'cursor-pointer hover:border-rabby-blue-default hover:bg-r-blue-light-1'
        )}
        onClick={() => {
          context.onSelect?.(item);
          context.onClose?.();
        }}
      >
        <div className="flex items-center gap-12 min-w-0 flex-1">
          <TokenWithChain
            token={item}
            hideConer
            isShowChainTooltip
            width="32px"
            height="32px"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center min-w-0">
              <div className="text-15 font-medium text-r-neutral-title-1 truncate">
                {getTokenSymbol(item)}
              </div>
            </div>
            {context.showOwnerInfo ? (
              <GasAccountDepositTokenOwnerInfo
                address={item.owner_addr}
                account={ownerAccount}
              />
            ) : null}
          </div>
        </div>
        <div className="text-right ml-12 shrink-0">
          <div className="text-15 font-medium text-r-neutral-title-1">
            {formatUsdValue(usdValue)}
          </div>
          <div className="text-12 text-r-neutral-foot">
            {formatTokenAmount(item.amount || 0)}
          </div>
        </div>
      </div>
    </div>
  );
};

const getGasAccountDepositTokenPickerItemKey = (
  _index: number,
  token: GasAccountAvailableToken
) => `${token.owner_addr}:${token.chain}:${token.id}`;

const renderGasAccountDepositTokenPickerRow = (
  _index: number,
  item: GasAccountAvailableToken,
  context: GasAccountDepositTokenPickerRowContext
) => <GasAccountDepositTokenPickerRow item={item} context={context} />;

export const GasAccountDepositTokenPicker: React.FC<GasAccountDepositTokenPickerProps> = ({
  visible,
  onClose,
  onCancel,
  onSelect,
  availableTokens,
  isCheckingAvailability = false,
  getContainer,
}) => {
  const { t } = useTranslation();
  const { allSortedAccountList } = useAccounts();
  const handleClose = onClose || onCancel;
  const listHeight = Math.min(
    Math.max(
      availableTokens.length * GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_ROW_HEIGHT,
      GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_ROW_HEIGHT
    ),
    GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_LIST_MAX_HEIGHT
  );
  const ownerAccountMap = React.useMemo(
    () =>
      buildOwnerAccountMap(
        availableTokens,
        allSortedAccountList as GasAccountDepositTokenOwnerAccount[]
      ),
    [allSortedAccountList, availableTokens]
  );
  const showOwnerInfo = React.useMemo(() => {
    const ownerAddresses = new Set(
      availableTokens.map((token) => token.owner_addr.toLowerCase())
    );

    return ownerAddresses.size > 1;
  }, [availableTokens]);
  const rowContext = React.useMemo<GasAccountDepositTokenPickerRowContext>(
    () => ({
      ownerAccountMap,
      showOwnerInfo,
      onSelect,
      onClose: handleClose,
    }),
    [handleClose, onSelect, ownerAccountMap, showOwnerInfo]
  );

  return (
    <Popup
      visible={visible}
      onCancel={handleClose}
      height={GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_HEIGHT}
      isSupportDarkMode
      bodyStyle={{ padding: 0, height: '100%' }}
      closable={false}
      destroyOnClose
      push={false}
      keyboard={false}
      getContainer={getContainer}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="relative shrink-0 h-[56px]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px] font-medium text-r-neutral-title-1 text-center whitespace-nowrap">
            {t('page.gasAccount.depositPopup.selectToken')}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-20 top-1/2 -translate-y-1/2 flex items-center justify-center w-[20px] h-[20px]"
          >
            <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
          </button>
        </div>

        {isCheckingAvailability ? (
          <div className="overflow-y-auto flex-1 px-20 pt-12 pb-16">
            {new Array(6).fill(null).map((_, index) => (
              <div
                key={index}
                className="flex justify-between items-center h-[68px] px-16 rounded-[12px] bg-r-neutral-card1 mb-8"
              >
                <div className="flex items-center gap-12">
                  <Skeleton.Avatar active size={24} shape="circle" />
                  <div className="flex flex-col gap-6">
                    <Skeleton.Button
                      active
                      className="h-[14px] rounded-[8px]"
                      style={{ width: 80 }}
                    />
                    <Skeleton.Button
                      active
                      className="h-[12px] rounded-[8px]"
                      style={{ width: 110 }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-6">
                  <Skeleton.Button
                    active
                    className="h-[14px] rounded-[8px]"
                    style={{ width: 70 }}
                  />
                  <Skeleton.Button
                    active
                    className="h-[12px] rounded-[8px]"
                    style={{ width: 50 }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : availableTokens.length ? (
          <div className="flex-1 min-h-0 px-20 pt-12 pb-16">
            <div className="flex justify-between text-12 text-r-neutral-body px-4 pb-10">
              <div>
                {t('page.gasAccount.depositPopup.suggestedToken', {
                  defaultValue: 'Suggested token',
                })}
              </div>
              <div>{t('page.gasTopUp.Balance')}</div>
            </div>
            <Virtuoso
              style={{ height: listHeight, width: '100%' }}
              className="trades-container-no-scrollbar"
              data={availableTokens}
              context={rowContext}
              computeItemKey={getGasAccountDepositTokenPickerItemKey}
              fixedItemHeight={GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_ROW_HEIGHT}
              itemContent={renderGasAccountDepositTokenPickerRow}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-8">
              <img src={IconNoFind} className="w-[28px] h-[28px]" />
              <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-center">
                {t('page.gasAccount.depositPopup.noAvailableToken', {
                  defaultValue: 'No available token',
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
};
