import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from '@/ui/views/CommonPopup/AssetList/TokenListViewSkeleton';
import { AddCustomTestnetTokenPopup } from '@/ui/views/CommonPopup/AssetList/CustomTestnetAssetList/AddCustomTestnetTokenPopup';
import { ReactComponent as RcIconAdd } from '@/ui/assets/dashboard/portfolio/cc-add.svg';
import { EditCustomTestnetModal } from '@/ui/views/CustomTestnet/components/EditTestnetModal';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { isSameTesnetToken } from '@/utils/chain';
import { matomoRequestEvent } from '@/utils/matomo-request';
import {
  Table,
  TBody,
  THeadCell,
  THeader,
  TRow,
} from '@/ui/views/CommonPopup/AssetList/components/Table';
import { CustomTestnetToken } from '@/background/service/customTestnet';
import {
  TokenChain,
  TokenItemAddress,
  TokenItemAmount,
} from '@/ui/views/CommonPopup/AssetList/CustomTestnetAssetList/CustomTestnetTokenItem';
import styled from 'styled-components';
import { TestnetTokenItemAsset } from './TokenItem';
import { useHistory } from 'react-router-dom';
import { AddCustomTokenModal } from '../AddCustomTokenModal';
import { AddressDetailModal } from '../AddressDetailModal';
import { AddCustomNetworkModal } from '../AddCustomNetworkModal';

interface Props {
  className?: string;
  selectChainId?: string | null;
}

interface TokenItemProps {
  item: CustomTestnetToken;
  style?: React.CSSProperties;
  onClick?: () => void;
}
interface TableProps {
  list?: TokenItemProps['item'][];
  onAdd?: (item: TokenItemProps['item']) => void;
  onRemove?: (item: TokenItemProps['item']) => void;
  virtual?: {
    height: number;
    itemSize: number;
  };
  EmptyComponent?: React.ReactNode;
}

const TokenRowWrapper = styled(TRow)`
  border-bottom: 1px solid var(--rb-neutral-bg-4, #f2f4f7);
  height: 60px;
  padding-left: 12px;
  padding-right: 16px;
  .swap-action-btn {
    display: none !important;
  }
  &:hover {
    background-color: var(--rb-neutral-bg-2, #f2f4f7);
    .swap-action-btn {
      display: block !important;
    }
  }
  &:last-child {
    border-bottom-color: transparent;
  }
`;

const CustomTestnetTokenItem: React.FC<TokenItemProps> = ({
  item,
  style,
  onClick,
}) => {
  return (
    <TokenRowWrapper onClick={onClick} style={style}>
      <TestnetTokenItemAsset item={item} />
      <TokenChain item={item} />
      <TokenItemAddress item={item} />
      <TokenItemAmount item={item} className="flex-1 text-14 font-normal" />
    </TokenRowWrapper>
  );
};

const CustomTestnetTokenTable: React.FC<TableProps> = ({
  list,
  EmptyComponent,
}) => {
  const { t } = useTranslation();
  return (
    <Table className="!w-full ml-0 mr-0">
      <THeader
        className="w-full justify-between bg-rb-neutral-bg-1 rounded-[6px] py-8"
        rowClassName="px-8"
      >
        <THeadCell className="flex-1">
          {t('page.desktopProfile.portfolio.table.token')}
        </THeadCell>
        <THeadCell className="flex-1">
          {t('page.desktopProfile.portfolio.table.chain')}
        </THeadCell>
        <THeadCell className="flex-1">
          {t('page.desktopProfile.portfolio.table.tokenAddress')}
        </THeadCell>
        <THeadCell className="flex-1 text-right">
          {t('page.desktopProfile.portfolio.table.amount')}
        </THeadCell>
      </THeader>
      <TBody className="mt-0">
        {list?.map((item) => {
          return (
            <CustomTestnetTokenItem
              key={`${item.chainId}-${item.id}`}
              item={item}
            />
          );
        })}
      </TBody>
    </Table>
  );
};

