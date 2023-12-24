import React from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import LessPalette from '@/ui/style/var-defs';
import { useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';

const Overlay = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: var(--rabby-custom-ant-drawer-mask);
  z-index: 999;
  position: fixed;
  top: 0;
  left: 0;
`;

const Inner = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 160px;
  width: 360px;
  background: var(--r-neutral-bg-1);
  box-shadow: 0px 20px 20px rgba(45, 48, 51, 0.16);
  border-radius: 6px;
  padding: 40px 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const TextContent = styled.p`
  font-weight: 500;
  font-size: 15px;
  line-height: 22px;
  margin: 0 0 36px 0;
  text-align: center;
  color: var(--r-neutral-title-1);
`;

const RejectAllButton = styled.a`
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  text-align: center;
  color: ${LessPalette['@color-text']};
  margin-top: 16px;
`;

const NumberText = styled.span`
  color: var(--r-blue-default, #7084ff);
`;

const PendingApproval = ({
  count,
  onRejectAll,
}: {
  count: number;
  onRejectAll: () => void;
}) => {
  const wallet = useWallet();

  const handleActiveApproval = async () => {
    await wallet.activeFirstApproval();
    window.close();
  };

  const handleOnRejectAll = async () => {
    await wallet.rejectAllApprovals();
    onRejectAll();
  };
  const { t } = useTranslation();

  return (
    <Overlay>
      <Inner>
        <TextContent>
          <NumberText>{count}</NumberText>{' '}
          {count === 1
            ? t('page.dashboard.home.transactionNeedsToSign')
            : t('page.dashboard.home.transactionsNeedToSign')}
        </TextContent>
        <Button
          className="w-[200px] h-[40px] rounded"
          type="primary"
          onClick={handleActiveApproval}
        >
          {count === 1
            ? t('page.dashboard.home.view')
            : t('page.dashboard.home.viewFirstOne')}
        </Button>
        <RejectAllButton href="#" onClick={handleOnRejectAll}>
          {t('page.dashboard.home.rejectAll')}
        </RejectAllButton>
      </Inner>
    </Overlay>
  );
};

export default PendingApproval;
