import { TestnetChainBase } from '@/background/service/customTestnet';
import { Form, FormInstance, Input } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMount } from 'ahooks';
import styled from 'styled-components';

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
  }
  .ant-input[disabled] {
    background: var(--r-neutral-card2, #f2f4f7);
    border-color: transparent;
    /* color: var(--r-neutral-foot, #6a7587); */
    &:hover {
      border-color: transparent;
    }
  }
  .ant-form-item-has-error .ant-input,
  .ant-form-item-has-error .ant-input:hover {
    border: 1px solid var(--r-red-default, #e34935);
    background-color: transparent;
  }

  .ant-form-item-explain.ant-form-item-explain-error {
    color: var(--r-red-default, #e34935);
    font-size: 13px;
    line-height: 16px;
    min-height: 16px;
  }
`;

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
  const inputRef = React.useRef<Input>(null);

  useMount(() => {
    setTimeout(() => {
      inputRef?.current?.focus();
    });
  });

  return (
    <Wraper>
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
    </Wraper>
  );
};
