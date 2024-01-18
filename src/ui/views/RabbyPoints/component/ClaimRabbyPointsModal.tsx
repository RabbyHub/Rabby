import styled from 'styled-components';
import { Modal } from '@/ui/component';
import React, { useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import SkeletonInput from 'antd/lib/skeleton/Input';
import clsx from 'clsx';
import { useInterval } from 'react-use';
import { ReactComponent as IconInputLoading } from 'ui/assets/rabby-points/loading.svg';
import { ReactComponent as IconInputError } from 'ui/assets/rabby-points/error.svg';
import { ReactComponent as IconInputChecked } from 'ui/assets/rabby-points/checked.svg';
import { formatTokenAmount } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';
import dayjs from 'dayjs';
import { ellipsisAddress } from '@/ui/utils/address';
import { ClaimUserAvatar } from './ClaimUserAvatar';
import { useRabbyPointsInvitedCodeCheck } from '../hooks';
// import Lottie from 'lottie-react';
// import * as animationData from '../../Dashboard/components/ClaimRabbyBadgeModal/success.json';

const StyledModal = styled(Modal)`
  padding-bottom: 0;
  .ant-modal-content {
    border-radius: 16px;
    overflow: initial;
  }
  .ant-modal-body {
    padding: 0;
    max-height: 600px;
  }
`;

const StyledInput = styled(Input)`
  &.ant-input-affix-wrapper {
    border-radius: 8px;
    border: 0.5px solid var(--r-neutral-line, #d3d8e0);
    & > input.ant-input {
      height: 44px;
      font-size: 13px;
      text-align: center;

      &:placeholder-shown {
        color: var(--r-neutral-foot, #6a7587);
      }
    }
  }
`;

const NoIcon = () => null;

export const ClaimRabbyPointsModal = (
  props: {
    visible: boolean;
    onCancel: () => void;
  } & ClaimPointsProps
) => {
  const { visible, onCancel, ...other } = props;
  return (
    <StyledModal
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={NoIcon}
    >
      <ClaimPoints {...other} />
    </StyledModal>
  );
};

const Item = ({
  label,
  value,
  loading = true,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-between">
        <SkeletonInput
          active
          style={{
            width: 92,
            height: 15,
          }}
        />
        <SkeletonInput
          active
          style={{
            width: 52,
            height: 15,
          }}
        />
      </div>
    );
  }
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

interface ClaimPointsProps {
  web3Id?: string;
  logo?: string;
  onClaimed?: (code?: string) => void;
  snapshot?: {
    id: string;
    address_balance: number;
    metamask_swap: number;
    rabby_old_user: number;
    rabby_nadge: number;
    rabby_nft: number;
    extra_bouns: number;
    claimed: boolean;
    snapshot_at: number;
  };
  snapshotLoading?: boolean;
}

const ClaimPoints = ({
  web3Id,
  logo,
  onClaimed,
  snapshot,
  snapshotLoading,
}: ClaimPointsProps) => {
  const { t } = useTranslation();
  const [invitedCode, setInvitedCode] = useState('');
  const [loadingNum, setLoadingNum] = useState(0);
  const account = useRabbySelector((state) => state.account.currentAccount);

  const avatar = logo || '';
  const name = web3Id || ellipsisAddress(account?.address || '');
  const snapshotTime = snapshot?.snapshot_at
    ? dayjs.unix(snapshot?.snapshot_at).format('YYYY-MM-DD HH:mm:ss')
    : '';

  const { codeStatus, codeLoading } = useRabbyPointsInvitedCodeCheck(
    invitedCode
  );

  const iconStatue = useMemo(() => {
    if (!invitedCode) {
      return <div className="w-0" />;
    }
    if (codeLoading) {
      return (
        <IconInputLoading
          viewBox="0 0 16 16"
          className="w-[16px] h-[16px] animate-spin"
        />
      );
    }
    if (!codeStatus?.invite_code_exist) {
      return (
        <IconInputError viewBox="0 0 16 16" className="w-[16px] h-[16px]" />
      );
    }
    return (
      <IconInputChecked viewBox="0 0 16 16" className="w-[16px] h-[16px]" />
    );
  }, [codeStatus?.invite_code_exist, invitedCode, codeLoading]);

  const fixedList = React.useMemo(
    () => [
      {
        key: 'address_balance',
        label: t('page.rabbyPoints.claimModal.addressBalance'),
      },
      {
        key: 'metamask_swap',
        label: t('page.rabbyPoints.claimModal.MetaMaskSwap'),
      },
      {
        key: 'rabby_old_user',
        label: t('page.rabbyPoints.claimModal.rabbyUser'),
      },
      {
        key: 'rabby_nadge',
        label: t('page.rabbyPoints.claimModal.rabbyValuedUserBadge'),
      },
      {
        key: 'rabby_nft',
        label: t('page.rabbyPoints.claimModal.rabbyDesktopGenesisNft'),
      },
    ],
    [t]
  );

  const list = useMemo(
    () =>
      codeStatus?.invite_code_exist
        ? [
            ...fixedList,
            {
              key: 'extra_bouns',
              label: t('page.rabbyPoints.claimModal.referral-code'),
            },
          ]
        : fixedList,
    [fixedList, codeStatus?.invite_code_exist]
  );
  const points = useMemo(() => {
    if (snapshot) {
      const {
        address_balance,
        metamask_swap,
        rabby_nadge,
        rabby_nft,
        rabby_old_user,
        extra_bouns,
      } = snapshot;
      return formatTokenAmount(
        address_balance +
          metamask_swap +
          rabby_nadge +
          rabby_nft +
          rabby_old_user +
          (codeStatus?.invite_code_exist ? extra_bouns : 0),
        0
      );
    }
    return '';
  }, [snapshot, codeStatus?.invite_code_exist]);

  const titleLoading = snapshotLoading || loadingNum < list.length;

  useInterval(
    () => {
      setLoadingNum((s) => s + 1);
    },
    !!snapshot && !snapshotLoading && loadingNum < list.length ? 300 : null
  );

  const onSubmit = React.useCallback(() => {
    onClaimed?.(invitedCode);
  }, [onClaimed, invitedCode]);

  return (
    <div className="relative w-[360px] bg-r-neutral-bg-1 p-[20px] pb-[24px] rounded-[8px] leading-[normal]">
      <div className="text-r-neutral-title1 text-[20px] font-medium text-center">
        {t('page.rabbyPoints.claimModal.title')}
      </div>
      <div className="mt-[12px] mb-[10px] flex items-center justify-center gap-[6px] text-r-neutral-title1 text-[15px] font-medium">
        <ClaimUserAvatar src={avatar} className="w-[20px] h-[20px]" />
        <span>{name}</span>
      </div>
      <div
        className={clsx(
          'text-[32px] font-bold text-center mb-[10px] mx-auto',
          titleLoading && 'animate-pulse'
        )}
        style={
          titleLoading
            ? {
                width: 107,
                height: 38,
                borderRadius: 6,
                background:
                  'linear-gradient(114deg, #5CEBFF 15.26%, #5C42FF 55.67%, #42C6FF 84.74%)',
              }
            : {
                background:
                  'linear-gradient(131deg, #5CEBFF 9.53%, #5C42FF 95.9%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }
        }
      >
        {titleLoading ? '' : points}
      </div>
      <div className="rounded-[8px] bg-r-neutral-card-3 p-[12px] pb-[16px]">
        <div className="text-center text-[10px] text-[#7c86c8] mb-[12px]">
          {t('page.rabbyPoints.claimModal.snapshotTime', {
            time: snapshotTime,
          })}
        </div>
        <div className="flex flex-col gap-[16px]">
          {list.map((e, idx) => (
            <Item
              label={e.label}
              value={snapshot?.[e.key]}
              loading={snapshotLoading || loadingNum < idx}
            />
          ))}
        </div>
      </div>

      <StyledInput
        placeholder={t('page.rabbyPoints.claimModal.placeholder')}
        value={invitedCode}
        onChange={(e) => setInvitedCode(e.target.value?.toUpperCase())}
        className={clsx(
          'w-full mt-[22px] mb-[24px]',
          invitedCode &&
            !codeLoading &&
            !codeStatus?.invite_code_exist &&
            'border-rabby-red-default'
        )}
        suffix={iconStatue}
        autoComplete="false"
        autoCorrect="false"
      />

      <Button
        type="primary"
        className="w-full h-[48px] text-[17px] font-medium text-r-neutral-title2"
        onClick={onSubmit}
      >
        {t('page.rabbyPoints.claimModal.claim')}
      </Button>
      {/* <div className="absolute top-20 left-0 pointer-events-none">
        {!titleLoading && (
          <Lottie animationData={animationData} loop height={360} width={360} />
        )}
      </div> */}
    </div>
  );
};
