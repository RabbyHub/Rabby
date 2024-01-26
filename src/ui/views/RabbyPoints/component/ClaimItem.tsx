import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Button, Tooltip } from 'antd';
import SkeletonInput from 'antd/lib/skeleton/Input';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { ReactComponent as IconInputLoading } from 'ui/assets/rabby-points/loading.svg';
import { useRabbyPoints } from '../hooks';
import { shareRabbyPointsTwitter } from './CodeAndShare';

const Wrapper = styled.div`
  position: relative;
  border: 0.5px solid var(--r-neutral-line, #d3d8e0);
  border-radius: 8px;
  padding: 12px 0;
  padding-top: 14px;
  .loading-button-wrapper {
    svg g path {
      stroke: rgba(255, 255, 255, 0.6);
    }
  }
`;

interface ClaimItemProps {
  id: number;
  title: string;
  description: string;
  start_at: number;
  end_at: number;
  claimable_points: number;
  onClaim: (id: number, points: number) => void;
  claimable?: boolean;
  claimLoading?: boolean;
  can_join_today?: boolean;
  snapshot?: ReturnType<typeof useRabbyPoints>['snapshot'];
  usedOtherInvitedCode?: boolean;
  invitedCode?: string;
  onOpenCodeModal: () => void;
}
export const ClaimItem = (props: ClaimItemProps) => {
  const {
    can_join_today: canJoinToday = false,
    id,
    snapshot,
    usedOtherInvitedCode,
    invitedCode,
    onOpenCodeModal,
  } = props;
  const { t } = useTranslation();

  const history = useHistory();

  const idsEvents = React.useMemo(
    () => ({
      1: () => {
        if (!invitedCode) {
          onOpenCodeModal();
          return;
        }
        shareRabbyPointsTwitter({
          snapshot,
          usedOtherInvitedCode,
          invitedCode,
        });
      },
      3: () => {
        history.push('/dex-swap?rbisource=rabbypoints');
      },
      4: () => {
        history.push('/gas-top-up');
      },
    }),
    [snapshot, usedOtherInvitedCode, invitedCode, onOpenCodeModal]
  );

  const canJoin = useMemo(() => {
    if (id === 1) {
      return true;
    }
    return canJoinToday;
  }, [id, canJoinToday]);

  const claim = () => {
    if (props.claimable) {
      props.onClaim(props.id, props.claimable_points || 0);
    } else if (canJoin) {
      idsEvents[props.id]();
    }
  };

  const btnText = useMemo(() => {
    if (props.claimable) {
      return `${t('page.rabbyPoints.claimItem.claim')} ${
        !props.claimable ? '' : props.claimable_points
      }`;
    }
    if (canJoin) {
      return t('page.rabbyPoints.claimItem.go');
    }
    if (!props.claimable) {
      return t('page.rabbyPoints.claimItem.go');
    }
  }, [props.claimable_points, props.claimable, canJoin]);

  console.log('props', props);

  return (
    <Wrapper className={clsx(props.claimable && 'bg-rabby-blue-light-1 ')}>
      <div className="flex items-center justify-between pb-[12px] px-[16px] border-b-[0.5px] border-rabby-neutral-line">
        <div className="text-[15px] font-medium text-r-neutral-title1">
          {props.title}
        </div>
        <TooltipWithMagnetArrow
          placement="top"
          arrowPointAtCenter
          overlayInnerStyle={{
            position: 'relative',
            left: '-20px',
          }}
          align={{
            targetOffset: [0, -8],
          }}
          overlayClassName="rectangle w-[190px]"
          title={
            <div className="mx-auto">
              {t('page.rabbyPoints.claimItem.earnTip')}
            </div>
          }
          visible={
            !canJoin && !props.claimable && !props.claimLoading
              ? undefined
              : false
          }
        >
          <div>
            <Button
              key={`${!canJoin && !props.claimable && !props.claimLoading}`}
              type="primary"
              className={clsx(
                'min-w-[100px] h-[32px]  text-[13px] font-medium',
                !props.claimable && !canJoinToday
                  ? 'disabled-btn border-rabby-neutral-card-2 bg-r-neutral-card-2 text-r-neutral-foot text-opacity-50'
                  : 'text-r-neutral-title-2'
              )}
              style={
                props.claimable
                  ? {
                      borderRadius: '4px',
                      background:
                        'var(--Linear, linear-gradient(131deg, #5CEBFF 9.53%, #5C42FF 95.9%))',
                      boxShadow: '0px 2px 8px 0px rgba(95, 124, 254, 0.16)',
                      border: 'none',
                    }
                  : {}
              }
              disabled={!props.claimable && !canJoin}
              onClick={claim}
            >
              <div className="relative flex items-start justify-center gap-4 loading-button-wrapper">
                <span>{btnText}</span>
                {props.claimLoading && (
                  <IconInputLoading className="relative top-[2px] animate-spin" />
                )}
              </div>
            </Button>
          </div>
        </TooltipWithMagnetArrow>
      </div>
      <div className="pt-[12px] text-r-neutral-foot text-[12px] font-normal px-[16px]">
        {props.description}
      </div>
    </Wrapper>
  );
};

export const ClaimItemLoading = () => {
  return (
    <Wrapper className="border-[0.5px] border-rabby-neutral-line">
      <div className="flex items-center justify-between pb-[12px] px-[16px]  border-b-[0.5px] border-rabby-neutral-line">
        <SkeletonInput active style={{ width: 146, height: 18 }} />
      </div>
      <div className="pt-[12px] text-r-neutral-foot text-[12px] px-[16px]">
        <SkeletonInput active style={{ width: 300, height: 14 }} />
      </div>
    </Wrapper>
  );
};

export const ClaimLoading = () => {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <ClaimItemLoading key={i} />
      ))}
    </>
  );
};
