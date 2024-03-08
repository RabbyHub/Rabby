import { Chain } from '@debank/common';
import { Form, Input } from 'antd';
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

export const CustomTestnetForm = () => {
  const [form] = Form.useForm();
  return (
    <Wraper>
      <Form layout="vertical" form={form}>
        <Form.Item label="Chain ID" name="id">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label="Network name" name="name">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label="RPC URL" name="rpcUrl">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label="Currency symbol" name="nativeTokenSymbol">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item label="Block explorer URL (Optional)" name="scanLink">
          <Input autoComplete="off" />
        </Form.Item>
      </Form>
    </Wraper>
  );
};
