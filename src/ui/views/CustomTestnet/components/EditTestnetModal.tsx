import {
  TestnetChain,
  TestnetChainBase,
} from '@/background/service/customTestnet';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useRequest } from 'ahooks';
import { Button, Form, Modal } from 'antd';
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
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ConfirmModifyRpcModal } from './ConfirmModifyRpcModal';
import { useHistory } from 'react-router-dom';

const Wrapper = styled.div`
  height: 100%;
  padding: 20px 0 76px 0;
`;

const Footer = styled.div`
  height: 84px;
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--r-neutral-bg1, #fff);
  padding: 18px 20px;
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
  ctx,
}: {
  isEdit?: boolean;
  data?: TestnetChainBase | null;
  visible: boolean;
  onCancel(): void;
  onConfirm(values: TestnetChain): void;
  onChange?: (values: Partial<TestnetChainBase>) => void;
  zIndex?: number;
  height?: number;
  maskStyle?: React.CSSProperties;
  ctx?: {
    ga?: {
      source?: string;
    };
  };
}) => {
  const wallet = useWallet();
  const [isShowAddFromChainList, setIsShowAddFromChainList] = useState(false);
  const [isShowModifyRpcModal, setIsShowModifyRpcModal] = useState(false);
  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Partial<TestnetChainBase>>({});

  const { loading, runAsync: runAddTestnet } = useRequest(
    (
      data: TestnetChainBase,
      ctx?: {
        ga?: {
          source?: string;
        };
      }
    ) => {
      return isEdit
        ? wallet.updateCustomTestnet(data)
        : wallet.addCustomTestnet(data, ctx);
    },
    {
      manual: true,
    }
  );

  const handleSubmit = async () => {
    await form.validateFields();
    const values = form.getFieldsValue();
    const res = await runAddTestnet(values, ctx);
    if ('error' in res) {
      form.setFields([
        {
          name: [res.error.key],
          errors: [res.error.message],
        },
      ]);
      if (!isEdit && res.error.status === 'alreadySupported') {
        setIsShowModifyRpcModal(true);
        setFormValues(form.getFieldsValue());
      }
    } else {
      onConfirm?.(res);
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
  const history = useHistory();

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
        <div className="h-[calc(100%-40px)] overflow-auto px-[20px]">
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
                const source = ctx?.ga?.source || 'setting';
                matomoRequestEvent({
                  category: 'Custom Network',
                  action: 'Click Add From ChanList',
                  label: source,
                });
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
              const values = form.getFieldsValue();
              onChange?.(values);
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
          const source = ctx?.ga?.source || 'setting';
          matomoRequestEvent({
            category: 'Custom Network',
            action: 'Choose ChainList Network',
            label: `${source}_${String(item.id)}`,
          });
        }}
      />
      <ConfirmModifyRpcModal
        visible={isShowModifyRpcModal}
        chainId={formValues.id}
        rpcUrl={formValues.rpcUrl}
        onCancel={() => {
          setIsShowModifyRpcModal(false);
        }}
        onConfirm={() => {
          setIsShowModifyRpcModal(false);
          wallet.clearPageStateCache();
          history.replace({
            pathname: '/custom-rpc',
            state: {
              chainId: formValues.id,
              rpcUrl: formValues.rpcUrl,
            },
          });
        }}
      />
    </Popup>
  );
};
