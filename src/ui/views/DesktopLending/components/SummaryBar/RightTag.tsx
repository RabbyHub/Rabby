import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import { useMode } from '../../hooks/useMode';
import { IsolateTag } from '../IsolateTag';
import styled from 'styled-components';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';
import { ManageEmodeModal } from '../ManageEmodeModal';
import { DisableEmodeModal } from '../DisableEmodeModal';
import { ManageEmodeFullModal } from '../ManageEmodeFullModal';
import { useFetchLendingData } from '../../hooks';

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
  const [enableIntroVisible, setEnableIntroVisible] = useState(false);
  const [disableOverviewVisible, setDisableOverviewVisible] = useState(false);
  const [fullModalVisible, setFullModalVisible] = useState(false);
  const { isInIsolationMode, currentEmode, emodeEnabled, eModes } = useMode();
  const { fetchData } = useFetchLendingData();

  const handleEmodeSuccess = () => {
    setFullModalVisible(false);
    fetchData();
  };

  // 隔离模式：只展示一个全局 Isolated 标签
  if (isInIsolationMode) {
    return (
      <div className="flex items-center gap-[6px]">
        <IsolateTag isGlobal />
      </div>
    );
  }

  // 已开启 eMode：展示当前 eMode 名称，点击打开禁用 eMode 弹窗
  if (emodeEnabled) {
    return (
      <>
        <EthCorrelatedTagWrapper>
          <EthCorrelatedTag
            role="button"
            onClick={() => setDisableOverviewVisible(true)}
            className="cursor-pointer"
          >
            <span className="text-[12px] leading-[14px] font-medium text-[#9AE8FF]">
              +
            </span>
            <span className="text-[12px] leading-[14px] font-medium">
              <span className="text-[#9AE8FF]">
                {currentEmode?.label || ''}
              </span>
              <span className="text-[#CB8EFF]"> CORRELATED</span>
            </span>
            <Tooltip title={t('page.lending.summary.ethCorrelatedTip')}>
              <span onClick={(e) => e.stopPropagation()}>
                <RcIconInfo
                  width={12}
                  height={12}
                  className="cursor-pointer text-[#CB8EFF]"
                />
              </span>
            </Tooltip>
          </EthCorrelatedTag>
        </EthCorrelatedTagWrapper>
        <DisableEmodeModal
          visible={disableOverviewVisible}
          onCancel={() => setDisableOverviewVisible(false)}
          onDisableEmode={() => {
            setEnableIntroVisible(false);
            setDisableOverviewVisible(false);
            setFullModalVisible(true);
          }}
        />
        <ManageEmodeFullModal
          visible={fullModalVisible}
          onCancel={() => setFullModalVisible(false)}
          onSuccess={handleEmodeSuccess}
        />
      </>
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

  // 未开启 eMode：点击打开启用引导弹窗
  return (
    <>
      <button
        type="button"
        onClick={() => setEnableIntroVisible(true)}
        className="flex items-center gap-[6px] bg-r-neutral-card2 rounded-[4px] border-0 py-2 px-6 cursor-pointer"
      >
        <span className="text-[12px] leading-[16px] text-rb-neutral-foot hover:text-r-neutral-title-1">
          {t('page.lending.manageEmode.emode')}
        </span>
      </button>
      <ManageEmodeModal
        visible={enableIntroVisible}
        onCancel={() => setEnableIntroVisible(false)}
        onManageEmode={() => {
          setEnableIntroVisible(false);
          setDisableOverviewVisible(false);
          setFullModalVisible(true);
        }}
      />
      <ManageEmodeFullModal
        visible={fullModalVisible}
        onCancel={() => setFullModalVisible(false)}
        onSuccess={handleEmodeSuccess}
      />
    </>
  );
};

export default RightMarketTabInfo;
