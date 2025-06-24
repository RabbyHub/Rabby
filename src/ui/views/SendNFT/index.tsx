import React, { useState, useEffect, useRef, useMemo } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Form, message, Button } from 'antd';
import { isValidAddress } from '@ethereumjs/util';
import { CHAINS_ENUM } from 'consts';
import { useRabbyDispatch, connectStore } from 'ui/store';
import { Account } from 'background/service/preference';
import {
  useWallet,
  openInTab,
  getUiType,
  openInternalPageInTab,
} from 'ui/utils';
import { PageHeader, AddressViewer, Copy } from 'ui/component';
import NumberInput from '@/ui/component/NFTNumberInput';
import NFTAvatar from 'ui/views/Dashboard/components/NFT/NFTAvatar';
import { ReactComponent as RcIconSwitchCC } from '@/ui/assets/send-token/switch-cc.svg';
import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { ReactComponent as RcIconExternal } from 'ui/assets/icon-share-currentcolor.svg';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/fullscreen-cc.svg';

import { findChain, findChainByEnum } from '@/utils/chain';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { getAddressScanLink } from '@/utils';
import ChainIcon from '@/ui/component/ChainIcon';
import { ellipsis } from '@/ui/utils/address';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { useAddressInfo } from '@/ui/hooks/useAddressInfo';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { withAccountChange } from '@/ui/utils/withAccountChange';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const SendNFT = () => {
  const wallet = useWallet();
  const history = useHistory();
  const { search } = useLocation();
  const { t } = useTranslation();
  const rbisource = useRbiSource();
  const dispatch = useRabbyDispatch();

  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [chain, setChain] = useState<CHAINS_ENUM | undefined>(undefined);

  const amountInputEl = useRef<any>(null);

  const { useForm } = Form;

  const [form] = useForm<{ to: string; amount: number }>();
  const [inited, setInited] = useState(false);

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    new BigNumber(form.getFieldValue('amount')).isGreaterThan(0);

  const handleClickContractId = () => {
    if (!chain || !nftItem) return;
    const targetChain = findChainByEnum(chain);
    if (!targetChain) return;

    openInTab(
      getAddressScanLink(targetChain.scanLink, nftItem.contract_id),
      false
    );
  };

  const handleSubmit = async ({ amount }: { amount: number }) => {
    if (!nftItem) return;
    await wallet.setPageStateCache({
      path: '/send-nft',
      search: history.location.search,
      params: {},
      states: {
        values: form.getFieldsValue(),
        nftItem,
      },
    });

    try {
      matomoRequestEvent({
        category: 'Send',
        action: 'createTx',
        label: [
          findChainByEnum(chain)?.name,
          getKRCategoryByType(currentAccount?.type),
          currentAccount?.brandName,
          'nft',
          filterRbiSource('sendNFT', rbisource) && rbisource,
        ].join('|'),
      });

      const promise = wallet.transferNFT(
        {
          to: toAddress,
          amount: amount,
          tokenId: nftItem.inner_id,
          chainServerId: nftItem.chain,
          contractId: nftItem.contract_id,
          abi: nftItem.is_erc1155 ? 'ERC1155' : 'ERC721',
        },
        {
          ga: {
            category: 'Send',
            source: 'sendNFT',
            trigger: filterRbiSource('sendNFT', rbisource) && rbisource,
          },
        }
      );
      if (isTab) {
        await promise;
        form.setFieldsValue({
          amount: 1,
        });
      } else {
        window.close();
      }
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.push('/');
    }
  };

  const initByCache = async () => {
    if (!nftItem) {
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache?.path === history.location.pathname) {
          if (cache.states.values) {
            form.setFieldsValue(cache.states.values);
          }
        }
      }
    }
  };

  const init = async () => {
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
    dispatch.contactBook.getContactBookAsync();
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }

    setCurrentAccount(account);
    setInited(true);
  };

  const { balance: currentAccountBalance } = useCurrentBalance(
    currentAccount?.address
  );

  const chainInfo = useMemo(() => {
    return findChain({ enum: chain });
  }, [chain]);

  // 从 URL query 参数中获取 nftItem 和 to 地址
  const nftItem = useMemo(() => {
    const query = new URLSearchParams(search);
    const nftItemParam = query.get('nftItem');

    if (nftItemParam) {
      try {
        const decodedNftItem = decodeURIComponent(nftItemParam);
        const parsedNftItem = JSON.parse(decodedNftItem);
        return parsedNftItem;
      } catch (error) {
        return null;
      }
    }
    return null;
  }, [search]);

  const toAddress = useMemo(() => {
    const query = new URLSearchParams(search);
    const toParam = query.get('to');
    return toParam || '';
  }, [search]);

  const { targetAccount, addressDesc } = useAddressInfo(toAddress);

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  useEffect(() => {
    if (inited) initByCache();
  }, [inited]);

  useEffect(() => {
    if (nftItem) {
      if (!chain) {
        const nftChain = findChain({
          serverId: nftItem.chain,
        })?.enum;
        if (!nftChain) {
          history.replace('/');
        } else {
          setChain(nftChain);
        }
      }
    }
  }, [nftItem, chain]);

  useEffect(() => {
    if (toAddress) {
      const values = form.getFieldsValue();
      form.setFieldsValue({
        ...values,
        to: toAddress,
      });
    }
  }, [toAddress, form]);

  return (
    <FullscreenContainer className="h-[700px]">
      <div
        className={clsx(
          'transfer-nft overflow-y-scroll',
          isTab
            ? 'w-full h-full overflow-auto min-h-0 rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
            : ''
        )}
      >
        <PageHeader
          onBack={handleClickBack}
          forceShowBack={!isTab}
          canBack={!isTab}
          rightSlot={
            isTab ? null : (
              <div
                className="text-r-neutral-title1 absolute right-0 cursor-pointer"
                onClick={() => {
                  openInternalPageInTab(`send-nft${history.location.search}`);
                }}
              >
                <RcIconFullscreen />
              </div>
            )
          }
        >
          {t('page.sendNFT.header.title')}
        </PageHeader>
        <Form
          form={form}
          onFinish={handleSubmit}
          initialValues={{
            to: toAddress,
            amount: 1,
          }}
        >
          {nftItem && (
            <div className="flex-1 overflow-auto">
              <div className="section relative">
                <div className="section-title">
                  {t('page.sendNFT.sectionFrom.title')}
                </div>
                <AccountItem
                  balance={currentAccountBalance || 0}
                  address={currentAccount?.address || ''}
                  type={currentAccount?.type || ''}
                  brandName={currentAccount?.brandName || ''}
                  onClick={() => {}}
                  disabled={true}
                  className="w-full bg-r-neutral-card1 rounded-[8px]"
                />
                <div className="section-title mt-[20px]">
                  {t('page.sendNFT.sectionTo.title')}
                </div>
                <div className="to-address">
                  <AccountItem
                    balance={
                      targetAccount?.balance || addressDesc?.usd_value || 0
                    }
                    address={targetAccount?.address || ''}
                    type={targetAccount?.type || ''}
                    alias={
                      targetAccount?.address
                        ? ellipsis(targetAccount?.address)
                        : ''
                    }
                    brandName={targetAccount?.brandName || ''}
                    onClick={() => {
                      const query = new URLSearchParams(search);
                      query.set(
                        'nftItem',
                        encodeURIComponent(JSON.stringify(nftItem))
                      );
                      query.set('to', toAddress);
                      history.push(`/send-poly?${query.toString()}`);
                    }}
                    className="w-full bg-r-neutral-card1 rounded-[8px]"
                    rightIcon={
                      <div className="text-r-neutral-foot">
                        <RcIconSwitchCC width={20} height={20} />
                      </div>
                    }
                  />
                </div>
              </div>
              <div className={clsx('section')}>
                <div className="section-title mt-[20px]">
                  {t('page.sendNFT.sectionAmount.title')}
                </div>
                <div className="nft-info">
                  <div className="nft-info__inner">
                    <NFTAvatar
                      type={nftItem.content_type}
                      content={nftItem.content}
                      className="w-[80px] h-[80px]"
                    />
                    <div className="nft-info__detail">
                      <h3>{nftItem.name}</h3>
                      <div className="nft-info__detail__inner">
                        <p>
                          <span className="field-name">
                            {t('page.sendNFT.nftInfoFieldLabel.Collection')}
                          </span>
                          <span className="value">
                            {nftItem.collection?.name || '-'}
                          </span>
                        </p>
                        <p>
                          <span className="field-name">
                            {t('page.sendNFT.sectionChain.title')}
                          </span>
                          <span className="value">
                            <ChainIcon
                              chain={chain!}
                              size={'small'}
                              innerClassName="chain-icon w-[12px] h-[12px]"
                            />
                            <span className={clsx('name')}>
                              {chainInfo?.name}
                            </span>
                          </span>
                        </p>
                        <p>
                          <span className="field-name">
                            {t('page.sendNFT.nftInfoFieldLabel.Contract')}
                          </span>
                          <span className="value gap-[4px]">
                            <AddressViewer
                              address={nftItem.contract_id}
                              showArrow={false}
                            />
                            <ThemeIcon
                              src={RcIconExternal}
                              className="icon icon-copy text-r-neutral-foot"
                              onClick={handleClickContractId}
                            />
                            <Copy
                              data={nftItem.contract_id}
                              variant="address"
                              className="text-r-neutral-foot w-14 h-14"
                            />
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="section-footer">
                    <span>
                      {t('page.sendNFT.nftInfoFieldLabel.sendAmount')}
                    </span>

                    <Form.Item name="amount">
                      <NumberInput
                        max={nftItem.amount}
                        nftItem={nftItem}
                        disabled={!nftItem.is_erc1155}
                        ref={amountInputEl}
                      />
                    </Form.Item>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={clsx('footer', isTab ? 'rounded-b-[16px]' : '')}>
            <div className="btn-wrapper w-[100%] px-[20px] flex justify-center">
              <Button
                disabled={!canSubmit}
                type="primary"
                htmlType="submit"
                size="large"
                className="w-[100%] h-[48px] text-[16px]"
              >
                {t('page.sendNFT.sendButton')}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </FullscreenContainer>
  );
};

export default isTab
  ? connectStore()(withAccountChange(SendNFT))
  : connectStore()(SendNFT);
