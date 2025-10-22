import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { AbstractPortfolio, AbstractProject } from 'ui/utils/portfolio/types';
import { DisplayedProject } from 'ui/utils/portfolio/project';
import { IconWithChain } from '@/ui/component/TokenWithChain';
// import PortfolioTemplate from '@/ui/views/CommonPopup/AssetList/ProtocolTemplates';
import { openInTab, useCommonPopupView, useWallet } from '@/ui/utils';
import { ReactComponent as RcOpenExternalCC } from '@/ui/assets/open-external-cc.svg';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/info-cc.svg';
import DappActions from '@/ui/views/CommonPopup/AssetList/components/DappActions';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';

import * as PortfolioTemplate from './Protocols/template';

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
};

const PoolItemWrapper = styled.div`
  &:nth-last-child(1) {
    margin-bottom: 0;
  }
`;

const PoolListContainer = styled.div`
  border-width: 0.5px;
  border-style: solid;
  border-color: var(--r-neutral-line);
  border-radius: 8px;
  padding-top: 8;
  margin: 0 20px;
`;

// const PoolItem = ({
//   item,
//   chain,
//   protocolLogo,
// }: {
//   item: AbstractPortfolio;
//   chain?: string;
//   protocolLogo?: string;
// }) => {
//   const types = item._originPortfolio.detail_types?.reverse();
//   const type =
//     types?.find((t) => (t in TemplateDict ? t : '')) || 'unsupported';
//   const PortfolioDetail = TemplateDict[type as keyof typeof TemplateDict];
//   return (
//     <PoolItemWrapper>
//       <PortfolioDetail name={item._originPortfolio.name} data={item} />
//       {!!item.withdrawActions?.length &&
//         !item?._originPortfolio?.proxy_detail?.proxy_contract_id && (
//           <DappActions
//             data={item.withdrawActions}
//             chain={chain}
//             protocolLogo={protocolLogo}
//           />
//         )}
//     </PoolItemWrapper>
//   );
// };

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

export const Main = memo(({ data }: { data: AbstractProject }) => {
  if (!data || !data?._portfolios?.length) return null;

  const { id, _portfolios } = data;

  const typesMap = new Map<string, typeof _portfolios>();
  // 先根据name 和 common 分组,common取最后一个
  _portfolios.forEach((v) => {
    const detail_type = v._originPortfolio.detail_types
      ?.reverse()
      ?.find((type) =>
        TemplateDict[type as keyof typeof TemplateDict] ? type : ''
      );

    const mapKey = `${v.name}&&${detail_type}&&${v._originPortfolio.proxy_detail?.proxy_contract_id}`;
    const _arr = typesMap.get(mapKey) || [];
    _arr.push(v);
    typesMap.set(mapKey, _arr);
  });

  return (
    <div
      key={data.id}
      onClick={() => {
        console.log('logger', typesMap);
      }}
    >
      {[...typesMap].map(([k, v], index) => {
        // 需要根据 common 匹配对应模板
        const [tag, type] = k.split('&&');
        const PortfolioDetail =
          TemplateDict[type as keyof typeof TemplateDict] ||
          TemplateDict.unsupported;
        return (
          <PortfolioDetail
            key={k}
            tag={tag}
            data={v.map((v) => v._originPortfolio).filter(Boolean)}
            siteUrl={data.site_url}
            name={tag}
          />
        );
      })}
    </div>
  );
});

const ProtocolItem = ({
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
            'flex items-center justify-start mx-[20px]',
            'title border border-solid bg-r-neutral-card1 border-transparent rounded-[8px] h-[48px] pr-14 px-0'
          )}
        >
          <IconWithChain
            iconUrl={protocol.logo}
            chainServerId={protocol.chain || 'eth'}
            width="20px"
            height="20px"
            noRound={isAppChain}
            isShowChainTooltip={true}
            hideChainIcon={isAppChain}
          />
          <div
            className="ml-[8px] flex items-center border-b-[1px] border-b-solid border-transparent hover:border-b-rabby-neutral-foot"
            onClick={(evt) => {
              evt.stopPropagation();
              openInTab(protocol.site_url, false);
            }}
          >
            <span className="name inline-flex items-center text-15 font-medium text-r-blue-default">
              {protocol.name}
            </span>
            {!!isAppChain && (
              <Tooltip
                overlayClassName="app-chain-tooltip"
                title={t('component.ChainItem.appChain', {
                  chain: protocol.name,
                })}
              >
                <div className="text-r-neutral-foot ml-[4px] mr-[2px]">
                  <RcIconInfoCC />
                </div>
              </Tooltip>
            )}
            <RcOpenExternalCC className="ml-[4px] w-[12px] h-[12px] text-r-neutral-foot" />
          </div>
          <div className="flex items-center justify-end flex-1">
            <span className="net-worth">{protocol._netWorth}</span>
          </div>
        </div>
        <PoolListContainer>
          <Main data={protocol} key={protocol.id} />
        </PoolListContainer>
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

  if (!list) return null;

  return (
    <ProtocolListWrapper>
      {list.map((item) => (
        <ProtocolItem
          protocol={item}
          key={item.id + item.chain}
          enableDelayVisible={enableDelayVisible}
          isAppChain={appIds?.includes(item.id)}
          isSearch={isSearch}
          removeProtocol={removeProtocol}
        />
      ))}
    </ProtocolListWrapper>
  );
};

export default ProtocolList;
