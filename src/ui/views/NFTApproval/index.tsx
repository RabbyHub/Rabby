import {
  NFTApproval as INFTApproval,
  NFTApprovalContract,
  NFTApprovalResponse,
} from '@/background/service/openapi';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { message, Tabs, Tooltip } from 'antd';
import { CHAINS_ENUM } from 'consts';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import IconInfo from 'ui/assets/infoicon.svg';
import { PageHeader } from 'ui/component';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { useWallet } from 'ui/utils';
import NFTContractList from './components/NFTContractList';
import NFTList from './components/NFTList';
import PopupSearch from './components/PopupSearch';
import './style.less';
import { getAmountText } from './utils';
import { findChainByEnum } from '@/utils/chain';
const { TabPane } = Tabs;

const NFTApproval = () => {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [isShowSearch, setIsShowSearch] = useState(false);
  const [data, setData] = useState<NFTApprovalResponse | null>(null);
  const { t } = useTranslation();
  const history = useHistory();
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};

  const account = useRabbySelector((state) => state.account.currentAccount);
  const dispatch = useRabbyDispatch();

  const chain = useRabbySelector(
    (state) =>
      state.preference.nftApprovalChain[
        account?.address?.toLowerCase() || ''
      ] || CHAINS_ENUM.ETH
  );

  const handleChainChanged = (val: CHAINS_ENUM) => {
    if (val === chain || !account?.address) {
      return;
    }
    dispatch.preference.setNFTApprovalChain({
      address: account?.address,
      chain: val,
    });
    setData(null);
  };

  const handleClickBack = () => {
    history.replace('/');
  };

  const fetchData = async () => {
    if (!account || !chain) {
      return;
    }

    setLoading(true);
    try {
      const data = await wallet.openapi.userNFTAuthorizedList(
        account.address,
        findChainByEnum(chain)?.serverId || ''
      );
      setData(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(null);
    }
  };
  const handleDecline = async ({
    contract,
    token,
  }: {
    contract?: NFTApprovalContract;
    token?: INFTApproval;
  }) => {
    try {
      if (contract) {
        const abi = contract?.is_erc721
          ? 'ERC721'
          : contract?.is_erc1155
          ? 'ERC1155'
          : '';
        wallet.revokeNFTApprove(
          {
            chainServerId: contract?.chain,
            contractId: contract?.contract_id,
            spender: contract?.spender.id,
            abi,
            tokenId: token?.inner_id,
            isApprovedForAll: true,
          },
          {
            ga: {
              category: 'Security',
              source: 'nftApproval',
            },
          }
        );
      } else if (token) {
        const abi = token?.is_erc721
          ? 'ERC721'
          : token?.is_erc1155
          ? 'ERC1155'
          : '';
        wallet.revokeNFTApprove(
          {
            chainServerId: token?.chain,
            contractId: token?.contract_id,
            spender: token?.spender?.id,
            abi,
            tokenId: token?.inner_id,
            isApprovedForAll: false,
          },
          {
            ga: {
              category: 'Security',
              source: 'nftApproval',
            },
          }
        );
      }
      window.close();
    } catch (e) {
      message.error(e.message);
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [chain, account]);

  if (!chain) {
    return null;
  }

  return (
    <div className="nft-approval">
      <PageHeader onBack={handleClickBack} forceShowBack fixed>
        {t('NFT Approval')}
      </PageHeader>
      <div>
        <TagChainSelector
          value={chain}
          onChange={handleChainChanged}
          showModal={showChainsModal}
        />
        <div className="card-risk-amount relative">
          <div className="card-risk-amount-title">
            <span>{t('Total risk exposure')}</span>
            <Tooltip
              align={{ offset: [55, 0] }}
              placement="top"
              overlayClassName="rectangle max-w-[250px] hide-arrow"
              title={t(
                'The total amount of assets affected by approval-related security issues'
              )}
            >
              <div>
                <img src={IconInfo} alt="" />
              </div>
            </Tooltip>
          </div>
          <div className="card-risk-amount-content">
            {getAmountText(data?.total || 0)}
          </div>
        </div>
        <Tabs>
          <TabPane tab={t('By Contract')} key="1">
            <NFTContractList
              data={data?.contracts}
              loading={loading}
              onSearch={() => {
                setIsShowSearch(true);
              }}
              onDecline={(item) => {
                handleDecline({ contract: item });
              }}
            ></NFTContractList>
          </TabPane>
          <TabPane tab={t('By NFT')} key="2">
            <NFTList
              data={data?.tokens}
              loading={loading}
              onSearch={() => {
                setIsShowSearch(true);
              }}
              onDecline={(item) => {
                handleDecline({ token: item });
              }}
            ></NFTList>
          </TabPane>
        </Tabs>
      </div>
      <PopupSearch
        visible={isShowSearch}
        data={data}
        onClose={() => {
          setIsShowSearch(false);
        }}
        onDecline={handleDecline}
      ></PopupSearch>
    </div>
  );
};

export default NFTApproval;
