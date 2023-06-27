import {
  TokenItem,
  TxHistoryResult,
  TxHistoryItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { Button } from 'antd';
import clsx from 'clsx';
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
} from 'ui/utils';
import { Spin } from 'ui/component';
import { TooltipWithMagnetArrow } from 'ui/component/Tooltip/TooltipWithMagnetArrow';
import { CopyChecked } from 'ui/component/CopyChecked';
import { getTokenSymbol } from 'ui/utils/token';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import { ellipsis } from 'ui/utils/address';
import { Token } from 'background/service/preference';
import IconExternalLink from 'ui/assets/open-external-gray.svg';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import IconWarning from 'ui/assets/icon-subtract.svg';

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
  height: 100vh;
  overflow: hidden;
  .header {
    padding: 20px;
    text-align: center;
    background-color: #8697ff;
    color: #fff;
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
        background-color: #f5f6fa;
        color: #707280;
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
          color: #13141a;
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
      overflow: auto;
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
    background-color: #fff;
    border-top: 0.5px solid #e5e9ef;
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
    .icon-warning {
      margin: 0 auto 40px;
    }
  }
  .footer {
    display: flex;
    justify-content: center;
    padding: 24px;
    background-color: #fff;
    border-top: 0.5px solid #e5e9ef;
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
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [token, setToken] = useState<TokenItem | null>(null);
  const [chainSelectorVisible, setChainSelectorVisible] = useState(false);
  const [tokenHistory, setTokenHistory] = useState<TokenHistoryItem[]>([]);
  const [isTokenHistoryLoaded, setIsTokenHistoryLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customTokens, setCustomTokens] = useState<Token[]>([]);

  const addButtonStatus = useMemo(() => {
    if (!token)
      return {
        disable: true,
        reason: 'No token found',
      };
    if (token?.is_core) {
      return {
        disable: true,
        reason: 'Token has been supported on Rabby',
      };
    }
    const isCustom = customTokens.some(
      (t) => isSameAddress(t.address, token.id) && token.chain === t.chain
    );
    if (isCustom) {
      return {
        disable: true,
        reason: 'Current token has already been added to customized',
      };
    }
    return {
      disable: false,
      reason: '',
    };
  }, [customTokens, token]);

  const currentChain = useMemo(() => {
    if (!token) return CHAINS[CHAINS_ENUM.ETH];
    const list = Object.values(CHAINS);
    const target = list.find((item) => item.serverId === token.chain);
    return target || CHAINS[CHAINS_ENUM.ETH];
  }, [token]);

  const supportChains = useMemo(() => {
    const list = Object.values(CHAINS);
    const chains: CHAINS_ENUM[] = [];
    tokens.forEach((token) => {
      const targetChain = list.find((chain) => chain.serverId === token.chain);
      if (targetChain) {
        chains.push(targetChain.enum);
      }
    });
    return chains;
  }, [tokens]);

  const handleChainChanged = (id: CHAINS_ENUM) => {
    const chain = CHAINS[id];
    if (chain) {
      const t = tokens.find((token) => token.chain === chain.serverId);
      if (t) {
        setToken(t);
      }
    }
    setChainSelectorVisible(false);
  };

  const handleOpenExplorer = () => {
    if (token) {
      const explorer = currentChain.scanLink.replace('/tx/_s_', '');
      const url = `${explorer}/address/${token.id}`;
      openInTab(url, false);
    }
  };

  const init = async () => {
    const account = await wallet.getCurrentAccount();
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
    }
    setCustomTokens(customTokens);
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
    if (!token) return;
    resolveApproval({
      id: token.id,
      chain: token.chain,
    });
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (token) {
      getTokenHistory(token);
    }
  }, [token]);

  if (!token && !isLoading && !chainSelectorVisible) {
    return (
      <NoTokenWrapper>
        <div className="content flex-1">
          <img src={IconWarning} className="icon icon-warning" />
          <p>Token not found from this contract address</p>
        </div>
        <div className="footer">
          <Button
            type="primary"
            size="large"
            className="w-[200px] h-[48px]"
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
        <div className="header">Add custom token to Rabby</div>
        <div className="token">
          {token && (
            <>
              <div className="token-info">
                <img
                  src={token.logo_url || IconUnknown}
                  className="icon icon-token"
                />
                <span className="token-symbol">{getTokenSymbol(token)}</span>
                <div className="token-address">
                  <img src={currentChain.logo} className="icon icon-chain" />
                  {ellipsis(token.id)}
                  <img
                    src={IconExternalLink}
                    className="icon icon-open-external cursor-pointer"
                    onClick={handleOpenExplorer}
                  />
                  <CopyChecked
                    addr={token.id}
                    className="w-14 h-14 cursor-pointer"
                  />
                </div>
              </div>
              <div className="token-balance">
                <div>{getTokenSymbol(token)} Balance</div>
                <div>
                  <span className="amount">
                    {formatTokenAmount(token.amount)}
                  </span>{' '}
                  ≈{' '}
                  {formatUsdValue(
                    new BigNumber(token.amount).times(token.price).toFixed()
                  )}
                </div>
              </div>
              <div className="token-history">
                {isTokenHistoryLoaded && tokenHistory.length <= 0 && (
                  <div className="empty">
                    <img className="no-data" src="./images/nodata-tx.png" />
                    <p className="text-14 text-gray-content mt-12">
                      No Transactions
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
          )}
        </div>
        <div className="footer p-[20px] relative">
          <div
            className={clsx(['action-buttons flex mt-4', 'justify-between'])}
          >
            <Button
              type="ghost"
              className="w-[172px] h-[48px] border-blue-light text-blue-light hover:bg-[#8697FF1A] active:bg-[#0000001A] rounded-[8px]"
              onClick={() => rejectApproval('User rejected the request.')}
            >
              Cancel
            </Button>
            <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[max-content]"
              title={addButtonStatus.reason}
            >
              <Button
                type="primary"
                size="large"
                className="w-[172px] h-[48px]"
                disabled={addButtonStatus.disable}
                onClick={handleConfirm}
              >
                Add
              </Button>
            </TooltipWithMagnetArrow>
          </div>
          <ChainSelectorModal
            title="Token address on multiple chains. Please choose one"
            visible={chainSelectorVisible}
            supportChains={supportChains}
            onChange={handleChainChanged}
            onCancel={() => rejectApproval('User rejected the request.')}
            disabledTips="No token found on this chain"
          />
        </div>
      </AddAssetWrapper>
    </Spin>
  );
};

export default AddAsset;