export const CustomTestnetAssetList: React.FC<Props> = ({
  className,
  selectChainId,
}) => {
  const { t } = useTranslation();
  const { currentAccount } = useRabbySelector((s) => ({
    currentAccount: s.account.currentAccount,
  }));
  const history = useHistory();
  const [isFetched, setIsFetched] = React.useState<boolean>(false);
  const [isShowAddNetworkModal, setIsShowAddNetworkModal] = useState(false);
  const [isShowAddTokenModal, setIsShowAddTokenModal] = useState(false);

  const wallet = useWallet();

  const { data: _list, loading, mutate, refreshAsync } = useRequest(
    async () => {
      return wallet.getCustomTestnetTokenList({
        address: currentAccount!.address,
        isRemote: true,
      });
    },
    {
      refreshDeps: [currentAccount],
      onSuccess(data) {
        setIsFetched(true);
      },
    }
  );

  const list = useMemo(() => {
    if (!selectChainId) {
      return _list;
    }
    return _list?.filter((item) => {
      return String(item.chainId) === selectChainId;
    });
  }, [_list, selectChainId]);

  if (!isFetched) {
    return <TokenListViewSkeleton isTestnet />;
  }

  return (
    <div className={className}>
      {loading ? (
        <TokenListSkeleton />
      ) : (
        <div className="mt-18">
          <CustomTestnetTokenTable
            list={list || []}
            onAdd={(token) => {
              mutate((prev) => {
                return (prev || []).find((item) => {
                  return isSameTesnetToken(item, token);
                })
                  ? prev
                  : [...(prev || []), token];
              });
            }}
            onRemove={(token) => {
              mutate((prev) => {
                return (prev || []).filter((item) => {
                  return !isSameTesnetToken(item, token);
                });
              });
            }}
          />
        </div>
      )}
      <div className="flex items-center justify-between mt-12 gap-x-[24px] widget-has-ant-input">
        <div className="flex items-center gap-x-[12px]">
          <div
            className={clsx(
              'rounded-[6px] bg-r-neutral-card1 px-[9px] py-[10px] cursor-pointer min-w-[292px]',
              ' border border-rabby-blue-default min-w-[82px] text-center',
              'hover:border-rabby-blue-default hover:bg-r-blue-light1'
            )}
          >
            <div
              className={clsx(
                'text-r-blue-default text-[13px] leading-[13px] font-medium cursor-pointer',
                'flex items-center gap-x-[4px] justify-center'
              )}
              onClick={() => {
                matomoRequestEvent({
                  category: 'Custom Network',
                  action: 'TokenList Add Network',
                });
                setIsShowAddNetworkModal(true);
              }}
            >
              <span className="text-r-blue-default">
                <RcIconAdd />
              </span>
              {t('page.dashboard.assets.TestnetAssetListContainer.addNetwork')}
            </div>
          </div>
          <div
            className={clsx(
              'rounded-[6px] bg-r-neutral-card1 px-[9px] py-[10px] cursor-pointer min-w-[292px]',
              ' border border-rabby-blue-default min-w-[82px] text-center',
              'hover:border-rabby-blue-default hover:bg-r-blue-light1'
            )}
          >
            <div
              className={clsx(
                'text-r-blue-default text-[13px] leading-[13px] font-medium cursor-pointer',
                'flex items-center gap-x-[4px] justify-center'
              )}
              onClick={() => {
                setIsShowAddTokenModal(true);
              }}
            >
              <span className="text-r-blue-default">
                <RcIconAdd />
              </span>
              {t('page.dashboard.assets.TestnetAssetListContainer.addToken')}
            </div>
          </div>
        </div>
      </div>
      <AddCustomNetworkModal
        visible={isShowAddNetworkModal}
        onCancel={() => {
          setIsShowAddNetworkModal(false);
        }}
        onChange={() => {
          refreshAsync();
        }}
        destroyOnClose
      />
      <AddCustomTokenModal
        visible={isShowAddTokenModal}
        onCancel={() => {
          setIsShowAddTokenModal(false);
        }}
        onOk={() => {
          setIsShowAddTokenModal(false);
          refreshAsync();
        }}
        destroyOnClose
      />
    </div>
  );
};
