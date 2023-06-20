import { Radio } from 'antd';
import React from 'react';
import { ReactComponent as TabHistorySVG } from '@/ui/assets/dashboard/tab-history.svg';
import { ReactComponent as TabListSVG } from '@/ui/assets/dashboard/tab-list.svg';
import { ReactComponent as TabSummarySVG } from '@/ui/assets/dashboard/tab-summary.svg';
import styled from 'styled-components';

export enum TokenTabEnum {
  List = 'list',
  Summary = 'summary',
  History = 'history',
}

const TabsStyled = styled(Radio.Group)`
  background: #f5f6fa;
  border-radius: 6px;
  padding: 2px;

  .ant-radio {
    display: none;

    & + span {
      padding: 0;
    }
  }

  .ant-radio-wrapper {
    border-radius: 4px;
    padding: 6px 8px;
    margin-right: 0;
    color: #707280;

    &:after {
      display: none;
    }
  }

  .ant-radio-wrapper-checked {
    background: #fff;
    color: #13141a;
  }
`;

export interface Props {
  activeTab?: TokenTabEnum;
  onTabChange?: (tab: TokenTabEnum) => void;
}

export const TokenTabs: React.FC<Props> = ({
  activeTab = TokenTabEnum.List,
  onTabChange,
}) => {
  return (
    <div>
      <TabsStyled
        options={[
          { label: <TabListSVG />, value: TokenTabEnum.List },
          { label: <TabSummarySVG />, value: TokenTabEnum.Summary },
          { label: <TabHistorySVG />, value: TokenTabEnum.History },
        ]}
        value={activeTab}
        onChange={(e) => onTabChange?.(e.target.value)}
        defaultValue={TokenTabEnum.List}
      />
    </div>
  );
};
