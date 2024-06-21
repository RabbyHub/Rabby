/** eslint-enable react-hooks/exhaustive-deps */
import IconUnknown from '@/ui/assets/token-default.svg';
import { Popup } from '@/ui/component';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount, useWallet } from '@/ui/utils';
import { findChain, getChainList } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { useRequest, useSetState } from 'ahooks';
import { Button, Form, Input, Spin, message } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Loading3QuartersOutlined } from '@ant-design/icons';
import { ReactComponent as RcIconDown } from '@/ui/assets/dashboard/portfolio/cc-down.svg';
import { ReactComponent as RcIconCheck } from '@/ui/assets/dashboard/portfolio/cc-check.svg';
import { ReactComponent as RcIconChecked } from '@/ui/assets/dashboard/portfolio/cc-checked.svg';
import clsx from 'clsx';
import { useThemeMode } from '@/ui/hooks/usePreference';
import {
  useOperateCustomToken,
  useFindCustomToken,
} from '@/ui/hooks/useSearchToken';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';

interface Props {
  visible?: boolean;
  onClose?(): void;
  onConfirm?: (
    addedInfo: {
      token: TokenItem;
      portofolioToken?: AbstractPortfolioToken | null;
    } | null
  ) => void;
}

const Wraper = styled.div`
  .ant-form-item {
    margin-bottom: 16px;
  }
  .ant-form-item-label > label {
    color: var(--r-neutral-body, #3e495e);
    font-size: 13px;
    line-height: 16px;
  }

  .ant-input {
    height: 52px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    background: transparent;
    border: 1px solid var(--r-neutral-line, #d3d8e0);
    border-radius: 6px;

    color: var(--r-neutral-title1, #192945);
    font-size: 15px;
    font-weight: 500;

    &:focus {
      border-color: var(--r-blue-default, #7084ff);
    }

    &::placeholder {
      font-size: 14px;
      font-weight: 400;
    }
  }
  .ant-input[disabled] {
    background: var(--r-neutral-card2, #f2f4f7);
    border-color: transparent;
    &:hover {
      border-color: transparent;
    }
  }
  .ant-form-item-has-error .ant-input,
  .ant-form-item-has-error .ant-input:hover {
    border: 1px solid var(--r-red-default, #e34935);
  }

  .ant-form-item-explain.ant-form-item-explain-error {
    color: var(--r-red-default, #e34935);
    font-size: 13px;
    line-height: 16px;
    min-height: 16px;
  }
`;

const Footer = styled.div`
  height: 84px;
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--r-neutral-card-1, rgba(255, 255, 255, 0.06));
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
`;

/**
 * @description now this popup only server mainnet chains' token list
 */
