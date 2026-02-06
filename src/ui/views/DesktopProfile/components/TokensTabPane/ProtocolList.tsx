import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { AbstractProject } from 'ui/utils/portfolio/types';
import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { openInTab, useWallet } from '@/ui/utils';
import { ReactComponent as RcOpenExternalCC } from '@/ui/assets/open-external-cc.svg';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/info-cc.svg';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ReactComponent as RcIconDropdown } from '@/ui/assets/dashboard/dropdown-cc.svg';
import * as PortfolioTemplate from './Protocols/template';
import { RcIconExternal1CC } from '@/ui/assets/desktop/common';
import { PERPS_INVITE_URL } from '@/ui/views/Perps/constants';
import { useRequest } from 'ahooks';
import { checkPerpsReference } from '@/ui/views/Perps/utils';
import { useSticky } from '@/ui/hooks/useSticky';
import { useLocation } from 'react-router-dom';

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

const PoolListContainer = styled.div`
  background-color: var(--rb-neutral-bg-3, #f9f9f9);
  border-radius: 16px;
  padding-top: 8;
  margin: 0 20px;
  overflow: hidden;
`;

const ProtocolItemWrapper = styled.div`
  margin-bottom: 28px;
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

export const Main = memo(({ data }: { data: AbstractProject }) => {
  if (!data || !data?._portfolios?.length) return null;

  const { id, _portfolios, logo } = data;

  const typesMap = new Map<string, typeof _portfolios>();
  // 先根据name 和 common 分组,common取最后一个
  _portfolios.forEach((v) => {
    const detail_type = v?._originPortfolio?.detail_types
      ?.reverse()
      ?.find((type) =>
        TemplateDict[type as keyof typeof TemplateDict] ? type : ''
      );
    const mapKey = `${v.name}&&${detail_type}&&${v?._originPortfolio?.proxy_detail?.proxy_contract_id}`;
    const _arr = typesMap.get(mapKey) || [];
    _arr.push(v);
    typesMap.set(mapKey, _arr);
  });

  return (
    <div>
      {[...typesMap].map(([k, v], index) => {
        // 需要根据 common 匹配对应模板
        const [tag, type] = k.split('&&');
        const PortfolioDetail =
          TemplateDict[type as keyof typeof TemplateDict] ||
          TemplateDict.unsupported;
        return (
          <PortfolioDetail
            key={`${k}_${v[0].id}_${v[0].name}}`}
            tag={tag}
            protocolLogo={logo}
            data={v.map((i) => i._originPortfolio).filter(Boolean)}
            siteUrl={data.site_url}
            protocolName={data.name}
            name={tag}
          />
        );
      })}
    </div>
  );
});

const ProtocolItem = ({
  protocol: _protocol,
  isAppChain,
  removeProtocol,
}: {
  protocol: DisplayedProject;
  isAppChain?: boolean;
  removeProtocol?: (id: string) => void;
}) => {
  const { t } = useTranslation();
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

  const { data: isShowPerpsInvite } = useRequest(
    async () => {
      return checkPerpsReference({
        wallet,
        account: currentAccount,
        scene: 'protocol',
      });
    },
    {
      ready: protocol.id === 'hyperliquid',
      cacheKey: `check-perps-reference-protocol-${currentAccount?.address}`,
    }
  );

  return (
    <ProtocolItemWrapper className="protocol-item-wrapper" id={protocol.id}>
      <div>
        <div
          className={clsx(
            'flex items-center justify-start mx-[20px]',
            'title border border-solid border-transparent rounded-[8px] h-[48px] px-0'
          )}
        >
          <IconWithChain
            iconUrl={protocol.logo}
            chainServerId={protocol.chain || 'eth'}
            width="20px"
            height="20px"
            chainSize="12px"
            noRound={isAppChain}
            isShowChainTooltip={true}
            hideChainIcon={isAppChain}
            chainClassName="bottom-[-4px] right-[-4px]"
          />
          <div
            className="ml-[10px] flex items-center"
            onClick={(evt) => {
              evt.stopPropagation();
              openInTab(
                protocol.id === 'hyperliquid' && isShowPerpsInvite
                  ? PERPS_INVITE_URL
                  : protocol.site_url,
                false
              );
            }}
          >
            {protocol.id === 'hyperliquid' && isShowPerpsInvite ? (
              <Tooltip
                overlayClassName="app-chain-tooltip rectangle addressType__tooltip"
                title={t('component.ChainItem.hyperliquidCode')}
              >
                <span
                  className={`
                name inline-flex items-center text-[20px] leading-[24px] font-semibold 
                text-r-neutral-title1 hover:text-r-blue-default 
                border-b-[1px] border-b-solid border-transparent hover:border-b-r-blue-default
              `}
                >
                  {protocol.name}
                </span>
              </Tooltip>
            ) : (
              <span
                className={`
                name inline-flex items-center text-[20px] leading-[24px] font-semibold 
                text-r-neutral-title1 hover:text-r-blue-default 
                border-b-[1px] border-b-solid border-transparent hover:border-b-r-blue-default
              `}
              >
                {protocol.name}
              </span>
            )}

            {!!isAppChain && (
              <Tooltip
                overlayClassName="app-chain-tooltip rectangle addressType__tooltip"
                title={t('component.ChainItem.appChain', {
                  chain: protocol.name,
                })}
              >
                <div className="text-r-neutral-foot ml-[6px]">
                  <RcIconInfoCC />
                </div>
              </Tooltip>
            )}
            <RcIconExternal1CC className="ml-[6px] w-[16px] h-[16px] text-r-neutral-foot" />
          </div>
          <div className="flex items-center justify-end flex-1">
            <span className="text-[20px] text-r-neutral-title1 font-semibold">
              {protocol._netWorth}
            </span>
          </div>
        </div>
        <PoolListContainer>
          <Main data={protocol} />
        </PoolListContainer>
      </div>
    </ProtocolItemWrapper>
  );
};

interface Props {
  list: DisplayedProject[] | undefined;
  appIds?: string[];
  removeProtocol?: (id: string) => void;
  isExpanded?: boolean;
  toggleExpand?: () => void;
  hasExpandSwitch?: boolean;
}

const ProtocolListWrapper = styled.div`
  margin-top: 20px;
