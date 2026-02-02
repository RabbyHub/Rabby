import React from 'react';
import { EVENTS, KEYRING_TYPE } from '@/constant';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import { findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';

import PQueue from 'p-queue';
import { useMemo, useRef, useState } from 'react';
import { useAsyncRetry } from 'react-use';
import { VariableSizeGrid } from 'react-window';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import eventBus from '@/eventBus';

export const EIP7702_REVOKE_SUPPORTED_CHAINS = [
  CHAINS_ENUM.ETH,
  CHAINS_ENUM.BSC,
  CHAINS_ENUM.OP,
  CHAINS_ENUM.BASE,
  CHAINS_ENUM.ARBITRUM,
  CHAINS_ENUM.SCRL,
  'BERA' as CHAINS_ENUM,
  'UNI' as CHAINS_ENUM,
  'INK' as CHAINS_ENUM,
] as CHAINS_ENUM[];

const supportedAccountType = [
  KEYRING_TYPE.SimpleKeyring,
  KEYRING_TYPE.HdKeyring,
];

export type EIP7702Delegated = {
  chain: CHAINS_ENUM;
  delegatedAddress: string;
  address: string;
  alias: string;
  list: EIP7702Delegated[];
};

async function checkEIP7702Delegation(
  address: string,
  chains: CHAINS_ENUM[],
  requestETHRpc: ReturnType<typeof useWallet>['requestETHRpc'],
  concurrency: number = 10
): Promise<({ delegatedAddress: string; chain: CHAINS_ENUM } | undefined)[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error('Invalid Ethereum address');
  }

  const queue = new PQueue({ concurrency });

  const tasks = chains
    .filter((chain) => {
      const chainInfo = findChainByEnum(chain);
      return !!chainInfo;
    })
    .map((chain) => async () => {
      const chainInfo = findChainByEnum(chain)!;

      try {
        const code = await requestETHRpc<string>(
          {
            method: 'eth_getCode',
            params: [address, 'latest'],
          },
          chainInfo!.serverId
        );

        if (!code || code === '0x') {
          console.log(
            `[${chainInfo.name}] No delegate code found for address ${address}. Likely a plain EOA.`
          );
          return;
        }

        if (code.startsWith('0xef0100')) {
          const delegatedAddress = '0x' + code.slice(8);
          console.log(
            `[${chainInfo.name}] EIP-7702 delegation detected! Delegate address: ${delegatedAddress}`
          );

          return {
            delegatedAddress,
            chain: chainInfo.enum,
          };
        }
        return;
      } catch (error) {
        console.error(
          `[${chainInfo.name}] Error querying address:`,
          (error as Error).message
        );
        return;
      }
    });

  return await queue.addAll(tasks);
}

export const useEIP7702ApprovalsQuery = ({
  isActive,
  chain,
}: {
  isActive: boolean;
  chain?: CHAINS_ENUM;
}) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const { address: accountAddress } = currentAccount || {};

  const [searchEIP7702Kw, setSearchEIP7702Kw] = useState('');

  const wallet = useWallet();

  const [selectedRows, setSelectedRows] = useState<EIP7702Delegated[]>([]);

  const vGridRefEIP7702 = useRef<VariableSizeGrid>(null);

  const { value, loading, error, retry } = useAsyncRetry(async () => {
    if (!accountAddress || !wallet.requestETHRpc) {
      return [];
    }
    return await checkEIP7702Delegation(
      accountAddress,
      EIP7702_REVOKE_SUPPORTED_CHAINS,
      wallet.requestETHRpc
    );
  }, [accountAddress]);

  const delegationAddresses = useMemo(
    () =>
      (error ? [] : value || [])
        ?.filter(
          (item) =>
            !!item &&
            (chain ? item.chain === chain : true) &&
            (searchEIP7702Kw?.trim()
              ? item?.delegatedAddress
                  ?.toLowerCase()
                  .includes(searchEIP7702Kw?.trim().toLowerCase())
              : true)
        )
        .map(
          (e, _, arr) =>
            (({
              ...e!,
              address: currentAccount!.address,
              alias: currentAccount!.alianName,
              list: arr,
            } as any) as EIP7702Delegated)
        ),
    [value, currentAccount, chain, searchEIP7702Kw]
  );

  const clearState = () => {
    setSelectedRows([]);
  };

  const handleEIP7702Revoke = async () => {
    if (!wallet.revokeEIP7702 || !accountAddress) {
      throw new Error('Wallet not connected or account address not available');
    }

    if (!supportedAccountType.includes(currentAccount?.type as any)) {
      Modal.info({
        centered: true,
        title: (
          <div className="text-[16px] text-r-neutral-title1 font-medium ">
            {t('page.approvals.component.RevokeButton.notSupport7702Title')}
          </div>
        ),
        className: 'am-revoke-info-modal modal-support-darkmode',
        content: (
          <div className="text-[15px] text-r-neutral-body text-center">
            {t('page.approvals.component.RevokeButton.notSupport7702Content')}
          </div>
        ),
        okText: t('global.ok'),
        okButtonProps: {
          block: true,
          className: 'h-[44px]',
        },
        onOk: () => {
          clearState();
        },
      });
      return;
    }

    await wallet.revokeEIP7702({
      chainList: selectedRows?.map((e) => e.chain),
    });

    // Listen for transaction completion to refresh delegation status
    const handleTxReload = () => {
      retry();
      eventBus.removeEventListener(EVENTS.RELOAD_TX, handleTxReload);
    };
    eventBus.addEventListener(EVENTS.RELOAD_TX, handleTxReload);

    clearState();
  };

  return {
    accountAddress,
    isLoading: loading,
    error,
    data: delegationAddresses,
    searchEIP7702Kw,
    setSearchEIP7702Kw,
    selectedRows,
    setSelectedRows,
    vGridRefEIP7702,
    handleEIP7702Revoke,
  };
};
