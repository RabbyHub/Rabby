import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMode } from '../../hooks/useMode';
import { IsolateTag } from '../IsolateTag';
import styled from 'styled-components';
import { ManageEmodeModal } from '../ManageEmodeModal';
import { DisableEmodeModal } from '../DisableEmodeModal';
import { ManageEmodeFullModal } from '../ManageEmodeFullModal';
import { ReactComponent as RcIconLightingCC } from '@/ui/assets/lending/lighting-cc.svg';
import { ReactComponent as RcIconSettingCC } from '@/ui/assets/lending/setting.svg';
import { InfoTitle } from '.';

const EthCorrelatedTagWrapper = styled.div`
  background-color: var(--rb-neutral-bg-1);
  border-radius: 6px;
  padding: 1.5px;
  background: linear-gradient(135deg, #9ae8ff 0%, #cb8eff 100%);
`;

const EthCorrelatedTag = styled.div`
  background-color: var(--rb-neutral-bg-1);
  border-radius: 5px;
  padding: 4px;
  display: flex;
  align-items: center;
  gap: 0px;
`;

export const RightMarketTabInfo: React.FC = () => {
  const { t } = useTranslation();
  const [enableIntroVisible, setEnableIntroVisible] = useState(false);
  const [disableOverviewVisible, setDisableOverviewVisible] = useState(false);
  const [fullModalVisible, setFullModalVisible] = useState(false);
  const { isInIsolationMode, currentEmode, emodeEnabled, eModes } = useMode();

  const handleEmodeSuccess = () => {
    setFullModalVisible(false);
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
      <div className="flex items-center gap-[6px]">
        <InfoTitle>{t('page.lending.summary.eMode')}: </InfoTitle>
        <div>
          <EthCorrelatedTagWrapper>
            <EthCorrelatedTag
              role="button"
              onClick={() => setDisableOverviewVisible(true)}
              className="cursor-pointer"
            >
              <span className="text-[12px] leading-[14px] font-medium text-[#9AE8FF]">
                <RcIconLightingCC
                  width={16}
                  height={16}
                  className="text-[#9AE8FF]"
                />
              </span>
              <span className="text-[12px] leading-[14px] font-medium whitespace-nowrap">
                <div className="text-[#9AE8FF] max-w-[100px] overflow-ellipsis overflow-hidden">
                  {currentEmode?.label || ''}
                </div>
              </span>
              <RcIconSettingCC
                width={16}
                height={16}
                className="text-[#CB8EFF]"
              />
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
            height={415}
          />
        </div>
      </div>
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
    <div className="flex items-center gap-[6px]">
      <div className="flex items-center">
        <InfoTitle>{t('page.lending.summary.eMode')}: </InfoTitle>
      </div>
      <div
        onClick={() => setEnableIntroVisible(true)}
        className="flex items-center gap-[0px] bg-rb-neutral-bg-5 rounded-[6px] border-0 py-4 px-[6px] cursor-pointer"
      >
        <RcIconLightingCC
          width={16}
          height={16}
          className="text-rb-neutral-foot"
        />
        <div className="text-[12px] leading-[16px] text-rb-neutral-foot font-semibold">
          {t('page.lending.disabled')}
        </div>
        <RcIconSettingCC
          width={16}
          height={16}
          className="text-rb-neutral-foot"
        />
      </div>
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
    </div>
  );
};

export default RightMarketTabInfo;
