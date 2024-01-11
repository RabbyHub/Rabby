import styled from 'styled-components';
import { Modal } from '@/ui/component';
import React, { useState } from 'react';
import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';

const StyledModal = styled(Modal)`
  padding-bottom: 0;
  .ant-modal-content {
    border-radius: 16px;
    overflow: initial;
  }
  .ant-modal-body {
    padding: 0;
  }
`;

const StyledInput = styled(Input)`
  &.ant-input {
    border-radius: 8px;
    border: 0.5px solid var(--r-neutral-line, #d3d8e0);
    height: 44px;
    font-size: 13px;
    text-align: left;

    &:placeholder-shown {
      padding-left: 50px;
      color: var(--r-neutral-foot, #6a7587);
      font-size: 13px;
      font-weight: 400;
    }
  }
`;

const NoIcon = () => null;

export const ClaimRabbyPointsModal = ({
  visible,
  onCancel,
  onClaimed,
}: {
  visible: boolean;
  onCancel: () => void;
  onClaimed?: () => void;
}) => {
  return (
    <StyledModal
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={NoIcon}
    >
      <ClaimPoints
      //onClaimed={onClaimed}
      />
    </StyledModal>
  );
};

const Item = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-r-neutral-body text-[13px]">{label}</span>
      <span className="text-r-neutral-title-1 text-[13px] font-medium">
        {Number(value) > 0 ? '+' : ''}
        {value}
      </span>
    </div>
  );
};

const ClaimPoints = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const avatar = '';
  const name = 'hongbo.eth';
  const snapshotTime = '2024-1-10 00:00';
  const points = '56,300';

  const list = React.useMemo(
    () => [
      {
        key: '',
        label: t('page.dashboard.rabbyPoints.claimModal.addressBalance'),
      },
      {
        key: '',
        label: t('page.dashboard.rabbyPoints.claimModal.MetaMaskSwap'),
      },
      {
        key: '',
        label: t('page.dashboard.rabbyPoints.claimModal.rabbyUser'),
      },
      {
        key: '',
        label: t('page.dashboard.rabbyPoints.claimModal.rabbyValuedUserBadge'),
      },
      {
        key: '',
        label: t(
          'page.dashboard.rabbyPoints.claimModal.rabbyDesktopGenesisNft'
        ),
      },
    ],
    [t]
  );

  return (
    <div className="w-[360px] bg-r-neutral-bg-1 p-[20px] pb-[24px] rounded-[8px] leading-[normal]">
      <div className="text-r-neutral-title1 text-[20px] font-medium text-center">
        {t('page.dashboard.rabbyPoints.claimModal.title')}
      </div>
      <div className="mt-[12px] mb-[10px] flex items-center justify-center gap-[6px] text-r-neutral-title1 text-[15px] font-medium">
        <img src={avatar} className="w-[20px] h-[20px]" />
        <span>{name}</span>
      </div>
      <div
        className="text-[32px] font-bold text-center mb-[10px]"
        style={{
          background: 'linear-gradient(131deg, #5CEBFF 9.53%, #5C42FF 95.9%)',
          backgroundClip: 'text',
        }}
      >
        {points}
      </div>
      <div className="rounded-[8px] bg-r-neutral-card-3 p-[12px] pb-[16px]">
        <div className="text-center text-[10px] text-[#7c86c8] mb-[12px]">
          {t('page.dashboard.rabbyPoints.claimModal.snapshotTime', {
            time: snapshotTime,
          })}
        </div>
        <div className="flex flex-col gap-[16px]">
          {list.map((e) => (
            <Item label={e.label} value={'100'} />
          ))}
        </div>
      </div>

      <StyledInput
        placeholder={t('page.dashboard.rabbyPoints.claimModal.placeholder')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full mt-[22px] mb-[24px]"
      />

      <Button
        type="primary"
        className="w-full h-[48px] text-[17px] font-medium text-r-neutral-title2"
      >
        {t('page.dashboard.rabbyPoints.claimModal.claim')}
      </Button>
    </div>
  );
};
