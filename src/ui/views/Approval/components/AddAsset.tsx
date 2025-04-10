import {
  TokenItem,
  TxHistoryResult,
  TxHistoryItem,
  TokenEntityDetail,
} from '@rabby-wallet/rabby-api/dist/types';
import IconNoFind from 'ui/assets/tokenDetail/IconNoFind.svg';
import { Button, Image } from 'antd';
import clsx from 'clsx';
import { ReactComponent as RcIconExternal } from 'ui/assets/icon-share-currentcolor.svg';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { HistoryItem } from 'ui/views/Dashboard/components/TokenDetailPopup/HistoryItem';
import {
  formatTokenAmount,
  formatUsdValue,
  useApproval,
  useWallet,
  openInTab,
  isSameAddress,
  ellipsisOverflowedText,
  splitNumberByStep,
} from 'ui/utils';
import { Copy, Spin } from 'ui/component';
import { TooltipWithMagnetArrow } from 'ui/component/Tooltip/TooltipWithMagnetArrow';
import { CopyChecked } from 'ui/component/CopyChecked';
import { getTokenSymbol } from 'ui/utils/token';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import { ellipsis } from 'ui/utils/address';
import { Token } from 'background/service/preference';
import { ReactComponent as RcIconExternalCC } from 'ui/assets/open-external-cc.svg';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import IconWarning from 'ui/assets/icon-subtract.svg';
import { findChain } from '@/utils/chain';
import {
  CustomTestnetToken,
  TestnetChain,
} from '@/background/service/customTestnet';
import IconTokenDefault from '@/ui/assets/token-default.svg';
import { Chain } from '@/types/chain';
import { getAddressScanLink, getTxScanLink } from '@/utils';
import { TokenCharts } from '@/ui/component/TokenChart';
import TokenChainAndContract from '../../Dashboard/components/TokenDetailPopup/TokenInfo';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

