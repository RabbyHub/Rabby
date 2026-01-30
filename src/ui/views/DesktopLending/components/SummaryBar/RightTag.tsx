import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Tooltip } from 'antd';
import { useMode } from '../../hooks/useMode';
import { IsolateTag } from '../IsolateTag';
import styled from 'styled-components';
import { ReactComponent as RcIconInfo } from '@/ui/assets/tip-cc.svg';
import { ModalCloseIcon } from '@/ui/views/DesktopProfile/components/TokenDetailModal';

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
  const [emodeModalVisible, setEmodeModalVisible] = useState(false);
  const { isInIsolationMode, currentEmode, emodeEnabled, eModes } = useMode();

  const openEmodeModal = useCallback(() => setEmodeModalVisible(true), []);
  const closeEmodeModal = useCallback(() => setEmodeModalVisible(false), []);

  // 隔离模式：只展示一个全局 Isolated 标签
  if (isInIsolationMode) {
    return (
      <div className="flex items-center gap-[6px]">
        <IsolateTag isGlobal />
      </div>
    );
  }

  // 已开启 eMode：展示当前 eMode 名称，点击打开 eMode 管理弹窗
  if (emodeEnabled) {
    return (
      <>
        <EthCorrelatedTagWrapper>
          <EthCorrelatedTag
            role="button"
            onClick={openEmodeModal}
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
        <Modal
          visible={emodeModalVisible}
          onCancel={closeEmodeModal}
          width={400}
          title={null}
          bodyStyle={{ background: 'transparent', padding: 0 }}
          maskClosable
          footer={null}
          zIndex={1000}
          className="modal-support-darkmode"
          closeIcon={ModalCloseIcon}
          centered
          maskStyle={{
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px]">
            <p className="text-[16px] text-r-neutral-title-1">
              {t('page.lending.manageEmode.emode')}
            </p>
          </div>
        </Modal>
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

  return (
    <>
      <button
        type="button"
        onClick={openEmodeModal}
        className="flex items-center gap-[6px] bg-transparent border-0 p-0 cursor-pointer"
      >
        <span className="text-[12px] leading-[16px] text-rb-neutral-foot hover:text-r-neutral-title-1">
          {t('page.lending.manageEmode.emode')}
        </span>
      </button>
      <Modal
        visible={emodeModalVisible}
        onCancel={closeEmodeModal}
        width={400}
        title={null}
        bodyStyle={{ background: 'transparent', padding: 0 }}
        maskClosable
        footer={null}
        zIndex={1000}
        className="modal-support-darkmode"
        closeIcon={ModalCloseIcon}
        centered
        maskStyle={{
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="bg-r-neutral-bg-2 rounded-[12px] p-[24px]">
          <p className="text-[16px] text-r-neutral-title-1">
            {t('page.lending.manageEmode.emode')}
          </p>
        </div>
      </Modal>
    </>
  );
};

export default RightMarketTabInfo;
