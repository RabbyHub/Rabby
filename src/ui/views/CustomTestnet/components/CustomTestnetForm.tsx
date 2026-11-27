import { TestnetChainBase } from '@/background/service/customTestnet';
import { Form, FormInstance, Input, InputRef } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMount } from 'ahooks';
import { UI_TYPE } from '@/constant/ui';
import styles from './CustomTestnetForm.module.css';

export const CustomTestnetForm = ({
  form,
  isEdit,
  disabled,
  idDisabled,
  onFieldsChange,
}: {
  form: FormInstance<TestnetChainBase>;
  isEdit?: boolean;
  disabled?: boolean;
  idDisabled?: boolean;
  onFieldsChange?(changedFields: any, allFields: any): void;
}) => {
  const { t } = useTranslation();
  const inputRef = React.useRef<InputRef>(null);

  useMount(() => {
    setTimeout(() => {
      if (UI_TYPE.isDesktop) {
        return;
      }
      inputRef?.current?.focus();
    });
  });

  return (
    <div className={styles.warper}>
      <Form
        layout="vertical"
        form={form}
        requiredMark={false}
        onFieldsChange={onFieldsChange}
      >
        <Form.Item
          label={t('page.customTestnet.CustomTestnetForm.id')}
          name="id"
          rules={[
            {
              required: true,
              pattern: /^\d+$/,
              message: t('page.customTestnet.CustomTestnetForm.idRequired'),
            },
          ]}
        >
          <Input
            ref={inputRef}
            autoComplete="off"
            disabled={disabled || idDisabled || isEdit}
          />
        </Form.Item>
        <Form.Item
          label={t('page.customTestnet.CustomTestnetForm.name')}
          name="name"
          rules={[
            {
              required: true,
              message: t('page.customTestnet.CustomTestnetForm.nameRequired'),
            },
          ]}
        >
          <Input autoComplete="off" disabled={disabled} />
        </Form.Item>
        <Form.Item
          label={t('page.customTestnet.CustomTestnetForm.rpcUrl')}
          name="rpcUrl"
          rules={[
            {
              required: true,
              type: 'url',
              message: t('page.customTestnet.CustomTestnetForm.rpcUrlRequired'),
            },
          ]}
        >
          <Input autoComplete="off" type="url" disabled={disabled} />
        </Form.Item>
        <Form.Item
          label={t('page.customTestnet.CustomTestnetForm.nativeTokenSymbol')}
          name="nativeTokenSymbol"
          rules={[
            {
              required: true,
              message: t(
                'page.customTestnet.CustomTestnetForm.nativeTokenSymbolRequired'
              ),
            },
          ]}
        >
          <Input autoComplete="off" disabled={disabled} />
        </Form.Item>
        <Form.Item
          label={t('page.customTestnet.CustomTestnetForm.blockExplorerUrl')}
          name="scanLink"
        >
          <Input autoComplete="off" disabled={disabled} />
        </Form.Item>
      </Form>
    </div>
  );
};
