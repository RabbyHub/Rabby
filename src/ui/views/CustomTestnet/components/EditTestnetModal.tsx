import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Input, Button, Form } from 'antd';
import styled from 'styled-components';
import { useDebounce } from 'react-use';
import { useWallet } from 'ui/utils';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { Popup, PageHeader } from 'ui/component';
import { isValidateUrl } from 'ui/utils/url';
import { RPCItem } from '@/background/service/rpc';
import { findChainByEnum } from '@/utils/chain';
import { useTranslation } from 'react-i18next';
import { CustomTestnetForm } from './CustomTestnetForm';
import { ReactComponent as RcIconFlash } from 'ui/assets/custom-testnet/icon-flash.svg';
import { ReactComponent as RcIconRight } from 'ui/assets/custom-testnet/icon-right.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { AddFromChainList } from './AddFromChainList';
import { useRequest } from 'ahooks';
import { TestnetChainBase } from '@/background/service/customTestnet';

const ErrorMsg = styled.div`
  color: #ec5151;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  margin-top: 8px;
`;

const Wrapper = styled.div`
  padding: 20px 20px 76px 20px;
  .rpc-input {
    height: 52px;
    width: 360px;
    margin-left: auto;
    margin-right: auto;
    background: #f5f6fa;
    border: 1px solid #e5e9ef;
    border-radius: 6px;
    &.has-error {
      border-color: #ec5151;
    }
  }
`;

const Footer = styled.div`
  height: 76px;
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

export const EditCustomTestnetModal = ({
  data,
  visible,
  onCancel,
  onConfirm,
  isEdit,
}: {
  isEdit?: boolean;
  data?: TestnetChainBase | null;
  visible: boolean;
  onCancel(): void;
  onConfirm(url?: string): void;
}) => {
  const wallet = useWallet();
  const [isShowAddFromChainList, setIsShowAddFromChainList] = useState(false);
  const [form] = Form.useForm();

  const { loading, runAsync: runAddTestnet } = useRequest(
    (data: TestnetChainBase) => {
      return isEdit
        ? wallet.updateCustomTestnet(data)
        : wallet.addCustomTestnet(data);
    },
    {
      manual: true,
    }
  );

  const handleSubmit = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    const res = await runAddTestnet(values);
    if ('error' in res) {
      form.setFields([
        {
          name: [res.error.key],
          errors: [res.error.message],
        },
      ]);
    } else {
      onConfirm?.();
    }
  };

  const { t } = useTranslation();

  useEffect(() => {
    if (data && visible) {
      form.setFieldsValue(data);
    }
  }, [data, visible]);

  useEffect(() => {
    if (!visible) {
      form.resetFields();
    }
  }, [visible]);

  return (
    <Popup
      height={520}
      visible={visible}
      onCancel={onCancel}
      bodyStyle={{
        padding: 0,
      }}
      style={{
        zIndex: 1001,
      }}
      // isSupportDarkMode
    >
      <Wrapper>
        <PageHeader className="pt-0" forceShowBack={false} canBack={false}>
          {t('page.customRpc.EditCustomTestnetModal.title')}
        </PageHeader>
        <div
          className={clsx(
            'flex items-center gap-[8px]',
            'bg-r-blue-light1 p-[16px] cursor-pointer rounded-[6px]',
            'mb-[20px]'
          )}
          onClick={() => {
            setIsShowAddFromChainList(true);
          }}
        >
          <ThemeIcon src={RcIconFlash}></ThemeIcon>
          <div className="text-r-neutral-title1 text-[15px] leading-[18px] font-medium">
            Quick add from Chainlist
          </div>
          <ThemeIcon src={RcIconRight} className="ml-auto"></ThemeIcon>
        </div>
        <CustomTestnetForm form={form} isEdit={isEdit} />
        <Footer>
          <Button
            type="primary"
            size="large"
            className="rabby-btn-ghost w-[172px]"
            ghost
            onClick={onCancel}
          >
            {t('global.Cancel')}
          </Button>
          <Button
            type="primary"
            loading={loading}
            size="large"
            className="w-[172px]"
            onClick={handleSubmit}
          >
            {loading ? t('global.Loading') : t('global.Confirm')}
          </Button>
        </Footer>
      </Wrapper>
      <AddFromChainList
        visible={isShowAddFromChainList}
        onClose={() => {
          setIsShowAddFromChainList(false);
        }}
        onSelect={(item) => {
          form.setFieldsValue(item);
          setIsShowAddFromChainList(false);
        }}
      />
    </Popup>
  );
};
