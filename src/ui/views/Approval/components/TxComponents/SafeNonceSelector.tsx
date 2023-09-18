import { useAccount } from '@/ui/store-hooks';
import { useWallet } from '@/ui/utils';
import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { SafeTransactionItem } from '@rabby-wallet/gnosis-sdk/dist/api';
import { useRequest } from 'ahooks';
import { Form, Input, Skeleton, Spin } from 'antd';
import clsx from 'clsx';
import { INTERNAL_REQUEST_ORIGIN } from 'consts';
import { maxBy, sortBy, uniqBy } from 'lodash';
import React, {
  MouseEventHandler,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import IconChecked from 'ui/assets/safe-nonce-select/checked.svg';
import IconDown from 'ui/assets/safe-nonce-select/down.svg';
import IconUnchecked from 'ui/assets/safe-nonce-select/unchecked.svg';
import { intToHex } from 'ui/utils/number';

const Wrapper = styled.div`
  border-radius: 6px;
  background: var(--r-neutral-card-1, #fff);
  margin-top: 12px;

  padding: 16px 12px 12px 12px;

  .nonce-select {
    &-label {
      color: var(--r-neutral-title-1, #192945);
      font-size: 15px;
      font-weight: 500;
      line-height: 18px;
      margin-bottom: 8px;
    }
    .ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover {
      border-color: var(--r-blue-default, #7084ff);
      border-right-width: 1px !important;
      z-index: 1;
    }
    .nonce-input {
      height: 52px;
      border-radius: 6px;
      border: 1px solid var(--r-neutral-line, #d3d8e0);
      /* border: 0.5px solid var(--r-neutral-line, #d3d8e0); */

      background: var(--r-neutral-bg-3, #f7fafc);

      .ant-input {
        background: var(--r-neutral-bg-3, #f7fafc);
      }
    }

    &-option-list {
      border-radius: 6px;
      background: var(--r-neutral-bg-3, #f7fafc);
      margin-top: 8px;
    }

    &-option-group {
      &-title {
        padding: 4px 12px 8px 12px;
        color: var(--r-neutral-body, #3e495e);
        font-size: 12px;
        font-weight: 400;
        line-height: 14px;
      }
    }

    &-option {
      display: flex;
      align-items: center;

      color: var(--r-neutral-title-1, #192945);
      font-size: 13px;
      font-weight: 500;

      line-height: 16px;

      padding: 12px;
      border-radius: 6px;
      position: relative;
      border: 1px solid transparent;
      cursor: pointer;

      &:hover,
      &.is-checked {
        border: 1px solid var(--r-blue-default, #7084ff);
        background: var(--r-blue-light-1, #eef1ff);
      }

      img {
        margin-left: auto;
      }

      &:not(:last-child)::after {
        content: '';
        display: block;
        position: absolute;
        bottom: -1px;
        left: 12px;
        right: 12px;
        height: 1px;
        height: 0.5px;
        background: var(--r-neutral-line, #d3d8e0);
      }
    }
  }

  .ant-form-item-has-error .nonce-input {
    border-color: var(--r-red-default, #e34935) !important;
  }

  .ant-form-item-explain,
  .ant-form-item-extra {
    min-height: unset;
  }
  .ant-form-item {
    margin-bottom: 0;
  }
  .ant-form-item-explain.ant-form-item-explain-error {
    color: var(--r-red-default, #e34935);
    font-size: 12px;
    font-weight: 400;
    line-height: 14px;
  }
`;

interface SafeNonceSelectorProps {
  value?: string;
  onChange?(value: string): void;
  isReady?: boolean;
  chainId: number;
  safeInfo?: BasicSafeInfo | null;
}
export const SafeNonceSelector = ({
  value,
  onChange,
  isReady,
  chainId,
  safeInfo,
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
  }, [val]);

  const handleOnChange = (_v: string | number) => {
    const v = +_v;
    if (Number.isNaN(v)) {
      onChange?.('');
    } else {
      onChange?.(intToHex(v));
    }
  };

  if (!isReady) {
    return (
      <Wrapper className="pt-[14px] pb-[16px]">
        <div>
          <div>
            <Skeleton.Input active style={{ width: 120, height: 18 }} />
          </div>
          <div className="flex items-center justify-between mt-12">
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
      </Wrapper>
    );
  }
  return (
    <Wrapper>
      <div className="nonce-select">
        <div className="nonce-select-label">{t('global.Nonce')}</div>
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
              suffix={
                <img
                  src={IconDown}
                  onClick={() => setIsShowOptionList((v) => !v)}
                  className={clsx(
                    'cursor-pointer',
                    isShowOptionList && 'rotate-180'
                  )}
                ></img>
              }
            ></Input>
          </Form.Item>
        </Form>
        {isShowOptionList ? (
          <OptionList
            chainId={chainId}
            value={val === '' ? undefined : val}
            onChange={handleOnChange}
            safeInfo={safeInfo}
          />
        ) : null}
      </div>
    </Wrapper>
  );
};

const OptionList = ({
  chainId,
  value,
  onChange,
  safeInfo,
}: {
  chainId: number;
  value?: number;
  onChange?(value: number): void;
  safeInfo?: BasicSafeInfo | null;
}) => {
  const wallet = useWallet();
  const [account] = useAccount();

  const { t } = useTranslation();

  const { data: pendingList, loading: isLoadingPendingList } = useRequest(
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
    return sortBy(uniqBy(pendingList || [], 'nonce'), 'nonce');
  }, [pendingList]);

  const recommendNonce = useMemo(() => {
    const maxNonceTx = pendingList?.length
      ? maxBy(pendingList || [], (item) => item.nonce)
      : null;
    return maxNonceTx != null ? maxNonceTx.nonce + 1 : safeInfo?.nonce;
  }, [pendingList, safeInfo]);

  if (isLoadingPendingList && !pendingList) {
    return (
      <div className="mt-[8px] p-[16px] flex justify-center">
        <Spin spinning></Spin>
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
              onChange?.(recommendNonce);
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
                checked={item.nonce === value}
                onClick={() => {
                  onChange?.(item.nonce);
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
  const { data: explain, loading } = useRequest(
    async () => {
      return wallet.openapi.preExecTx({
        tx: {
          chainId,
          from: data.safe,
          to: data.to,
          data: data.data || '0x',
          value: `0x${Number(data.value).toString(16)}`,
          nonce: intToHex(data.nonce),
          gasPrice: '0x0',
          gas: '0x0',
        },
        origin: INTERNAL_REQUEST_ORIGIN,
        address: data.safe,
        updateNonce: false,
        pending_tx_list: [],
      });
    },
    {
      cacheKey: `gnosis-pre-exec-${data.safe}-${data.to}-${data.nonce}-${data?.data}`,
    }
  );

  const content = useMemo(() => {
    if (
      explain?.type_call ||
      explain?.type_cancel_nft_collection_approval ||
      explain?.type_cancel_single_nft_approval ||
      explain?.type_cancel_token_approval ||
      explain?.type_cancel_tx ||
      explain?.type_deploy_contract ||
      explain?.type_list_nft ||
      explain?.type_nft_collection_approval ||
      explain?.type_nft_send ||
      explain?.type_single_nft_approval ||
      explain?.type_token_approval
    ) {
      return t('page.signTx.SafeNonceSelector.explain.contractCall');
    } else if (explain?.type_send) {
      return t('page.signTx.SafeNonceSelector.explain.send');
    } else {
      return t('page.signTx.SafeNonceSelector.explain.unknown');
    }
  }, [explain]);

  return (
    <div>
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
