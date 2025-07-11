import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Form, message, Button } from 'antd';
import { isValidAddress } from '@ethereumjs/util';
import abiCoderInst, { AbiCoder } from 'web3-eth-abi';
import { useRequest } from 'ahooks';
import { CHAINS_ENUM, KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import { useRabbyDispatch, connectStore } from 'ui/store';
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
import { MiniApproval } from '../Approval/components/MiniSignTx';

import { findChain, findChainByEnum } from '@/utils/chain';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { getAddressScanLink } from '@/utils';
import ChainIcon from '@/ui/component/ChainIcon';
import { useAddressInfo } from '@/ui/hooks/useAddressInfo';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { withAccountChange } from '@/ui/utils/withAccountChange';
import { Tx } from 'background/service/openapi';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ToAddressCard } from '../SendToken';

const isTab = getUiType().isTab;
const getContainer = isTab ? '.js-rabby-popup-container' : undefined;

const abiCoder = (abiCoderInst as unknown) as AbiCoder;

const SendNFT = () => {
  const wallet = useWallet();
  const history = useHistory();
  const { search } = useLocation();
  const { t } = useTranslation();
  const rbisource = useRbiSource();
  const dispatch = useRabbyDispatch();

  const currentAccount = useCurrentAccount();
  const [chain, setChain] = useState<CHAINS_ENUM | undefined>(undefined);

  const amountInputEl = useRef<any>(null);

  const { useForm } = Form;

  const [form] = useForm<{ to: string; amount: number }>();
  const [inited, setInited] = useState(false);

  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const [miniSignTx, setMiniSignTx] = useState<Tx | null>(null);
  const [, setRefreshId] = useState(0);

  const chainInfo = useMemo(() => {
    return findChain({ enum: chain });
  }, [chain]);

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

  const canSubmit =
    isValidAddress(form.getFieldValue('to')) &&
    new BigNumber(form.getFieldValue('amount')).isGreaterThan(0);

  const miniSignTxs = useMemo(() => {
    return miniSignTx ? [miniSignTx] : [];
  }, [miniSignTx]);

  const canUseMiniTx = useMemo(() => {
    return (
      [
        KEYRING_TYPE.SimpleKeyring,
        KEYRING_TYPE.HdKeyring,
        KEYRING_CLASS.HARDWARE.LEDGER,
      ].includes((currentAccount?.type || '') as any) && !chainInfo?.isTestnet
    );
  }, [chainInfo?.isTestnet, currentAccount?.type]);

  const handleClickContractId = () => {
    if (!chain || !nftItem) return;
    const targetChain = findChainByEnum(chain);
    if (!targetChain) return;

    openInTab(
      getAddressScanLink(targetChain.scanLink, nftItem.contract_id),
      false
    );
  };

  const getNFTTransferParams = useCallback(
    (amount: number): Record<string, any> => {
      if (!nftItem || !chainInfo || !currentAccount) {
        throw new Error('Missing required data for NFT transfer');
      }
      const params: Record<string, any> = {
        chainId: chainInfo.id,
        from: currentAccount.address,
        to: nftItem.contract_id,
        value: '0x0',
        data: nftItem.is_erc1155
          ? abiCoder.encodeFunctionCall(
              {
                name: 'safeTransferFrom',
                type: 'function',
                inputs: [
                  { type: 'address', name: 'from' },
                  { type: 'address', name: 'to' },
                  { type: 'uint256', name: 'id' },
                  { type: 'uint256', name: 'amount' },
                  { type: 'bytes', name: 'data' },
                ] as any[],
              } as const,
              [
                currentAccount.address,
                toAddress,
                nftItem.inner_id,
                amount,
                '0x',
              ] as any[]
            )
          : abiCoder.encodeFunctionCall(
              {
                name: 'safeTransferFrom',
                type: 'function',
                inputs: [
                  { type: 'address', name: 'from' },
                  { type: 'address', name: 'to' },
                  { type: 'uint256', name: 'tokenId' },
                ] as any[],
              } as const,
              [currentAccount.address, toAddress, nftItem.inner_id] as any[]
            ),
      };

      return params;
    },
    [nftItem, chainInfo, currentAccount, toAddress]
  );

  const { runAsync: handleSubmit, loading: isSubmitLoading } = useRequest(
    async ({ amount }: { amount: number }) => {
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
        const params = getNFTTransferParams(amount);
        if (canUseMiniTx) {
          setMiniSignTx(params as Tx);
          setIsShowMiniSign(true);
          return;
        }
        const promise = wallet.sendRequest({
          method: 'eth_sendTransaction',
          params: [params as Record<string, any>],
          $ctx: {
            ga: {
              category: 'Send',
              source: 'sendNFT',
              trigger: filterRbiSource('sendNFT', rbisource) && rbisource,
            },
          },
        });
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
    },
    {
      manual: true,
    }
  );

  const handleMiniSignResolve = useCallback(() => {
    setTimeout(() => {
      setIsShowMiniSign(false);
      setMiniSignTx(null);
      if (!isTab) {
        history.replace('/');
      }
      form.setFieldsValue({ amount: 1 });
      setRefreshId((e) => e + 1);
    }, 500);
  }, [form, history]);

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
    setInited(true);
  };

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
          isShowAccount
          disableSwitchAccount
          rightSlot={
            isTab ? null : (
              <div
                className="text-r-neutral-title1 absolute right-0 cursor-pointer top-1/2 -translate-y-1/2"
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
                <div className="section-title justify-between items-center flex">
                  <span className="section-title__to font-medium">
                    {t('page.sendNFT.sectionTo.title')}
                  </span>
                  <div
                    className="cursor-pointer text-r-neutral-title1"
                    onClick={() => {
                      const query = new URLSearchParams(search);
                      query.set(
                        'nftItem',
                        encodeURIComponent(JSON.stringify(nftItem))
                      );
                      query.set('to', toAddress);
                      history.push(`/send-poly?${query.toString()}`);
                    }}
                  >
                    <RcIconSwitchCC width={20} height={20} />
                  </div>
                </div>
                <div className="to-address">
                  {targetAccount && (
                    <ToAddressCard
                      account={targetAccount}
                      cexInfo={addressDesc?.cex}
                    />
                  )}
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
            <div className="btn-wrapper w-[100%] flex justify-center">
              <Button
                disabled={!canSubmit}
                type="primary"
                htmlType="submit"
                size="large"
                className="w-[100%] h-[48px] text-[16px]"
                loading={isSubmitLoading}
              >
                {t('page.sendNFT.sendButton')}
              </Button>
            </div>
          </div>
        </Form>
        <MiniApproval
          txs={miniSignTxs}
          visible={isShowMiniSign}
          ga={{
            category: 'Send',
            source: 'sendNFT',
            trigger: filterRbiSource('sendNFT', rbisource) && rbisource,
          }}
          onClose={() => {
            setRefreshId((e) => e + 1);
            setIsShowMiniSign(false);
            setTimeout(() => {
              setMiniSignTx(null);
            }, 500);
          }}
          onReject={() => {
            setRefreshId((e) => e + 1);
            setIsShowMiniSign(false);
            setMiniSignTx(null);
          }}
          onResolve={handleMiniSignResolve}
          getContainer={getContainer}
        />
      </div>
    </FullscreenContainer>
  );
};

export default isTab
  ? connectStore()(withAccountChange(SendNFT))
  : connectStore()(SendNFT);
