import { TokenApproval, TokenItem } from '@/background/service/openapi';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import IconSearch from 'ui/assets/search.svg';
import { Empty, PageHeader, TokenWithChain } from 'ui/component';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import {
  numberWithCommasIsLtOne,
  splitNumberByStep,
  useWallet,
} from 'ui/utils';
import { Loading } from './components/Loading';
import PopupApprovalCard from './components/PopupApprovalCard';
import PopupSearch from './components/PopupSearch';
import './style.less';
import { findChainByEnum } from '@/utils/chain';

const TokenApproval = () => {
  const wallet = useWallet();
  const [list, setList] = useState<TokenApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [isShowSearch, setIsShowSearch] = useState(false);
  const [current, setCurrent] = useState<TokenApproval | null>(null);
  const [isShowPopupCard, setIsShowPopupCard] = useState(false);
  const { t } = useTranslation();
  const history = useHistory();
  const { state } = useLocation<{
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};

  const dispatch = useRabbyDispatch();
  const account = useRabbySelector((state) => state.account.currentAccount);
  const chain = useRabbySelector(
    (state) =>
      state.preference.tokenApprovalChain[
        account?.address?.toLowerCase() || ''
      ] || CHAINS_ENUM.ETH
  );

  const totalRisk = useMemo(() => {
    return list.reduce((sum, item) => {
      return new BigNumber(item.sum_exposure_usd).plus(sum);
    }, new BigNumber(0));
  }, [list]);

  const handleChainChanged = (val: CHAINS_ENUM) => {
    if (val === chain || !account?.address) {
      return;
    }
    dispatch.preference.setTokenApprovalChain({
      address: account.address,
      chain: val,
    });

    setList([]);
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
      const chainItem = findChainByEnum(chain);
      const list = await wallet.openapi.tokenAuthorizedList(
        account.address,
        chainItem!.serverId
      );
      setList(list);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setList([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [account, chain]);

  if (!chain) {
    return null;
  }

  return (
    <div className="token-approval">
      <PageHeader onBack={handleClickBack} forceShowBack fixed>
        {t('Token Approval')}
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
            ${splitNumberByStep(totalRisk.toFixed(2))}
          </div>
        </div>
        <div className="token-approval-list">
          <div
            className="search"
            onClick={() => {
              setIsShowSearch(true);
            }}
          >
            <img src={IconSearch} alt="" />
            <div className="placeholder">
              {t('Search tokens/protocols/addresses')}
            </div>
          </div>
          <div className="token-approval-list-header">
            <div className="column-title">{t('Token/Balance')}</div>
            <div className="column-title">{t('Risk exposure')}</div>
          </div>
          <div className="token-approval-body">
            {loading && <Loading />}

            {!loading &&
              (list.length <= 0 ? (
                <Empty className="py-[90px]">{t('No Approvals')}</Empty>
              ) : (
                list.map((item) => {
                  return (
                    <div
                      className="token-approval-item"
                      key={item.id}
                      onClick={() => {
                        setIsShowPopupCard(true);
                        setCurrent(item);
                      }}
                    >
                      <TokenWithChain
                        token={(item as unknown) as TokenItem}
                        width="24px"
                        height="24px"
                        hideConer
                      ></TokenWithChain>
                      <div className="ml-2">
                        <div className="token-approval-item-title">
                          {numberWithCommasIsLtOne(item.balance, 4)}{' '}
                          {item.symbol}
                        </div>
                        <div className="token-approval-item-desc">
                          $
                          {splitNumberByStep(
                            new BigNumber(item.balance)
                              .multipliedBy(item.price)
                              .toFixed(2)
                          )}
                        </div>
                      </div>
                      <div className="token-approval-item-risk">
                        ${splitNumberByStep(item.sum_exposure_usd.toFixed(2))}
                      </div>
                      <IconArrowRight className="token-approval-item-arrow"></IconArrowRight>
                    </div>
                  );
                })
              ))}
          </div>
        </div>
      </div>
      <PopupSearch
        visible={isShowSearch}
        data={list}
        onClose={() => {
          setIsShowSearch(false);
        }}
      ></PopupSearch>
      <PopupApprovalCard
        visible={isShowPopupCard}
        data={current}
        onClose={() => {
          setIsShowPopupCard(false);
          setCurrent(null);
        }}
      ></PopupApprovalCard>
    </div>
  );
};

export default TokenApproval;
