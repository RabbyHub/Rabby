import { useAccount } from '@/ui/store-hooks';
import { useWallet } from '@/ui/utils';
import { findChainByID } from '@/utils/chain';
import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { SafeTransactionItem } from '@rabby-wallet/gnosis-sdk/dist/api';
import { useRequest } from 'ahooks';
import { Form, Input, Skeleton, Spin } from 'antd';
import clsx from 'clsx';
import { maxBy, sortBy, uniqBy } from 'lodash';
import React, {
  MouseEventHandler,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconChecked from 'ui/assets/safe-nonce-select/checked.svg';
import IconDown from 'ui/assets/safe-nonce-select/down.svg';
import IconFind from 'ui/assets/safe-nonce-select/find.svg';
import IconUnchecked from 'ui/assets/safe-nonce-select/unchecked.svg';
import { intToHex } from 'ui/utils/number';
import { getActionTypeTextByType } from '../Actions/utils';
import { Card } from '../Card';
import { Divide } from '../Divide';
import { Account } from '@/background/service/preference';
import { cn } from '@/ui/utils/cn';
import styles from './SafeNonceSelector.module.css';

interface SafeNonceSelectorProps {
  value?: string;
  onChange?(value: string): void;
  isReady?: boolean;
  chainId: number;
  safeInfo?: BasicSafeInfo | null;
  disabled?: boolean;
  account: Account;
}
export const SafeNonceSelector = ({
  value,
  onChange,
  isReady,
  chainId,
  safeInfo,
  disabled,
  account,
}: SafeNonceSelectorProps) => {
  const { t } = useTranslation();
  const [isShowOptionList, setIsShowOptionList] = useState(false);

  const [form] = Form.useForm();

  const val = useMemo(() => {
    if (value == null || value === '') {
      return '';
    }
    const res = +value;
    if (Number.isNaN(res)) {
      return '';
    }
    return res;
  }, [value]);

  useEffect(() => {
    form.setFieldsValue({
      nonce: val,
    });
    form.validateFields();
  }, [val, form]);

  const handleOnChange = (_v: string | number) => {
    const v = +_v;
    if (Number.isNaN(v)) {
      onChange?.('');
    } else {
      onChange?.(intToHex(v));
    }
    setIsShowOptionList(false);
  };

  const optionListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isShowOptionList) {
      const parent = document.querySelector('.approval-tx');
      if (optionListRef.current && parent) {
        const shouldScroll =
          optionListRef.current.getBoundingClientRect().top + 52 >
          parent.getBoundingClientRect().height;
        if (shouldScroll) {
          parent.scrollTo(0, parent.scrollTop + 128);
        }
      }
    }
  }, [isShowOptionList]);

  if (!isReady) {
    return (
      <Card className={cn(styles.wrapper, 'pt-[14px] pb-[16px]')}>
        <div>
          <div>
            <Skeleton.Input active style={{ width: 120, height: 18 }} />
          </div>
          <div className="flex items-center justify-between mt-12 p-16">
            {Array(4)
              .fill(0)
              .map((_e, i) => (
                <Skeleton.Input
                  key={i}
                  active
                  style={{ width: 76, height: 52 }}
                />
              ))}
          </div>
        </div>
      </Card>
    );
  }
  return (
    <Card
      className={styles.wrapper}
      hasDivider={false}
      headline={t('global.Nonce')}
    >
      <div className="nonce-select">
        <Form form={form}>
          <Form.Item
            name="nonce"
            rules={[
              {
                validator(rule, value, callback) {
                  if (value == null || value === '') {
                    callback('Please input nonce');
                  } else if ((value || 0) < (safeInfo?.nonce || 0)) {
                    callback(
                      `Nonce is too low, the minimum should be ${
                        safeInfo?.nonce || 0
                      }`
                    );
                  } else {
                    callback();
                  }
                },
              },
            ]}
          >
            <Input
              className="nonce-input"
              value={value}
              onChange={(e) => {
                const v = e.target.value;
                handleOnChange(v);
              }}
              // type="number"
              disabled={disabled}
              suffix={
                <img
                  src={IconDown}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }
                    setIsShowOptionList((v) => !v);
                  }}
                  className={clsx(
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                    isShowOptionList && 'rotate-180'
                  )}
                ></img>
              }
            ></Input>
          </Form.Item>
        </Form>
        {isShowOptionList ? (
          <div ref={optionListRef}>
            <OptionList
              account={account}
              chainId={chainId}
              value={val === '' ? undefined : val}
              onChange={handleOnChange}
              safeInfo={safeInfo}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
};

const OptionList = ({
  chainId,
  value,
  onChange,
  safeInfo,
  account,
}: {
  chainId: number;
  value?: number;
  onChange?(value: number): void;
  safeInfo?: BasicSafeInfo | null;
  account: Account;
}) => {
  const wallet = useWallet();

  const { t } = useTranslation();

  const {
    data: pendingList,
    loading: isLoadingPendingList,
    refreshAsync,
    error,
  } = useRequest(
    async () => {
      if (!account?.address) {
        return;
      }
      return wallet.getGnosisPendingTxs(account?.address, chainId.toString());
    },
    {
      cacheKey: `gnosis-pending-txs-${account?.address}-${chainId}`,
    }
  );

  const pendingOptionlist = useMemo(() => {
    return sortBy(uniqBy(pendingList || [], 'nonce'), (item) =>
      Number(item.nonce)
    );
  }, [pendingList]);

  const recommendNonce = useMemo(() => {
    const maxNonceTx = pendingList?.length
      ? maxBy(pendingList || [], (item) => Number(item.nonce))
      : null;
    return maxNonceTx != null ? Number(maxNonceTx.nonce) + 1 : safeInfo?.nonce;
  }, [pendingList, safeInfo]);

  if (isLoadingPendingList && !pendingList) {
    return (
      <div className="mt-[8px] p-[16px] flex justify-center">
        <Spin spinning></Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <img src={IconFind} alt="" />
        <div className="alert-error-message">
          <Trans i18nKey="page.signTx.SafeNonceSelector.error.pendingList">
            Fail to load pending transactions,{' '}
            <span
              onClick={() => {
                refreshAsync();
              }}
              className="underline cursor-pointer"
            >
              Retry
            </span>
          </Trans>
        </div>
      </div>
    );
  }

  return (
    <div className="nonce-select-option-list">
      {recommendNonce != null ? (
        <div>
          <div className="nonce-select-option-group-title pt-[10px]">
            {t('page.signTx.SafeNonceSelector.optionGroup.recommendTitle')}
          </div>
          <OptionListItem
            checked={recommendNonce === value}
            onClick={() => {
              onChange?.(+recommendNonce);
            }}
          >
            {recommendNonce} - {t('page.signTx.SafeNonceSelector.option.new')}
          </OptionListItem>
        </div>
      ) : null}
      {pendingList?.length ? (
        <div>
          <div className="nonce-select-option-group-title">
            {t('page.signTx.SafeNonceSelector.optionGroup.replaceTitle')}
          </div>
          {pendingOptionlist?.map((item) => {
            return (
              <OptionListItem
                key={item.nonce}
                checked={+item.nonce === value}
                onClick={() => {
                  onChange?.(+item.nonce);
                }}
              >
                <PendingOptionContent data={item} chainId={chainId} />
              </OptionListItem>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const PendingOptionContent = ({
  data,
  chainId,
}: {
  data: SafeTransactionItem;
  chainId: number;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { data: res, loading } = useRequest(
    async () => {
      const chain = findChainByID(chainId)!;
      return wallet.openapi.parseTx({
        chainId: chain.serverId,
        tx: {
          chainId,
          from: data.safe,
          to: data.to,
          data: data.data || '0x',
          value: `0x${Number(data.value).toString(16)}`,
          nonce: intToHex(Number(data.nonce)),
          gasPrice: '0x0',
          gas: '0x0',
        },
        origin: origin || '',
        addr: data.safe,
      });
    },
    {
      cacheKey: `gnosis-parse-tx-${data.safe}-${data.to}-${data.nonce}-${data?.data}`,
      staleTime: 10000,
    }
  );

  const content = useMemo(() => {
    return getActionTypeTextByType(res?.action?.type || '');
  }, [res?.action?.type]);

  return (
    <div className="truncate">
      {data.nonce} - {loading ? '' : content}
    </div>
  );
};

const OptionListItem = ({
  children,
  checked,
  onClick,
}: {
  children?: ReactNode;
  checked?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) => {
  return (
    <div
      className={clsx('nonce-select-option', checked && 'is-checked')}
      onClick={onClick}
    >
      {children}
      {checked ? (
        <img src={IconChecked} alt="" />
      ) : (
        <img src={IconUnchecked} alt="" />
      )}
    </div>
  );
};
