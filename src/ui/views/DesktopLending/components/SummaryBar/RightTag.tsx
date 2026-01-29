import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMode } from '../../hooks/useMode';
import { IsolateTag } from '../IsolateTag';
import styled from 'styled-components';
import { Tooltip } from 'antd';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';

const EthCorrelatedTagWrapper = styled.div`
  background: white;
  border-radius: 6px;
  padding: 1.5px;
  background: linear-gradient(135deg, #9ae8ff 0%, #cb8eff 100%);
`;

const EthCorrelatedTag = styled.div`
  background: white;
  border-radius: 5px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const RightMarketTabInfo: React.FC = () => {
  const { t } = useTranslation();
  const { isInIsolationMode, currentEmode, emodeEnabled, eModes } = useMode();

  // 隔离模式：只展示一个全局 Isolated 标签
  if (isInIsolationMode) {
    return (
      <div className="flex items-center gap-[6px]">
        <IsolateTag isGlobal />
      </div>
    );
  }

  // 已开启 eMode：展示当前 eMode 名称
  if (emodeEnabled) {
    return (
      <EthCorrelatedTagWrapper>
        <EthCorrelatedTag>
          <span className="text-[12px] leading-[14px] font-medium text-[#9AE8FF]">
            +
          </span>
          <span className="text-[12px] leading-[14px] font-medium">
            <span className="text-[#9AE8FF]">{currentEmode?.label || ''}</span>
            <span className="text-[#CB8EFF]"> CORRELATED</span>
          </span>
          <Tooltip title={t('page.lending.summary.ethCorrelatedTip')}>
            <RcIconInfo
              width={12}
              height={12}
              className="cursor-pointer text-[#CB8EFF]"
            />
          </Tooltip>
        </EthCorrelatedTag>
      </EthCorrelatedTagWrapper>
    );
  }

  // eMode 不可用：仅一个空的文案（原逻辑：只有一个空 eMode 时不展示）
  if (
    eModes &&
    Object.keys(eModes).length === 1 &&
    (eModes as any)[0]?.assets?.length === 0
  ) {
    return null;
  }

  return (
    <div className="flex items-center gap-[6px]">
      <span className="text-[12px] leading-[16px] text-rb-neutral-foot">
        {t('page.lending.manageEmode.emode')}
      </span>
    </div>
  );
};

export default RightMarketTabInfo;
