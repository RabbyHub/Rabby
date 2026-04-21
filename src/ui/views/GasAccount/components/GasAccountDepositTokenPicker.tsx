import { Popup, TokenWithChain } from '@/ui/component';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils/number';
import { ellipsisAddress } from '@/ui/utils/address';
import { getTokenSymbol } from '@/ui/utils/token';
import { useAlias } from '@/ui/utils';
import { buildOwnerAccountMap } from './GasAccountDepositTokenForm.utils';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FixedSizeList } from 'react-window';
import type { CSSProperties } from 'react';
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

export const GasAccountDepositTokenPicker: React.FC<GasAccountDepositTokenPickerProps> = ({
  visible,
  onClose,
  onCancel,
  onSelect,
  availableTokens,
  isCheckingAvailability = false,
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

  const Row = React.useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: GasAccountAvailableToken[];
      style: CSSProperties;
    }) => {
      const item = data[index];
      const usdValue = getTokenUsdValue(item);
      const ownerAccount = ownerAccountMap.get(item.owner_addr.toLowerCase());

      return (
        <div style={style} className="pb-8">
          <div
            className={clsx(
              'flex w-full justify-between items-center h-[68px] px-16 rounded-[12px] text-left',
              'bg-r-neutral-card1 border border-solid border-transparent',
              'cursor-pointer hover:border-rabby-blue-default hover:bg-r-blue-light-1'
            )}
            onClick={() => {
              onSelect?.(item);
              handleClose?.();
            }}
          >
            <div className="flex items-center gap-12 min-w-0 flex-1">
              <TokenWithChain
                token={item}
                hideConer
                width="32px"
                height="32px"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center min-w-0">
                  <div className="text-15 font-medium text-r-neutral-title-1 truncate">
                    {getTokenSymbol(item)}
                  </div>
                </div>
                <GasAccountDepositTokenOwnerInfo
                  address={item.owner_addr}
                  account={ownerAccount}
                />
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
    },
    [handleClose, onSelect, ownerAccountMap]
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
            <FixedSizeList
              width="100%"
              height={listHeight}
              itemCount={availableTokens.length}
              itemData={availableTokens}
              itemSize={GAS_ACCOUNT_DEPOSIT_TOKEN_PICKER_ROW_HEIGHT}
              className="trades-container-no-scrollbar"
            >
              {Row}
            </FixedSizeList>
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
