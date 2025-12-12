import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import PortfolioTemplate from './ProtocolTemplates';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown.svg';
import { openInTab, useCommonPopupView, useWallet } from '@/ui/utils';
import { ReactComponent as RcOpenExternalCC } from '@/ui/assets/open-external-cc.svg';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/info-cc.svg';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import DappActionsForPopup from './components/DappActions/DappActionsForPopup';
import {
  useDappAction,
  useGetDappActions,
} from './components/DappActions/hook';
import { ProtocolLowValueItem } from './ProtocolLowValueItem';
import BigNumber from 'bignumber.js';
import { useExpandList } from '@/ui/utils/portfolio/expandList';

const TemplateDict = {
  common: PortfolioTemplate.Common,
  lending: PortfolioTemplate.Lending,
  locked: PortfolioTemplate.Locked,
  leveraged_farming: PortfolioTemplate.LeveragedFarming,
  vesting: PortfolioTemplate.Vesting,
  reward: PortfolioTemplate.Reward,
  options_seller: PortfolioTemplate.OptionsSeller,
  options_buyer: PortfolioTemplate.OptionsSeller,
  insurance_seller: PortfolioTemplate.Unsupported,
  insurance_buyer: PortfolioTemplate.Unsupported,
  perpetuals: PortfolioTemplate.Perpetuals,
  unsupported: PortfolioTemplate.Unsupported,
  nft_common: PortfolioTemplate.NftCommon,
  nft_lending: PortfolioTemplate.NftLending,
  nft_fraction: PortfolioTemplate.NftFraction,
  nft_p2p_lender: PortfolioTemplate.NftP2PLender,
  nft_p2p_borrower: PortfolioTemplate.NftP2PBorrower,
  prediction: PortfolioTemplate.Prediction,
};

const PoolItemWrapper = styled.div`
  &:nth-last-child(1) {
    margin-bottom: 0;
  }
`;

const PoolItem = ({
  item,
  chain,
  protocolLogo,
}: {
  item: AbstractPortfolio;
  chain?: string;
  protocolLogo?: string;
}) => {
  const types = item._originPortfolio.detail_types?.reverse();
  const type =
    types?.find((t) => (t in TemplateDict ? t : '')) || 'unsupported';
  const PortfolioDetail = TemplateDict[type as keyof typeof TemplateDict];
  return (
    <PoolItemWrapper>
      <PortfolioDetail name={item._originPortfolio.name} data={item} />
      {!!item.withdrawActions?.length &&
        !item?._originPortfolio?.proxy_detail?.proxy_contract_id && (
          <DappActionsForPopup
            data={item.withdrawActions}
            chain={chain}
            protocolLogo={protocolLogo}
          />
        )}
    </PoolItemWrapper>
  );
};

