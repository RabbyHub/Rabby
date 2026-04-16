import { Spin, message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { RcIconArrowRightCC, RcIconJumpCC } from '@/ui/assets/dashboard';
import { RcIconCopy1CC } from '@/ui/assets/desktop/common';
import ChainIcon from '@/ui/component/ChainIcon';
import { ellipsisAddress } from '@/ui/utils/address';
import { findChainByEnum } from '@/utils/chain';
import clsx from 'clsx';
import { EIP7702Delegated } from '../../DesktopProfile/components/ApprovalsTabPane/useEIP7702Approvals';
import { CheckboxV2 } from '../../DesktopSmallSwap/components/Checkbox';
import { EIP7702_REVOKE_SUPPORTED_CHAINS } from '../hooks/useEIP7702Approvals';
import { EIP7702SupportedChainsPopup } from './EIP7702SupportedChainsPopup';
import { EmptyState } from './EmptyState';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';

type EIP7702PanelProps = {
  isLoading: boolean;
  rows: EIP7702Delegated[];
  selectedRows: EIP7702Delegated[];
  setSelectedRows: React.Dispatch<React.SetStateAction<EIP7702Delegated[]>>;
  searchKw: string;
  onOpenAddress: (chainServerId: string | undefined, address: string) => void;
};

export const EIP7702Panel: React.FC<EIP7702PanelProps> = ({
  isLoading,
  rows,
  selectedRows,
  setSelectedRows,
  searchKw,
  onOpenAddress,
}) => {
  const { t } = useTranslation();
  const [supportedChainsOpen, setSupportedChainsOpen] = React.useState(false);

  const currentAccount = useCurrentAccount();

  const isAllowed = React.useMemo(() => {
    return (
      !!currentAccount?.type &&
      ([
        KEYRING_TYPE.HdKeyring,
        KEYRING_TYPE.SimpleKeyring,
      ] as string[]).includes(currentAccount?.type || '')
    );
  }, [currentAccount?.type]);

  const toggleSelected = React.useCallback(
    (item: EIP7702Delegated) => {
      setSelectedRows((previous) => {
        const exists = previous.some(
          (row) =>
            row.chain === item.chain &&
            row.delegatedAddress === item.delegatedAddress
        );
        return exists
          ? previous.filter(
              (row) =>
                !(
                  row.chain === item.chain &&
                  row.delegatedAddress === item.delegatedAddress
                )
            )
          : [...previous, item];
      });
    },
    [setSelectedRows]
  );

  return (
    <>
      <div>
        {!isAllowed ? (
          <div
            className={clsx(
              'border-[0.5px] border-rabby-orange-default rounded-[8px]',
              'flex items-start gap-[4px] p-[12px] mb-[16px]',
              'bg-r-orange-light'
            )}
          >
            <RcIconWarningCC className="flex-shrink-0 text-r-orange-default" />
            <div>
              <div className="text-[13px] leading-[16px] font-medium text-r-orange-default">
                Unsupported Address Type
              </div>
              <div className="text-[12px] leading-[14px] text-r-orange-default mt-[4px]">
                Revoking EIP-7702 delegations is only supported for private key
                or seed phrase addresses
              </div>
            </div>
          </div>
        ) : null}
        <div
          className={clsx(
            'flex items-center justify-between mb-[16px]',
            'p-[12px] bg-r-neutral-card-1 rounded-[8px]'
          )}
        >
          <div className="text-[12px] leading-[14px] text-r-neutral-foot">
            Supported Chains
          </div>
          <button
            type="button"
            onClick={() => setSupportedChainsOpen(true)}
            className="flex items-center gap-[6px] border-none bg-transparent text-r-neutral-foot"
          >
            <div className={clsx('flex items-center mr-[-12px]')}>
              {EIP7702_REVOKE_SUPPORTED_CHAINS.slice(0, 3).map((chain, idx) => {
                return (
                  <div
                    className={clsx('relative')}
                    key={chain}
                    style={{
                      left: 0 - idx * 4,
                    }}
                  >
                    <ChainIcon
                      chain={chain}
                      key={chain}
                      tooltipProps={{
                        visible: false,
                      }}
                      innerClassName="w-[18px] h-[18px]"
                    />
                  </div>
                );
              })}
            </div>
            <RcIconArrowRightCC />
          </button>
        </div>
        <div className="text-[13px] leading-[16px] text-r-neutral-foot mb-[8px]">
          Delegated Address
        </div>
        <div className="flex flex-col gap-[8px]">
          {isLoading ? (
            <div className="py-[48px] text-center">
              <Spin />
            </div>
          ) : rows.length ? (
            rows.map((item) => {
              const chain = findChainByEnum(item.chain);
              const checked = selectedRows.some(
                (row) =>
                  row.chain === item.chain &&
                  row.delegatedAddress === item.delegatedAddress
              );

              return (
                <div
                  key={`${item.chain}-${item.delegatedAddress}`}
                  onClick={() => toggleSelected(item)}
                  className={clsx(
                    'flex px-[11px] py-[13px] cursor-pointer items-center gap-[12px] rounded-[8px]',
                    'border-solid border-[1px]  hover:border-rabby-blue-default',
                    checked
                      ? 'bg-r-blue-light1 border-rabby-blue-default'
                      : 'bg-r-neutral-card1 border-transparent',
                    isAllowed
                      ? ''
                      : 'cursor-not-allowed opacity-50 pointer-events-none'
                  )}
                >
                  <CheckboxV2 checked={checked} />
                  <div className="flex items-center gap-[8px]">
                    <img
                      src={chain?.logo}
                      className="w-[28px] h-[28px] flex-shrink-0"
                    />
                    <div className="text-[15px] leading-[18px] font-medium text-r-neutral-title1">
                      {ellipsisAddress(item.delegatedAddress).toLowerCase()}
                    </div>
                    <button
                      type="button"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await navigator.clipboard.writeText(
                          item.delegatedAddress
                        );
                        message.success(t('global.copied'));
                      }}
                      className="border-none bg-transparent text-r-neutral-foot"
                    >
                      <RcIconCopy1CC />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenAddress(chain?.serverId, item.delegatedAddress);
                      }}
                      className="border-none bg-transparent text-r-neutral-foot"
                    >
                      <RcIconJumpCC
                        viewBox="0 0 16 16"
                        className="w-[14px] h-[14px]"
                      />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState text={searchKw ? 'Not Matched' : 'No approvals'} />
          )}
        </div>
      </div>
      <EIP7702SupportedChainsPopup
        visible={supportedChainsOpen}
        onCancel={() => setSupportedChainsOpen(false)}
      />
    </>
  );
};