export const AddCustomTokenPopup = ({ visible, onClose, onConfirm }: Props) => {
  const wallet = useWallet();
  const [chainSelectorState, setChainSelectorState] = useSetState<{
    visible: boolean;
    chain: CHAINS_ENUM | null;
  }>({
    visible: false,
    chain: getChainList('mainnet')?.[0]?.enum || null,
  });

  const chain = findChain({ enum: chainSelectorState.chain });
  const [tokenId, setTokenId] = useState('');

  const [checked, setChecked] = useState(false);
  const { t } = useTranslation();
  const [form] = useForm();

  const {
    tokenList,
    resetSearchResult,
    searchCustomToken,
  } = useFindCustomToken();

  const { runAsync: doSearch, loading: isSearchingToken, error } = useRequest(
    async () => {
      if (!chain?.id || !tokenId) {
        return null;
      }

      const currentAccount = await wallet.getCurrentAccount();
      setChecked(false);
      form.setFields([
        {
          name: 'address',
          errors: [],
        },
      ]);

      await searchCustomToken({
        address: currentAccount!.address,
        chainServerId: chain.serverId,
        q: tokenId,
      }).then((lists) => {
        if (!lists?.tokenList.length) {
          form.setFields([
            {
              name: 'address',
              errors: [t('page.dashboard.assets.AddMainnetToken.notFound')],
            },
          ]);
        }
      });
    },
    {
      manual: true,

      onError: (e) => {
        form.setFields([
          {
            name: 'address',
            errors: [t('page.dashboard.assets.AddMainnetToken.notFound')],
          },
        ]);
      },
    }
  );

  useEffect(() => {
    if (tokenId) {
      doSearch();
    }
  }, [chain?.serverId, tokenId]);

  const token = useMemo(() => tokenList?.[0], [tokenList]);
  // const { isLocal: isLocalToken } = useIsTokenAddedLocally(token);

  const { addToken } = useOperateCustomToken();

  const { runAsync: runAddToken, loading: isSubmitting } = useRequest(
    async () => {
      if (!token || !chain?.id || !tokenId) {
        return null;
      }

      if (token.is_core) {
        // message.error();
        throw new Error(
          t('page.dashboard.assets.AddMainnetToken.isBuiltInToken')
        );
      }
      const portofolioToken = (await addToken(token)) || null;

      return {
        token,
        portofolioToken,
      };
    },
    {
      manual: true,
    }
  );

  const handleConfirm = useCallback(async () => {
    try {
      const addedInfo = await runAddToken();
      onConfirm?.(addedInfo);
    } catch (e) {
      message.error(e?.message);
    }
  }, [runAddToken, onConfirm]);

  useEffect(() => {
    if (!visible) {
      setChainSelectorState({
        visible: false,
        chain: getChainList('mainnet')?.[0]?.enum || null,
      });
      resetSearchResult();
      setTokenId('');
      setChecked(false);
      form.resetFields();
    }
  }, [visible, resetSearchResult]);

  const inputRef = useRef<Input>(null);
  useLayoutEffect(() => {
    if (visible) {
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const { isDarkTheme } = useThemeMode();

  return (
    <>
      <Popup
        visible={visible}
        closable={false}
        height={494}
        onClose={onClose}
        className="add-custom-token-popup"
        push={false}
        title={
          <div className="text-r-neutral-title1">
            {t('page.dashboard.assets.AddMainnetToken.title')}
          </div>
        }
        maskStyle={
          isDarkTheme
            ? {
                backgroundColor: 'transparent',
              }
            : undefined
        }
      >
        <Wraper>
          <Form layout="vertical" form={form}>
            <Form.Item label="Chain">
              <div
                onClick={() => {
                  setChainSelectorState({
                    visible: true,
                  });
                }}
              >
                {!chain ? (
                  <div
                    className={clsx(
                      'flex items-center bg-r-neutral-card2 rounded-[6px]',
                      'px-[16px] py-[12px] min-h-[52px] cursor-pointer',
                      'border-[1px] border-transparent',
                      'hover:border-rabby-blue-default hover:bg-r-blue-light1'
                    )}
                  >
                    <div className="text-r-neutral-title1 text-[15px] leading-[18px]">
                      {t('page.dashboard.assets.AddMainnetToken.selectChain')}
                    </div>
                    <div className="ml-auto text-r-neutral-body">
                      <RcIconDown />
                    </div>
                  </div>
                ) : (
                  <div
                    className={clsx(
                      'flex items-center bg-r-neutral-card2 rounded-[6px]',
                      'gap-[8px] px-[16px] py-[12px] min-h-[52px] cursor-pointer',
                      'border-[1px] border-transparent',
                      'hover:border-rabby-blue-default hover:bg-r-blue-light1'
                    )}
                  >
                    <img
                      src={chain?.logo}
                      alt=""
                      className="w-[28px] h-[28px] rounded-full"
                    />
                    <div className="text-r-neutral-title1 text-[15px] leading-[18px]">
                      {chain?.name}
                    </div>
                    <div className="ml-auto text-r-neutral-body">
                      <RcIconDown />
                    </div>
                  </div>
                )}
              </div>
            </Form.Item>
            <Form.Item
              label={t('page.dashboard.assets.AddMainnetToken.tokenAddress')}
              name="address"
            >
              <Input
                ref={inputRef}
                autoFocus
                placeholder={t(
                  'page.dashboard.assets.AddMainnetToken.tokenAddressPlaceholder'
                )}
                onChange={(e) => {
                  setTokenId(e.target.value);
                }}
                autoComplete="off"
              />
            </Form.Item>
            {isSearchingToken ? (
              <div className="flex items-center text-r-neutral-body text-[13px] gap-[4px]">
                <Loading3QuartersOutlined className="animate-spin" />{' '}
                {t('page.dashboard.assets.AddMainnetToken.searching')}
              </div>
            ) : (
              <>
                {token && !error ? (
                  <Form.Item label="Found Token">
                    <div
                      onClick={() => {
                        // if (isLocalToken) return;
                        setChecked((v) => !v);
                      }}
                      className={clsx(
                        'flex items-center gap-[12px] rounded-[6px] cursor-pointer',
                        'bg-r-neutral-card2 min-h-[52px] px-[16px] py-[14px]',
                        'border-[1px] border-transparent',
                        checked && 'border-rabby-blue-default'
                        // isLocalToken && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <div className="relative h-[24px]">
                        <img
                          src={IconUnknown}
                          alt=""
                          className="w-[24px] h-[24px] rounded-full"
                        />
                        <TooltipWithMagnetArrow
                          title={chain?.name}
                          className="rectangle w-[max-content]"
                        >
                          <img
                            className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                            src={chain?.logo || IconUnknown}
                            alt={chain?.name}
                          />
                        </TooltipWithMagnetArrow>
                      </div>
                      <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium">
                        {formatAmount(token.amount || 0)} {token.symbol}
                      </div>
                      {checked ? (
                        <div className="ml-auto text-r-blue-default">
                          <RcIconChecked />
                        </div>
                      ) : (
                        <div className="ml-auto text-r-neutral-body">
                          <RcIconCheck />
                        </div>
                      )}
                    </div>
                  </Form.Item>
                ) : null}
              </>
            )}
          </Form>
          <Footer>
            <Button
              type="primary"
              size="large"
              className="rabby-btn-ghost w-[172px]"
              ghost
              onClick={onClose}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              disabled={Boolean(
                !token || error || isSearchingToken || !checked
              )}
              loading={isSubmitting}
              onClick={handleConfirm}
            >
              {t('global.Confirm')}
            </Button>
          </Footer>
        </Wraper>
      </Popup>
      <ChainSelectorModal
        value={chainSelectorState.chain || CHAINS_ENUM.ETH}
        hideTestnetTab
        hideMainnetTab={false}
        visible={chainSelectorState.visible}
        onCancel={() => {
          setChainSelectorState({
            visible: false,
          });
        }}
        onChange={(value) => {
          setChainSelectorState({
            visible: false,
            chain: value,
          });
        }}
      />
    </>
  );
};
