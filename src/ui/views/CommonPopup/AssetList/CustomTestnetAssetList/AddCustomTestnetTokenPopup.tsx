import IconUnknown from '@/ui/assets/token-default.svg';
import { Popup } from '@/ui/component';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount, useWallet } from '@/ui/utils';
import { findChain, getChainList, getTestnetChainList } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { useRequest, useSetState } from 'ahooks';
import { Button, Form, Input, InputRef, Spin, message } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading3QuartersOutlined } from '@ant-design/icons';
import { ReactComponent as RcIconDown } from '@/ui/assets/dashboard/portfolio/cc-down.svg';
import { ReactComponent as RcIconCheck } from '@/ui/assets/dashboard/portfolio/cc-check.svg';
import { ReactComponent as RcIconChecked } from '@/ui/assets/dashboard/portfolio/cc-checked.svg';
import clsx from 'clsx';
import styles from './AddCustomTestnetTokenPopup.module.css';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
interface Props {
  visible?: boolean;
  onClose?(): void;
  onConfirm?(): void;
  inModal?: boolean;
}

export const AddCustomTestnetTokenContent = ({
  visible,
  onClose,
  onConfirm,
  inModal,
}: Props) => {
  const wallet = useWallet();
  const [chainSelectorState, setChainSelectorState] = useSetState<{
    visible: boolean;
    chain: CHAINS_ENUM | null;
  }>({
    visible: false,
    chain: getChainList('testnet')?.[0]?.enum || null,
  });
  const { getContainer } = usePopupContainer();

  const chain = findChain({ enum: chainSelectorState.chain });
  const [tokenId, setTokenId] = useState('');
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation();
  const [form] = useForm();

  const { data: token, runAsync: runGetToken, loading, error } = useRequest(
    async () => {
      const currentAccount = await wallet.getCurrentAccount();
      if (!chain?.id || !tokenId) {
        return null;
      }
      setChecked(false);
      form.setFields([
        {
          name: 'address',
          errors: [],
        },
      ]);
      const t = await wallet.getCustomTestnetToken({
        address: currentAccount!.address,
        chainId: chain.id,
        tokenId,
      });
      setChecked(true);
      return t;
    },
    {
      refreshDeps: [chain?.id, tokenId],

      onError: (e) => {
        form.setFields([
          {
            name: 'address',
            errors: [t('page.dashboard.assets.AddTestnetToken.notFound')],
          },
        ]);
      },
    }
  );

  const { runAsync: runAddToken, loading: isSubmitting } = useRequest(
    async () => {
      if (!chain?.id || !tokenId) {
        return null;
      }
      return wallet.addCustomTestnetToken({
        chainId: chain.id,
        id: tokenId,
        symbol: token!.symbol,
        decimals: token!.decimals,
      });
    },
    {
      manual: true,
    }
  );

  const handleConfirm = async () => {
    try {
      await runAddToken();
      onConfirm?.();
    } catch (e) {
      message.error(e?.message);
    }
  };

  useEffect(() => {
    if (!visible) {
      setChainSelectorState({
        visible: false,
        chain: getChainList('testnet')?.[0]?.enum || null,
      });
      setTokenId('');
      setChecked(false);
      form.resetFields();
    }
  }, [visible, form, setChainSelectorState]);

  const inputRef = useRef<InputRef>(null);
  useLayoutEffect(() => {
    if (visible) {
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <>
      <div className={styles.wrapper}>
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
                    'hover:border-rabby-blue-default hover:bg-r-blue-light1',
                    inModal ? 'bg-rb-neutral-card-1' : ''
                  )}
                >
                  <div className="text-r-neutral-title1 text-[15px] leading-[18px]">
                    {t('page.dashboard.assets.AddTestnetToken.selectChain')}
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
                    'hover:border-rabby-blue-default hover:bg-r-blue-light1',
                    inModal ? 'bg-rb-neutral-card-1' : ''
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
            label={t('page.dashboard.assets.AddTestnetToken.tokenAddress')}
            name="address"
          >
            <Input
              ref={inputRef}
              autoFocus
              className={
                inModal ? 'bg-rb-neutral-card-1' : 'bg-r-neutral-card-2'
              }
              placeholder={t(
                'page.dashboard.assets.AddTestnetToken.tokenAddressPlaceholder'
              )}
              onChange={(e) => {
                setTokenId(e.target.value);
              }}
              autoComplete="off"
            />
          </Form.Item>
          {loading ? (
            <div className="flex items-center text-r-neutral-body text-[13px] gap-[4px]">
              <Loading3QuartersOutlined className="animate-spin" />{' '}
              {t('page.dashboard.assets.AddTestnetToken.searching')}
            </div>
          ) : (
            <>
              {token && !error ? (
                <Form.Item label="Found Token">
                  <div
                    className={clsx(
                      'flex items-center gap-[12px] rounded-[6px]',
                      'bg-r-neutral-card2 min-h-[52px] px-[16px] py-[14px]'
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
                          className="w-14 h-14 absolute right-[-2px] bottom-[-2px] rounded-full"
                          src={chain?.logo || IconUnknown}
                          alt={chain?.name}
                        />
                      </TooltipWithMagnetArrow>
                    </div>
                    <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium">
                      {formatAmount(token.amount || 0)} {token.symbol}
                    </div>
                  </div>
                </Form.Item>
              ) : null}
            </>
          )}
        </Form>
        <div
          className={clsx(
            'flex justify-between gap-16 w-full h-[84px] py-16 px-20',
            'absolute left-0 right-0 bottom-0',
            'border-t-[0.5px] border-t-r-neutral-line',
            'bg-r-neutral-card-1'
          )}
        >
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
            disabled={Boolean(!token || error || loading || !checked)}
            loading={isSubmitting}
            onClick={handleConfirm}
          >
            {t('global.Confirm')}
          </Button>
        </div>
      </div>
      <ChainSelectorModal
        hideTestnetTab={false}
        hideMainnetTab={true}
        getContainer={getContainer}
        value={chainSelectorState.chain || CHAINS_ENUM.ETH}
        visible={chainSelectorState.visible}
        onCancel={() => {
          setChainSelectorState({
            visible: false,
          });
        }}
        showRPCStatus
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

export const AddCustomTestnetTokenPopup = ({
  visible,
  onClose,
  onConfirm,
}: Props) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();

  return (
    <>
      <Popup
        visible={visible}
        closable={false}
        height={500}
        onClose={onClose}
        className="add-custom-token-popup"
        push={false}
        title={
          <div className="text-r-neutral-title1">
            {t('page.dashboard.assets.AddTestnetToken.title')}
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
        <AddCustomTestnetTokenContent
          visible={visible}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </Popup>
    </>
  );
};