interface AddAssetProps {
  data: {
    type: string;
    options: {
      address: string;
      symbol: string;
      decimals: number;
      image: string;
    };
  };
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const AddAssetWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background-color: var(--r-neutral-bg2, #f2f4f7);
  height: 100vh;
  overflow: hidden;
  .header {
    padding: 20px;
    text-align: center;
    background-color: var(--r-blue-default, #7084ff);
    color: var(--r-neutral-title2, #fff);
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 32px;
  }
  .token {
    padding: 0 20px 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overflow-y: auto;
    background-color: var(--r-neutral-bg2, #f2f4f7);
    .token-info {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      .icon-token {
        width: 24px;
        height: 24px;
        border-radius: 100%;
        margin-right: 8px;
      }
      .token-symbol {
        font-size: 20px;
        font-weight: 500;
        margin-right: 8px;
      }
      .token-address {
        padding: 5px 8px;
        background-color: var(--r-neutral-card2);
        color: var(--r-neutral-foot);
        font-size: 12px;
        gap: 6px;
        display: flex;
        border-radius: 4px;
        align-items: center;
        .icon-chain,
        .icon-open-external {
          width: 14px;
        }
      }
    }
    .token-balance {
      color: #707280;
      font-size: 14px;
      margin-bottom: 20px;
      line-height: 1;
      div {
        .amount {
          font-size: 24px;
          font-weight: 700;
          color: var(--r-neutral-title1);
          margin-right: 4px;
        }
        &:nth-child(1) {
          margin-bottom: 6px;
        }
        &:nth-child(2) {
          display: flex;
          align-items: flex-end;
        }
      }
    }
    .token-history {
      flex: 1;
      .empty {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        .no-data {
          width: 100px;
          height: 100px;
          margin: 50px auto 0;
        }
      }
    }
  }
  .footer {
    background-color: var(--r-neutral-card1);
    border-top: 0.5px solid var(--r-neutral-line);
    .ant-btn-primary[disabled] {
      width: 100%;
      height: 100%;
    }
  }
`;

const NoTokenWrapper = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  .content {
    padding-top: 65px;
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
    text-align: center;
    color: var(--r-neutral-body, #d3d8e0);
    .icon-warning {
      margin: 0 auto 40px;
    }
  }
  .footer {
    display: flex;
    justify-content: center;
    background-color: var(--r-neutral-bg-1, #fff);
    border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  }
`;

interface TokenHistoryItem extends TxHistoryItem {
  projectDict: TxHistoryResult['project_dict'];
  cateDict: TxHistoryResult['cate_dict'];
  tokenDict: TxHistoryResult['token_dict'];
}

const AddAsset = ({ params }: { params: AddAssetProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [token, setToken] = useState<TokenItem | null>(null);
  const [chainSelectorVisible, setChainSelectorVisible] = useState(false);
  const [tokenHistory, setTokenHistory] = useState<TokenHistoryItem[]>([]);
  const [isTokenHistoryLoaded, setIsTokenHistoryLoaded] = useState(false);
  const [tokenEntity, setTokenEntity] = React.useState<TokenEntityDetail>();
  const [isLoading, setIsLoading] = useState(true);
  const [customTokens, setCustomTokens] = useState<Token[]>([]);
  const [currentChain, setCurrentChain] = useState<
    Chain | TestnetChain | null | undefined
  >(null);
  const [
    customTestnetToken,
    setCustomTestnetToken,
  ] = useState<CustomTestnetToken | null>(null);
  const [isCustomTestnetTokenAdded, setIsCustomTestnetTokenAdded] = useState(
    false
  );
  const [entityLoading, setEntityLoading] = React.useState(true);

  const getTokenEntity = React.useCallback(async () => {
    try {
      const info = await wallet.openapi.getTokenEntity(
        token?.id || '',
        token?.chain
      );
      if (info) {
        setTokenEntity(info);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEntityLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (token?.id && token?.chain) {
      getTokenEntity();
    }
  }, [token]);

  const addButtonStatus = useMemo(() => {
    if (customTestnetToken) {
      if (isCustomTestnetTokenAdded) {
        return {
          disable: true,
          reason: t('page.addToken.hasAdded'),
        };
      }
      return {
        disable: false,
        reason: '',
      };
    }
    if (!token)
      return {
        disable: true,
        reason: t('page.addToken.noTokenFound'),
      };
    if (token?.is_core) {
      return {
        disable: true,
        reason: t('page.addToken.tokenSupported'),
      };
    }
    const isCustom = customTokens.some(
      (t) => isSameAddress(t.address, token.id) && token.chain === t.chain
    );
    if (isCustom) {
      return {
        disable: true,
        reason: t('page.addToken.tokenCustomized'),
      };
    }
    return {
      disable: false,
      reason: '',
    };
  }, [customTokens, token, customTestnetToken, isCustomTestnetTokenAdded]);

  const supportChains = useMemo(() => {
    const chains: CHAINS_ENUM[] = [];
    tokens.forEach((token) => {
      const targetChain = findChain({
        serverId: token.chain,
      });
      if (targetChain) {
        chains.push(targetChain.enum);
      }
    });
    return chains;
  }, [tokens]);

  const handleChainChanged = (id: CHAINS_ENUM) => {
    const chain = findChain({ enum: id });
    if (chain) {
      const t = tokens.find((token) => token.chain === chain.serverId);
      if (t) {
        setToken(t);
      }
    }
    setChainSelectorVisible(false);
  };

  const handleOpenExplorer = () => {
    const tokenId = token?.id || customTestnetToken?.id;
    if (!tokenId || !currentChain) {
      return;
    }
    const url = getAddressScanLink(currentChain.scanLink, tokenId);
    openInTab(url, false);
  };

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    const site = await wallet.getConnectedSite(params.session.origin);
    const chain = findChain({
      enum: site?.chain,
    });
    setCurrentChain(chain);
    if (chain?.isTestnet) {
      if (account) {
        const { address } = params.data.options;
        const isAdded = await wallet.isAddedCustomTestnetToken({
          id: address,
          chainId: chain.id,
        });
        const result = await wallet.getCustomTestnetToken({
          chainId: chain.id,
          address: account?.address,
          tokenId: address,
        });
        setCustomTestnetToken(result);
        setIsCustomTestnetTokenAdded(isAdded);
      }
    } else {
      const customTokens = await wallet.getCustomizedToken();
      if (account) {
        const { address } = params.data.options;
        const result = await wallet.openapi.searchToken(
          account.address,
          address,
          undefined,
          true
        );
        setTokens(result);
        if (result.length === 1) {
          setToken(result[0]);
        }
        if (result.length > 1) {
          setChainSelectorVisible(true);
        }
        const token = result[0];
        if (token) {
          const target = findChain({
            serverId: token.chain,
          });
          setCurrentChain(target || CHAINS[CHAINS_ENUM.ETH]);
        }
      }
      setCustomTokens(customTokens);
    }

    setIsLoading(false);
  };

  const getTokenHistory = async (token: TokenItem) => {
    const currentAccount = await wallet.getCurrentAccount();
    if (!currentAccount) return;
    const history = await wallet.openapi.listTxHisotry({
      id: currentAccount.address,
      chain_id: token.chain,
      page_count: 10,
      token_id: token.id,
    });
    const { project_dict, cate_dict, token_dict, history_list: list } = history;
    const displayList = list
      .map((item) => ({
        ...item,
        projectDict: project_dict,
        cateDict: cate_dict,
        tokenDict: token_dict,
      }))
      .sort((v1, v2) => v2.time_at - v1.time_at);
    setTokenHistory(displayList);
    setIsTokenHistoryLoaded(true);
  };

  const handleConfirm = () => {
    if (token) {
      resolveApproval({
        id: token.id,
        chain: token.chain,
        symbol: token.symbol,
        decimals: token.decimals,
        chainId: currentChain?.id || '',
      });
    } else if (customTestnetToken) {
      resolveApproval({
        id: customTestnetToken.id,
        chain: currentChain?.serverId || '',
        symbol: customTestnetToken.symbol,
        decimals: customTestnetToken.decimals,
        chainId: currentChain?.id || '',
      });
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (token) {
      getTokenHistory(token);
    }
  }, [token]);

  useEffect(() => {
    if (customTestnetToken) {
      setIsTokenHistoryLoaded(true);
    }
  }, [customTestnetToken]);

  if (!token && !customTestnetToken && !isLoading && !chainSelectorVisible) {
    return (
      <NoTokenWrapper>
        <div className="content flex-1">
          <img src={IconWarning} className="icon icon-warning" />
          <p>{t('page.addToken.tokenNotFound')}</p>
        </div>
        <div className="footer h-[80px] items-center justify-center">
          <Button
            type="primary"
            size="large"
            className="w-[200px] h-[44px]"
            onClick={() => rejectApproval('User rejected the request.')}
          >
            OK
          </Button>
        </div>
      </NoTokenWrapper>
    );
  }

  return (
    <Spin spinning={isLoading}>
      <AddAssetWrapper>
        <div className="header">{t('page.addToken.title')}</div>
        <div className="token flex flex-col gap-12">
          {token ? (
            <>
              <div className={clsx('flex items-center')}>
                <div className="flex items-center mr-8">
                  <div className="relative h-[24px]">
                    <Image
                      className="w-24 h-24 rounded-full"
                      src={token.logo_url || IconUnknown}
                      fallback={IconUnknown}
                      preview={false}
                    />
                    <TooltipWithMagnetArrow
                      title={currentChain?.name}
                      className="rectangle w-[max-content]"
                    >
                      <img
                        className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                        src={currentChain?.logo || IconUnknown}
                      />
                    </TooltipWithMagnetArrow>
                  </div>

                  <div
                    className="token-symbol ml-8 text-r-neutral-title-1 text-20 font-medium"
                    title={getTokenSymbol(token)}
                  >
                    {ellipsisOverflowedText(getTokenSymbol(token), 16)}
                  </div>
                </div>
              </div>
              <TokenCharts token={token}></TokenCharts>
              <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
                <div className="balance-content overflow-hidden flex flex-col gap-8 px-16 py-12">
                  <div className="flex flex-row justify-between w-full">
                    <div className="balance-title text-r-neutral-body text-13">
                      {t('page.dashboard.tokenDetail.myBalance')}
                    </div>
                    <div></div>
                  </div>
                  <div className="flex flex-row justify-between w-full">
                    <div className="flex flex-row gap-8 items-center">
                      <Image
                        className="w-24 h-24 rounded-full"
                        src={token.logo_url || IconUnknown}
                        fallback={IconUnknown}
                        preview={false}
                      />
                      <TooltipWithMagnetArrow
                        className="rectangle w-[max-content]"
                        title={(token.amount || 0).toString()}
                        placement="bottom"
                      >
                        <div className="balance-value truncate text-r-neutral-title-1 text-15 font-medium">
                          {splitNumberByStep((token.amount || 0)?.toFixed(8))}{' '}
                          {ellipsisOverflowedText(getTokenSymbol(token), 8)}
                        </div>
                      </TooltipWithMagnetArrow>
                    </div>
                    <TooltipWithMagnetArrow
                      title={`≈ $${(
                        token.amount * token.price || 0
                      ).toString()}`}
                      className="rectangle w-[max-content]"
                      placement="bottom"
                    >
                      <div className="balance-value-usd truncate text-r-neutral-body text-15 font-normal">
                        ≈ $
                        {splitNumberByStep(
                          (token.amount * token.price || 0)?.toFixed(2)
                        )}
                      </div>
                    </TooltipWithMagnetArrow>
                  </div>
                </div>
              </div>
              <TokenChainAndContract
                entityLoading={entityLoading}
                token={token}
                tokenEntity={tokenEntity}
                popupHeight={494}
              ></TokenChainAndContract>
              <div className="token-history flex flex-col">
                {isTokenHistoryLoaded && tokenHistory.length <= 0 && (
                  <div className="empty bg-r-neutral-card-1 rounded-[8px] pb-[30px] pt-[30px]">
                    <img className="no-data" src="./images/nodata-tx.png" />
                    <p className="text-[12px] text-r-neutral-body mt-[12px]">
                      {t('page.dashboard.tokenDetail.noTransactions')}
                    </p>
                  </div>
                )}
                {tokenHistory.map((item) => (
                  <HistoryItem
                    data={item}
                    projectDict={item.projectDict}
                    cateDict={item.cateDict}
                    tokenDict={item.tokenDict}
                    canClickToken={false}
                    key={item.id}
                  />
                ))}
              </div>
            </>
          ) : customTestnetToken ? (
            <>
              <div className={clsx('flex items-center')}>
                <div className="flex items-center mr-8">
                  <div className="relative h-[24px]">
                    <Image
                      className="w-24 h-24 rounded-full"
                      src={customTestnetToken.logo || IconUnknown}
                      fallback={IconUnknown}
                      preview={false}
                    />
                    <TooltipWithMagnetArrow
                      title={currentChain?.name}
                      className="rectangle w-[max-content]"
                    >
                      <img
                        className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                        src={currentChain?.logo || IconUnknown}
                      />
                    </TooltipWithMagnetArrow>
                  </div>

                  <div
                    className="token-symbol ml-8 text-r-neutral-title-1 text-20 font-medium"
                    title={customTestnetToken.symbol}
                  >
                    {customTestnetToken.symbol}
                  </div>
                </div>
              </div>
              <TokenCharts
                token={(customTestnetToken as any) as TokenItem}
              ></TokenCharts>
              <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
                <div className="balance-content overflow-hidden flex flex-col gap-8 px-16 py-12">
                  <div className="flex flex-row justify-between w-full">
                    <div className="balance-title text-r-neutral-body text-13">
                      {t('page.dashboard.tokenDetail.myBalance')}
                    </div>
                    <div></div>
                  </div>
                  <div className="flex flex-row justify-between w-full">
                    <div className="flex flex-row gap-8 items-center">
                      <Image
                        className="w-24 h-24 rounded-full"
                        src={customTestnetToken.logo || IconUnknown}
                        fallback={IconUnknown}
                        preview={false}
                      />
                      <div className="balance-value truncate text-r-neutral-title-1 text-15 font-medium">
                        {splitNumberByStep(
                          (customTestnetToken.amount || 0)?.toFixed(8)
                        )}{' '}
                        {customTestnetToken.symbol}
                      </div>
                    </div>
                    <div></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
                <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
                  <img src={IconNoFind} className="w-14 mr-4" />
                  {t('page.dashboard.tokenDetail.noIssuer')}
                </div>
              </div>
              <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
                <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
                  <img src={IconNoFind} className="w-14 mr-4" />
                  {t('page.dashboard.tokenDetail.NoListedBy')}
                </div>
              </div>
              <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
                <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
                  <img src={IconNoFind} className="w-14 mr-4" />
                  {t('page.dashboard.tokenDetail.NoSupportedExchanges')}
                </div>
              </div>
              <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
                <div className="flex flex-row justify-between w-full px-16 py-12">
                  <span className="text-r-neutral-body text-[13px] font-normal">
                    {t('page.dashboard.tokenDetail.TokenName')}
                  </span>
                  <span className="text-r-neutral-title-1 text-13 font-medium">
                    {customTestnetToken.symbol || ''}
                  </span>
                </div>
                <div className="flex flex-row justify-between w-full px-16 py-12">
                  <span className="text-r-neutral-body text-[13px] font-normal">
                    {t('page.dashboard.tokenDetail.Chain')}
                  </span>
                  <div className="flex flex-row items-center gap-6">
                    <img
                      src={currentChain?.logo || IconUnknown}
                      className="w-16 h-16"
                    />
                    <span className="text-r-neutral-title-1 text-13 font-medium">
                      {currentChain?.name}
                    </span>
                  </div>
                </div>
                {
                  <div className="flex flex-row justify-between w-full px-16 py-12">
                    <span className="text-r-neutral-body text-[13px] font-normal">
                      {t('page.dashboard.tokenDetail.ContractAddress')}
                    </span>
                    <div className="flex flex-row items-center gap-6">
                      <span className="text-r-neutral-title-1 text-13 font-medium">
                        {ellipsis(customTestnetToken.id)}
                      </span>
                      <ThemeIcon
                        src={RcIconExternal}
                        className="w-14 cursor-pointer"
                        onClick={handleOpenExplorer}
                      />
                      <Copy
                        data={customTestnetToken.id}
                        variant="address"
                        className="w-14 cursor-pointer"
                      />
                    </div>
                  </div>
                }
                <div className="flex flex-row justify-between w-full px-16 py-12">
                  <div className="flex flex-row items-center gap-4">
                    <span className="text-r-neutral-body text-[13px] font-normal">
                      {'FDV'}
                    </span>
                  </div>
                  <span className="text-r-neutral-title-1 text-13 font-medium">
                    {'-'}
                  </span>
                </div>
              </div>
              <div className="token-history  flex flex-col">
                {isTokenHistoryLoaded && tokenHistory.length <= 0 && (
                  <div className="empty bg-r-neutral-card-1 rounded-[8px] pb-[30px] pt-[30px]">
                    <img className="no-data" src="./images/nodata-tx.png" />
                    <p className="text-[12px] text-r-neutral-body mt-[12px]">
                      {t('page.dashboard.tokenDetail.noTransactions')}
                    </p>
                  </div>
                )}
                {tokenHistory.map((item) => (
                  <HistoryItem
                    data={item}
                    projectDict={item.projectDict}
                    cateDict={item.cateDict}
                    tokenDict={item.tokenDict}
                    canClickToken={false}
                    key={item.id}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="footer h-[80px] flex items-center relative">
          <div
            className={'action-buttons w-[100%] flex justify-center gap-[16px]'}
          >
            <Button
              type="ghost"
              className="w-[172px] h-[44px] border-blue-light text-blue-light hover:bg-[#8697FF1A] active:bg-[#0000001A] rounded-[8px]"
              onClick={() => rejectApproval('User rejected the request.')}
            >
              {t('global.cancelButton')}
            </Button>
            <TooltipWithMagnetArrow
              inApproval
              overlayClassName="rectangle w-[max-content]"
              title={addButtonStatus.reason}
            >
              <Button
                type="primary"
                size="large"
                className="w-[172px] h-[44px]"
                disabled={addButtonStatus.disable}
                onClick={handleConfirm}
              >
                {t('global.addButton')}
              </Button>
            </TooltipWithMagnetArrow>
          </div>
          <ChainSelectorModal
            title={t('page.addToken.tokenOnMultiChains')}
            visible={chainSelectorVisible}
            supportChains={supportChains}
            onChange={handleChainChanged}
            onCancel={() => rejectApproval('User rejected the request.')}
            disabledTips={t('page.addToken.noTokenFoundOnThisChain')}
            showRPCStatus
          />
        </div>
      </AddAssetWrapper>
    </Spin>
  );
};

export default AddAsset;