`;

const ProjectOverview = ({
  list,
  appIds,
  removeProtocol,
  isExpanded,
  toggleExpand,
  hasExpandSwitch,
}: Props) => {
  const { t } = useTranslation();

  const { stickyRef, isSticky, observe } = useSticky<HTMLDivElement>(
    document.querySelector<HTMLDivElement>('.js-scroll-element')
  );

  const location = useLocation();

  useEffect(() => {
    if (isExpanded && location.pathname.includes('desktop/profile/difi')) {
      requestAnimationFrame(() => {
        observe();
      });
    }
  }, [location.pathname, list, isExpanded, observe]);

  if (!list) return null;

  return (
    <ProtocolListWrapper>
      {list?.map((item) => (
        <ProtocolItem
          protocol={item}
          removeProtocol={removeProtocol}
          key={item.id}
          isAppChain={appIds?.includes(item.id)}
        />
      ))}
      {hasExpandSwitch && (
        <div
          className="mb-[20px]"
          ref={stickyRef}
          style={{
            position: isExpanded ? 'sticky' : 'static',
            bottom: 32,
          }}
        >
          {isExpanded && isSticky ? (
            <div className="h-[40px] flex items-center justify-center pointer-events-none">
              <div
                className={clsx(
                  'flex items-center gap-[4px] rounded-full pointer-events-auto',
                  'bg-rb-neutral-bg-1 dark:bg-rb-neutral-bg-4',
                  'px-[16px] py-[8px] cursor-pointer'
                )}
                style={{
                  boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.12)',
                }}
                onClick={() => {
                  toggleExpand?.();
                  requestAnimationFrame(() => {
                    observe();
                  });
                }}
              >
                <div className="text-rb-neutral-foot text-[13px] leading-[16px]">
                  {t(
                    'page.desktopProfile.portfolio.hidden.hideDeFiWithSmallDeposits'
                  )}
                </div>
                <RcIconDropdown
                  className={clsx(
                    'ml-0 text-rb-neutral-foot mb-[-2px]',
                    'transform rotate-180'
                  )}
                />
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center gap-4 py-[12px]"
              onClick={() => {
                toggleExpand?.();
                requestAnimationFrame(() => {
                  observe();
                });
              }}
            >
              <div className="text-rb-neutral-secondary text-[13px] leading-[16px] cursor-pointer">
                {isExpanded
                  ? t(
                      'page.desktopProfile.portfolio.hidden.hideDeFiWithSmallDeposits'
                    )
                  : t(
                      'page.desktopProfile.portfolio.hidden.hideDeFiWithSmallDepositsDesc'
                    )}
              </div>
              <div className="flex items-center justify-center gap-[2px] cursor-pointer">
                {isExpanded ? null : (
                  <div className="text-rb-neutral-secondary text-[13px] leading-[16px] underline">
                    {t('page.desktopProfile.portfolio.hidden.showAll')}
                  </div>
                )}
                <RcIconDropdown
                  className={clsx('ml-0 text-rb-neutral-secondary ', {
                    'transform rotate-180': isExpanded,
                  })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </ProtocolListWrapper>
  );
};

export default ProjectOverview;
