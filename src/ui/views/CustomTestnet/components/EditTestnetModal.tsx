import { TestnetChainBase } from '@/background/service/customTestnet';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useRequest } from 'ahooks';
import { Button, Form } from 'antd';
import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconFlash } from 'ui/assets/custom-testnet/icon-flash.svg';
import { ReactComponent as RcIconRight } from 'ui/assets/custom-testnet/icon-right.svg';
import { PageHeader, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import { AddFromChainList } from './AddFromChainList';
import { CustomTestnetForm } from './CustomTestnetForm';

const Wrapper = styled.div`
  height: 100%;
  padding: 20px 0 76px 0;
`;

const Footer = styled.div`
  height: 76px;
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--r-neutral-bg1, #fff);
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
  zIndex,
  onChange,
  height,
  maskStyle,
}: {
  isEdit?: boolean;
  data?: TestnetChainBase | null;
  visible: boolean;
  onCancel(): void;
  onConfirm(url?: string): void;
  onChange?: (values: Partial<TestnetChainBase>) => void;
  zIndex?: number;
  height?: number;
  maskStyle?: React.CSSProperties;
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
      height={height || 520}
      visible={visible}
      onCancel={onCancel}
      bodyStyle={{
        padding: 0,
      }}
      zIndex={zIndex || 1001}
      style={{
        zIndex: zIndex || 1001,
      }}
      maskStyle={maskStyle}
      // isSupportDarkMode
    >
      <Wrapper>
        <PageHeader className="pt-0" forceShowBack={false} canBack={false}>
          {t('page.customRpc.EditCustomTestnetModal.title')}
        </PageHeader>
        <div className="h-[calc(100%-48px)] overflow-auto px-[20px]">
          {isEdit ? null : (
            <div
              className={clsx(
                'flex items-center gap-[8px]',
                'bg-r-blue-light1 p-[15px] cursor-pointer rounded-[6px]',
                'mb-[20px] border-[1px] border-transparent',
                'hover:border-rabby-blue-default hover:bg-r-blue-light1'
              )}
              onClick={() => {
                setIsShowAddFromChainList(true);
              }}
            >
              <ThemeIcon src={RcIconFlash}></ThemeIcon>
              <div className="text-r-neutral-title1 text-[15px] leading-[18px] font-medium">
                {t('page.customRpc.EditCustomTestnetModal.quickAdd')}
              </div>
              <ThemeIcon src={RcIconRight} className="ml-auto"></ThemeIcon>
            </div>
          )}

          <CustomTestnetForm
            form={form}
            isEdit={isEdit}
            onFieldsChange={() => {
              onChange?.(form.getFieldsValue());
            }}
          />
        </div>
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