const ProtocolItemWrapper = styled.div`
  background: var(--r-neutral-card-1, #f2f4f7);
  margin-bottom: 8px;
  border-radius: 8px;

  .title {
    display: flex;
    align-items: center;
    padding: 12px;
    cursor: pointer;

    .name {
      /* flex: 1; */
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      color: var(--r-neutral-title-1, #192945);
    }
    .net-worth {
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      text-align: right;
      color: var(--r-neutral-title-1, #192945);
    }
  }
`;
export const ProtocolItem = ({
  protocol: _protocol,
  enableDelayVisible,
  isAppChain,
  isSearch,
  removeProtocol,
}: {
  protocol: DisplayedProject;
  enableDelayVisible: boolean;
  isAppChain?: boolean;
  isSearch?: boolean;
  removeProtocol?: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const [isExpand, setIsExpand] = useState(false);
  const { visible } = useCommonPopupView();
  const [delayVisible, setDelayVisible] = useState(false);
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const [
    realTimeProtocol,
    setRealTimeProtocol,
  ] = useState<DisplayedProject | null>(null);

  const protocol = useMemo(() => realTimeProtocol || _protocol, [
    realTimeProtocol,
    _protocol,
  ]);

  const refreshRealTimeProtocol = useCallback(async () => {
    if (!currentAccount?.address || !_protocol.id || isAppChain) {
      return;
    }
    const res = await wallet.openapi.getProtocol({
      addr: currentAccount?.address,
      id: _protocol.id,
    });
    if (res.portfolio_item_list.length) {
      setRealTimeProtocol(new DisplayedProject(res, res.portfolio_item_list));
    } else {
      removeProtocol?.(protocol.id);
    }
    return res;
  }, [
    _protocol.id,
    currentAccount?.address,
    isAppChain,
    protocol.id,
    removeProtocol,
    wallet.openapi,
  ]);

  const onClickTitle = useCallback(() => {
    setIsExpand((prev) => !prev);
    if (!isExpand) {
      refreshRealTimeProtocol();
    }
  }, [isExpand, refreshRealTimeProtocol]);

  const actions = useGetDappActions({
    protocol,
  });

  useEffect(() => {
    setIsExpand(!!isSearch);
  }, [isSearch]);

  useEffect(() => {
    if (!visible) {
      setIsExpand(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setDelayVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setDelayVisible(visible);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [visible]);

  if (enableDelayVisible && !delayVisible) {
    return null;
  }

  return (
    <ProtocolItemWrapper>
      <div>
        <div
          className={clsx(
            'flex items-center justify-start',
            'title border border-solid bg-r-neutral-card1 border-transparent rounded-[8px] h-[48px] pr-14',
            'hover:bg-blue-light',
            'hover:bg-opacity-10',
            'hover:border-blue-light'
          )}
          onClick={onClickTitle}
        >
          <IconWithChain
            iconUrl={protocol.logo}
            chainServerId={protocol.chain || 'eth'}
            width="24px"
            height="24px"
            noRound={isAppChain}
            isShowChainTooltip={true}
            hideChainIcon={isAppChain}
          />
          <div
            className={clsx(
              'ml-[8px] flex items-center min-w-0',
              'border-b-[1px] border-b-solid border-transparent hover:border-b-rabby-neutral-foot'
            )}
            onClick={(evt) => {
              evt.stopPropagation();
              openInTab(protocol.site_url, false);
            }}
          >
            <span className="name items-center truncate min-w-0">
              {protocol.name}
            </span>
            {!!isAppChain && (
              <Tooltip
                overlayClassName="app-chain-tooltip"
                title={t('component.ChainItem.appChain', {
                  chain: protocol.name,
                })}
              >
                <div className="text-r-neutral-foot ml-[4px] mr-[2px] flex-shrink-0">
                  <RcIconInfoCC />
                </div>
              </Tooltip>
            )}
            <RcOpenExternalCC className="ml-[4px] w-[12px] h-[12px] text-r-neutral-foot flex-shrink-0" />
          </div>
          {actions?.length ? (
            <div className="mx-[8px] flex items-center gap-[8px]">
              {actions.map((action) => (
                <div
                  className={clsx(
                    'border border-rabby-blue-default px-[3px] py-[1px]',
                    'text-r-blue-default text-[11px] leading-[13px] rounded-[4px]'
                  )}
                  key={action}
                >
                  {action}
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-end flex-1">
            <span className="net-worth">{protocol._netWorth}</span>
            <RcIconDropdown
              className={clsx('ml-8', {
                'transform rotate-180': isExpand,
              })}
            />
          </div>
        </div>
        {isExpand && (
          <>
            <div className="border-b-[0.5px] border-b-solid border-b-r-neutral-line" />
            {protocol._portfolios.map((portfolio, index) => (
              <div key={portfolio.id}>
                <PoolItem
                  protocolLogo={protocol.logo}
                  chain={protocol.chain}
                  item={portfolio}
                />
                {index !== protocol._portfolios.length - 1 && (
                  <div className="border-b-[0.5px] border-dotted border-b-r-neutral-line ml-[8px] mr-[12px]" />
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </ProtocolItemWrapper>
  );
};

interface Props {
  list: DisplayedProject[] | undefined;
  isSearch?: boolean;
  appIds?: string[];
  removeProtocol?: (id: string) => void;
}

const ProtocolListWrapper = styled.div`
  margin-top: 20px;
`;

const ProtocolList = ({ list, isSearch, appIds, removeProtocol }: Props) => {
  const enableDelayVisible = useMemo(() => {
    return (list || []).length > 100;
  }, [list]);

  const totalValue = React.useMemo(() => {
    return list
      ?.reduce((acc, item) => acc.plus(item.netWorth || 0), new BigNumber(0))
      .toNumber();
  }, [list]);
  const { result: currentList } = useExpandList(list, totalValue);

  const lowValueList = React.useMemo(() => {
    return list?.filter((item) => currentList?.indexOf(item) === -1);
  }, [currentList, list]);

  if (!list) return null;

  return (
    <ProtocolListWrapper>
      {(isSearch ? list : currentList || []).map((item) => (
        <ProtocolItem
          protocol={item}
          key={item.id}
          enableDelayVisible={enableDelayVisible}
          isAppChain={appIds?.includes(item.id)}
          isSearch={isSearch}
          removeProtocol={removeProtocol}
        />
      ))}
      {!isSearch && list?.length && lowValueList?.length ? (
        <ProtocolLowValueItem
          className="h-[48px]"
          list={lowValueList}
          appIds={appIds}
        />
      ) : null}
    </ProtocolListWrapper>
  );
};

export default ProtocolList;
