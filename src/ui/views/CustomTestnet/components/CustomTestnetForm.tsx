import { TestnetChainBase } from '@/background/service/customTestnet';
import { Chain } from '@debank/common';
import { Form, FormInstance, Input } from 'antd';
import React from 'react';
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
    background: transparent !important;
    border: 0.5px solid var(--r-neutral-line, #d3d8e0) !important;
    border-radius: 6px;

    color: var(--r-neutral-title1, #192945);
    font-size: 15px;
    font-weight: 500;

    &.has-error {
      border-color: #ec5151;
    }
  }
`;

export const CustomTestnetForm = ({
  form,
}: {
  form: FormInstance<TestnetChainBase>;
}) => {
  return (
    <Wraper>
      <Form layout="vertical" form={form} requiredMark={false}>
        <Form.Item
          label="Chain ID"
          name="id"
          rules={[
            {
              required: true,
              message: 'Please input chain id',
            },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Network name"
          name="name"
          rules={[
            {
              required: true,
              message: 'Please input network name',
            },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="RPC URL"
          name="rpcUrl"
          rules={[
            {
              required: true,
              type: 'url',
              message: 'Please input RPC URL',
            },
          ]}
        >
          <Input autoComplete="off" type="url" />
        </Form.Item>
        <Form.Item
          label="Currency symbol"
          name="nativeTokenSymbol"
          rules={[
            {
              required: true,
              message: 'Please input currency symbol',
            },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label="Block explorer URL (Optional)" name="scanLink">
          <Input autoComplete="off" />
        </Form.Item>
      </Form>
    </Wraper>
  );
};
