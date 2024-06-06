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
import { ReactComponent as IconTrophy } from 'ui/assets/rabby-points/trophy.svg';
import { ReactComponent as IconInfoCC } from 'ui/assets/info-cc.svg';

import { formatTokenAmount } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';
import dayjs from 'dayjs';
import { ellipsisAddress } from '@/ui/utils/address';
import { ClaimUserAvatar } from './ClaimUserAvatar';
import { useRabbyPointsInvitedCodeCheck } from '../hooks';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

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
  background: var(--r-neutral-bg1, #fff);
  &.ant-input-affix-wrapper {
    border-radius: 8px;
    border: 1px solid var(--r-neutral-line, #d3d8e0);
    & > input.ant-input {
      height: 44px;
      font-size: 15px;
      font-weight: 500;
      text-align: center;
      background: var(--r-neutral-bg1, #fff);
      color: var(--r-neutral-title1, #192945);
      transition: none;

      &:placeholder-shown {
        color: var(--r-neutral-foot, #6a7587);
        font-size: 13px;
        font-weight: normal;
      }
    }
  }
  &:hover,
  &.ant-input-affix-wrapper-focused {
    border: 1px solid var(--r-blue-default, #7084ff);
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
        {Number(value) >= 0 ? '+' : ''}
        {value || 0}
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
    wallet_balance_reward: number;
    active_stats_reward: number;
    extra_bouns: number;
    claimed: boolean;
    snapshot_at: number;
  };
  snapshotLoading?: boolean;
  userInvitedCode?: string;
}

const LinearGradientAnimatedDiv = styled.div`
  @keyframes gradientLoading {
    0% {
      background-position: 0% 0%;
    }
    25% {
      background-position: 100% 0%;
    }
    50% {
      background-position: 100% 100%;
    }
    75% {
      background-position: 0% 100%;
    }
    100% {
      background-position: 0% 0%;
    }
  }
`;

const ClaimPoints = ({
  web3Id,
  logo,
  onClaimed,
  snapshot,
  snapshotLoading,
  userInvitedCode,
}: ClaimPointsProps) => {
  const { t } = useTranslation();
  const [invitedCode, setInvitedCode] = useState('');
  const [loadingNum, setLoadingNum] = useState(0);
  const account = useRabbySelector((state) => state.account.currentAccount);

  const avatar = logo || '';
  const name = web3Id || ellipsisAddress(account?.address || '');
  const snapshotTime = snapshot?.snapshot_at
    ? dayjs
        .unix(snapshot?.snapshot_at)
        .utc(false)
        .format('UTC+0 YYYY-MM-DD HH:mm:ss')
    : '';

  const debounceInvitedCode = useDebounceValue(invitedCode, 200);
  const { codeStatus, codeLoading } = useRabbyPointsInvitedCodeCheck(
    debounceInvitedCode
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
      return <div className="w-0" />;
    }
    return (
      <IconInputChecked viewBox="0 0 16 16" className="w-[16px] h-[16px]" />
    );
  }, [codeStatus?.invite_code_exist, invitedCode, codeLoading]);

  const fixedList = React.useMemo(
    () => [
      {
        key: 'wallet_balance_reward',
        label: t('page.rabbyPoints.claimModal.walletBalance'),
      },
      {
        key: 'active_stats_reward',
        label: t('page.rabbyPoints.claimModal.activeStats'),
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
        wallet_balance_reward,
        active_stats_reward,
        extra_bouns,
      } = snapshot;
      return formatTokenAmount(
        wallet_balance_reward +
          active_stats_reward +
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
    !!snapshot && !snapshotLoading && loadingNum < list.length ? 900 : null
  );

  const onSubmit = React.useCallback(() => {
    onClaimed?.(invitedCode);
  }, [onClaimed, invitedCode]);

  const btdDisabled =
    (!!userInvitedCode && !codeLoading && invitedCode === userInvitedCode) ||
    titleLoading;

  return (
    <div className="relative w-[360px] bg-r-neutral-bg-1 p-[20px] pb-[24px] rounded-[8px] leading-[normal]">
      <div
        className="absolute w-full top-0 left-0 px-20 py-14 flex justify-between"
        style={{
          background:
            'linear-gradient(91deg, rgba(50, 108, 255, 0.10) 1.88%, rgba(174, 43, 255, 0.10) 99.85%)',
        }}
      >
        <div className="text-r-neutral-title1 text-[18px] font-medium">
          {t('page.rabbyPoints.claimModal.title')}
        </div>

        <div className="flex items-center justify-center gap-2">
          <IconTrophy className="w-[18px] h-[18px]" />
          <span
            style={{
              fontSize: 15,
              fontWeight: 510,
              lineHeight: 'normal',
              background:
                'linear-gradient(91deg, #326CFF 1.88%, #AE2BFF 99.85%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('page.rabbyPoints.claimModal.season2')}
          </span>
        </div>
      </div>

      <LinearGradientAnimatedDiv
        className={clsx('text-[32px] font-bold text-center mt-[44px] mx-auto')}
        style={
          titleLoading
            ? {
                width: 107,
                height: 38,
                borderRadius: 6,
                animation: 'gradientLoading 1s ease infinite',
                backgroundSize: '150% 100%',
                backgroundRepeat: 'repeat-x',
                backgroundImage:
                  'linear-gradient(94deg, #326CFF 14.47%, #AE2BFF 93.83%)',
              }
            : {
                background:
                  'linear-gradient(91deg, #326CFF 1.88%, #AE2BFF 99.85%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }
        }
      >
        {titleLoading ? '' : points}
      </LinearGradientAnimatedDiv>
      <div className="mt-[8px] mb-[16px] flex items-center justify-center gap-[6px] text-r-neutral-title1 text-[15px] font-medium">
        <ClaimUserAvatar src={avatar} className="w-[20px] h-[20px]" />
        <span>{name}</span>
      </div>

      <div className="rounded-[8px] bg-r-neutral-card-3 px-[12px] py-[16px]">
        <div className="text-center text-[10px] text-[#7c86c8] mb-[12px]">
          {t('page.rabbyPoints.claimModal.snapshotTime', {
            time: snapshotTime,
          })}
        </div>
        <div className="flex flex-col gap-[16px]">
          {list.map((e, idx) => (
            <Item
              key={e.key}
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
          'w-full mt-[22px]',
          invitedCode &&
            !codeLoading &&
            !codeStatus?.invite_code_exist &&
            'border-rabby-red-default'
        )}
        suffix={iconStatue}
        autoComplete="false"
        autoCorrect="false"
      />

      {!!debounceInvitedCode &&
        !codeStatus?.invite_code_exist &&
        !codeLoading && (
          <div className="text-13 text-rabby-red-default mt-8 text-center">
            {t('page.rabbyPoints.claimModal.invalid-code')}
          </div>
        )}

      {userInvitedCode && !codeLoading && invitedCode === userInvitedCode && (
        <div className="text-13 text-r-neutral-body mt-16 text-center flex items-center justify-center gap-[3px]">
          <IconInfoCC className="w-[14px] h-[14px] text-r-neutral-body" />
          <span>{t('page.rabbyPoints.claimModal.cantUseOwnCode')}</span>
        </div>
      )}

      <Button
        type="primary"
        disabled={btdDisabled}
        className={clsx(
          'mt-[24px] w-full h-[48px] text-[17px] font-medium text-r-neutral-title2 border-none',
          btdDisabled && 'opacity-50'
        )}
        style={{
          background: 'linear-gradient(91deg, #326CFF 1.88%, #AE2BFF 99.85%)',
        }}
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
