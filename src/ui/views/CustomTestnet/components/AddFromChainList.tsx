import { PageHeader } from '@/ui/component';
import { Chain } from '@debank/common';
import { Form, Input } from 'antd';
import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import IconSearch from 'ui/assets/search.svg';
import { CustomTestnetItem } from './CustomTestnetItem';
import clsx from 'clsx';

const Wraper = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background-color: var(--r-neutral-bg1, #fff);
  transform: translateX(100%);
  transition: transform 0.3s;
  border-radius: 16px 16px 0px 0px;
  padding: 20px 20px 0 20px;
`;

export const AddFromChainList = ({
  visible,
  onClose,
  className,
}: {
  visible?: boolean;
  className?: string;
  onClose?: () => void;
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  return (
    <Wraper className={clsx({ 'translate-x-0': visible }, className)}>
      <PageHeader className="pt-0" forceShowBack onBack={onClose}>
        Quick add from Chainlist
      </PageHeader>
      <Input
        prefix={<img src={IconSearch} />}
        // Search chain
        placeholder={t('component.ChainSelectorModal.searchPlaceholder')}
        // onChange={(e) => setSearch(e.target.value)}
        // value={search}
        allowClear
      />
      <div>{/* <CustomTestnetItem />` */}</div>
    </Wraper>
  );
};
