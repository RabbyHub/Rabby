import { TokenApproval, TokenItem } from '@/background/service/openapi';
import { Account } from '@/background/service/preference';
import { Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import IconSearch from 'ui/assets/search.svg';
import { Empty, Loading, PageHeader, TokenWithChain } from 'ui/component';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import {
  numberWithCommasIsLtOne,
  splitNumberByStep,
  useWallet,
} from 'ui/utils';
import PopupApprovalCard from './components/PopupApprovalCard';
import PopupSearch from './components/PopupSearch';
import './style.less';

const TokenApproval = () => {
  const wallet = useWallet();
  const [chain, setChain] = useState<CHAINS_ENUM | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
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

  const totalRisk = useMemo(() => {
    return list.reduce((sum, item) => {
      return new BigNumber(item.sum_exposure_usd).plus(sum);
    }, new BigNumber(0));
  }, [list]);

  const handleChainChanged = (val: CHAINS_ENUM) => {
    wallet.setTokenApprovalChain(currentAccount?.address, val);
    setChain(val);
    setList([]);
  };

  const handleClickBack = () => {
    history.replace('/');
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    const chain: CHAINS_ENUM = await wallet.getTokenApprovalChain(
      account.address
    );
    setCurrentAccount(account);
    setChain(chain);
  };

  const fetchData = async (chain) => {
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }
    if (!chain) {
      return;
    }

    setLoading(true);
    try {
      const list = await wallet.openapi.tokenAuthorizedList(
        account.address,
        CHAINS[chain]?.serverId
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
    init();
  }, []);

  useEffect(() => {
    fetchData(chain);
  }, [chain]);

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
        <div className="card-risk-amount">
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
            <Loading loading={loading} className="py-[120px]">
              {t('Loading')}
            </Loading>

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
