import React, { useCallback } from 'react';
import { ReactComponent as RcIconHelp } from 'ui/assets/pending/icon-help-cc.svg';
import IconBridged from 'ui/assets/tokenDetail/IconBridged.svg';
import IconNative from 'ui/assets/tokenDetail/IconNative.svg';
import IconNoFind from 'ui/assets/tokenDetail/IconNoFind.svg';
// import { ellipsisAddress } from '@/utils/address';
import { findChain, findChainByServerID } from '@/utils/chain';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import { ReactComponent as RcIconBackNew } from 'ui/assets/back-new.svg';
import { Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import IconUnknown from 'ui/assets/token-default.svg';
import { ReactComponent as RcIconExternal } from 'ui/assets/icon-share-currentcolor.svg';
import { useTranslation } from 'react-i18next';
// import { formatUsdValueKMB } from '@/screens/Home/utils/price';
import { Copy, TokenWithChain } from 'ui/component';
import { getUITypeName, openInTab } from '@/ui/utils';
import { getAddressScanLink, getChain } from '@/utils';
import ChainIcon from '../NFT/ChainIcon';
import { ellipsis, ellipsisAddress } from '@/ui/utils/address';
import { formatUsdValueKMB } from './utils';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import {
  TokenEntityDetail,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { getTokenSymbol } from '@/ui/utils/token';
import { TokenDetailPopup } from '.';
import styled from 'styled-components';
import { Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';

const Divide = styled.div`
  height: 1px;
  height: 0.5px;
  background-color: var(--r-neutral-card2, #f2f4f7);
  display: flex;
  flex: 1;
`;
const BridgeOrNative = ({
  token,
  tokenEntity,
}: {
  token: TokenItem;
  tokenEntity?: TokenEntityDetail;
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);

  const isBridgeDomain =
    tokenEntity?.bridge_ids && tokenEntity.bridge_ids.length > 0;
  const isVerified = tokenEntity?.is_domain_verified;

  return tokenEntity ? (
    <>
      <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
        {tokenEntity?.domain_id ? (
          <>
            {isVerified && (
              <>
                <div className="flex flex-row gap-2 justify-center items-center px-16 gap-6 w-full flex flex-row">
                  <Divide className="bg-r-neutral-line" />
                  {isBridgeDomain ? (
                    <div className="text-r-neutral-foot text-12 flex flex-row">
                      <img src={IconBridged} className="w-14 mr-4" />
                      {t('page.dashboard.tokenDetail.BridgeIssue')}
                    </div>
                  ) : (
                    <div className="text-r-neutral-foot text-12 flex flex-row">
                      <img src={IconNative} className="w-14 mr-4" />
                      {t('page.dashboard.tokenDetail.OriginIssue')}
                    </div>
                  )}
                  <Divide className="bg-r-neutral-line" />
                </div>
              </>
            )}
            <div className="flex flex-row items-center justify-between w-full px-16">
              <div className="text-r-neutral-body text-13 font-normal">
                {isBridgeDomain
                  ? t('page.dashboard.tokenDetail.BridgeProvider')
                  : t('page.dashboard.tokenDetail.IssuerWebsite')}
              </div>
              <div
                onClick={() => {
                  openInTab(`https://www.${tokenEntity?.domain_id}`);
                }}
                className="
              text-r-neutral-title-1 text-13 font-medium
              flex flex-row items-center gap-6 cursor-pointer 
              border border-transparent 
              bg-r-neutral-card-2
              hover:bg-blue-light hover:bg-opacity-[0.1] hover:border-rabby-blue-default
              rounded-[6px] px-12 py-6"
              >
                {tokenEntity?.domain_id}
                <ThemeIcon src={RcIconExternal} className="w-14" />
              </div>
            </div>
            {isBridgeDomain && tokenEntity.origin_token && (
              <div className="flex flex-row items-center justify-between w-full px-16">
                <div className="text-r-neutral-body text-13 font-normal">
                  {t('page.dashboard.tokenDetail.OriginalToken')}
                </div>

                <div
                  className="
              text-r-neutral-title-1 text-13 font-medium
              flex flex-row items-center gap-6 cursor-pointer 
              border border-transparent 
              bg-r-neutral-card-2
              hover:bg-blue-light hover:bg-opacity-[0.1] hover:border-rabby-blue-default
              rounded-[6px] px-12 py-6"
                  onClick={() => {
                    setVisible(true);
                  }}
                >
                  <TokenWithChain
                    token={tokenEntity.origin_token}
                    hideChainIcon={true}
                    hideConer
                    width="16px"
                    height="16px"
                  ></TokenWithChain>
                  {getTokenSymbol(tokenEntity.origin_token)}
                  <ThemeIcon src={RcIconExternal} className="w-14" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
            <img src={IconNoFind} className="w-14 mr-4" />
            {t('page.dashboard.tokenDetail.noIssuer')}
          </div>
        )}
      </div>

      {tokenEntity?.origin_token && (
        <TokenDetailPopup
          variant="add"
          token={tokenEntity?.origin_token}
          visible={visible}
          onClose={() => setVisible(false)}
        />
      )}
    </>
  ) : null;
};

const ChainAndName = ({
  token,
  tokenEntity,
}: {
  token: TokenItem;
  tokenEntity?: TokenEntityDetail;
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);

  const isShowAddress = /^0x.{40}$/.test(token.id);

  const handleClickLink = (token: TokenItem) => {
    const serverId = token.chain;
    const chain = findChain({
      serverId: serverId,
    });
    if (!chain) return;
    const link = getAddressScanLink(chain.scanLink, token.id);
    const needClose = getUITypeName() !== 'notification';
    openInTab(link, needClose);
  };

  const chain = findChain({
    serverId: token.chain,
  });

  return (
    <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
      <div className="flex flex-row justify-between w-full px-16 py-12">
        <span className="text-r-neutral-body text-[13px] font-normal">
          {t('page.dashboard.tokenDetail.TokenName')}
        </span>
        <span className="text-r-neutral-title-1 text-13 font-medium">
          {token.name || ''}
        </span>
      </div>
      <div className="flex flex-row justify-between w-full px-16 py-12">
        <span className="text-r-neutral-body text-[13px] font-normal">
          {t('page.dashboard.tokenDetail.Chain')}
        </span>
        <div className="flex flex-row items-center gap-6">
          <img src={chain?.logo || IconUnknown} className="w-16 h-16" />
          <span className="text-r-neutral-title-1 text-13 font-medium">
            {getChain(token?.chain)?.name}
          </span>
        </div>
      </div>
      {isShowAddress && (
        <div className="flex flex-row justify-between w-full px-16 py-12">
          <span className="text-r-neutral-body text-[13px] font-normal">
            {t('page.dashboard.tokenDetail.ContractAddress')}
          </span>
          <div className="flex flex-row items-center gap-6">
            <span className="text-r-neutral-title-1 text-13 font-medium">
              {ellipsis(token.id)}
            </span>
            <ThemeIcon
              src={RcIconExternal}
              className="w-14 cursor-pointer text-r-neutral-foot"
              onClick={() => {
                handleClickLink(token);
              }}
            />
            <Copy
              data={token.id}
              variant="address"
              className="w-14 cursor-pointer"
            />
          </div>
        </div>
      )}
      <div className="flex flex-row justify-between w-full px-16 py-12">
        <div className="flex flex-row items-center gap-4">
          <span className="text-r-neutral-body text-[13px] font-normal">
            {'FDV'}
          </span>
          <div className="relative">
            <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[max-content]"
              title={t('page.dashboard.tokenDetail.fdvTips')}
            >
              <ThemeIcon
                src={RcIconHelp}
                className="w-14 cursor-pointer text-r-neutral-foot"
              ></ThemeIcon>
            </TooltipWithMagnetArrow>
          </div>
        </div>
        <span className="text-r-neutral-title-1 text-13 font-medium">
          {tokenEntity?.fdv ? formatUsdValueKMB(tokenEntity.fdv) : '-'}
        </span>
      </div>
      {tokenEntity?.origin_token && (
        <TokenDetailPopup
          variant="add"
          token={tokenEntity?.origin_token}
          visible={visible}
          onClose={() => setVisible(false)}
        />
      )}
    </div>
  );
};

const ListSiteAndCex = ({
  siteArr,
  title,
  noSiteString,
  popupHeight,
}: {
  popupHeight: number;
  title: string;
  noSiteString: string;
  siteArr?:
    | TokenEntityDetail['listed_sites']
    | TokenEntityDetail['cex_list']
    | undefined;
}) => {
  const { t } = useTranslation();
  const [detailVisible, setDetailVisible] = React.useState(false);

  const SiteComponentsRender = useMemoizedFn(
    (
      siteArr: TokenEntityDetail['listed_sites'] | TokenEntityDetail['cex_list']
    ) => {
      const newArr = siteArr.slice(0, 5);
      if (siteArr && siteArr.length > 0) {
        return (
          <div className="flex flex-row items-center gap-6">
            {newArr.map((item, index) => (
              <div key={index} className="relative">
                <TooltipWithMagnetArrow
                  overlayClassName="rectangle"
                  title={
                    <div className="flex flex-row items-center gap-4">
                      <div className="text-r-neutral-title-2 text-13">
                        {item.name}
                      </div>
                      <ThemeIcon
                        src={RcIconExternal}
                        className="w-14 cursor-pointer"
                        onClick={() => {
                          openInTab(item.url || item.site_url);
                        }}
                        color="var(--r-neutral-title2, #FFF)"
                      />
                    </div>
                  }
                >
                  <img
                    key={index}
                    src={item.logo_url}
                    className="w-20 h-20 rounded-full"
                  ></img>
                </TooltipWithMagnetArrow>
              </div>
            ))}
            {siteArr.length > 5 && (
              <div className="text-r-neutral-foot text-12 flex flex-row">
                +{siteArr.length - 5}
              </div>
            )}
          </div>
        );
      } else {
        return null;
      }
    }
  );

  if (!siteArr?.length) {
    return (
      <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
        <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
          <img src={IconNoFind} className="w-14 mr-4" />
          {noSiteString}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-row bg-r-neutral-card-1 rounded-[8px] 
      px-16 py-14 items-center justify-between 
      border border-transparent
      hover:bg-blue-light hover:bg-opacity-[0.1] hover:border-rabby-blue-default
      cursor-pointer"
        onClick={() => {
          setDetailVisible(true);
        }}
      >
        <div className="text-r-neutral-body text-13 font-normal">{title}</div>
        <div className="flex flex-row items-center gap-6">
          {SiteComponentsRender(siteArr || [])}
          <IconArrowRight
            width={20}
            height={20}
            viewBox="0 0 12 12"
          ></IconArrowRight>
        </div>
      </div>
      <Popup
        visible={detailVisible}
        maskClosable
        className="token-detail-popup"
        closable={true}
        onClose={() => setDetailVisible(false)}
        placement="bottom"
        height={popupHeight}
        push={false}
        title={
          <div className="text-r-neutral-title-1 text-20 font-medium">
            {/* <ThemeIcon
              src={RcIconBackNew}
              className={clsx('icon icon-back absolute left-0 cursor-pointer')}
              onClick={() => setDetailVisible(false)}
            /> */}
            {title}
          </div>
        }
        destroyOnClose
      >
        <div className="flex flex-1 flex-col py-12 px-20 gap-12 overflow-y-auto">
          {siteArr?.map((item, index) => (
            <div
              key={index}
              className="w-full flex flex-row items-center justify-between px-16 py-16 
              rounded-[6px]
              border border-transparent 
              bg-r-neutral-card-1
              hover:bg-blue-light hover:bg-opacity-[0.1] hover:border-rabby-blue-default
              cursor-pointer"
              onClick={() => {
                openInTab(item.url || item.site_url);
              }}
            >
              <div className="flex flex-row gap-6 text-r-neutral-title-1 text-15">
                <img
                  key={index}
                  src={item.logo_url}
                  className="w-20 h-20 rounded-full"
                ></img>
                {item.name}
              </div>
              <ThemeIcon src={RcIconExternal} className="w-14" />
            </div>
          ))}
        </div>
      </Popup>
    </>
  );
};

const TokenChainAndContract = ({
  token,
  tokenEntity,
  popupHeight,
  entityLoading,
}: {
  token: TokenItem;
  popupHeight: number;
  entityLoading: boolean;
  tokenEntity?: TokenEntityDetail;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-12">
      {entityLoading ? (
        <Skeleton.Input
          active
          style={{ width: 360, height: 48, borderRadius: 8 }}
        />
      ) : (
        <BridgeOrNative
          token={token}
          tokenEntity={tokenEntity}
        ></BridgeOrNative>
      )}
      {entityLoading ? (
        <Skeleton.Input
          active
          style={{ width: 360, height: 48, borderRadius: 8 }}
        />
      ) : (
        <ListSiteAndCex
          popupHeight={popupHeight}
          siteArr={tokenEntity?.listed_sites}
          title={t('page.dashboard.tokenDetail.ListedBy')}
          noSiteString={t('page.dashboard.tokenDetail.NoListedBy')}
        ></ListSiteAndCex>
      )}
      {entityLoading ? (
        <Skeleton.Input
          active
          style={{ width: 360, height: 48, borderRadius: 8 }}
        />
      ) : (
        <ListSiteAndCex
          siteArr={tokenEntity?.cex_list}
          title={t('page.dashboard.tokenDetail.SupportedExchanges')}
          noSiteString={t('page.dashboard.tokenDetail.NoSupportedExchanges')}
          popupHeight={popupHeight}
        ></ListSiteAndCex>
      )}
      <ChainAndName token={token} tokenEntity={tokenEntity}></ChainAndName>
    </div>
  );
};

export default TokenChainAndContract;
