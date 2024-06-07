import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Button } from 'antd';
import SkeletonInput from 'antd/lib/skeleton/Input';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as IconInputLoading } from 'ui/assets/rabby-points/loading.svg';

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
}
export const ClaimItem = (props: ClaimItemProps) => {
  const { t } = useTranslation();
  const claim = () => {
    props.onClaim(props.id, props.claimable_points || 0);
  };

  const disabled =
    props.claimable_points <= 0 || !props.claimable || !!props.claimLoading;

  const showDisabledTip = props.claimable_points <= 0 || !props.claimable;
  return (
    <Wrapper
      style={
        props.claimable
          ? {
              background:
                'linear-gradient(91deg, rgba(50, 108, 255, 0.10) 1.88%, rgba(174, 43, 255, 0.10) 99.85%)',
            }
          : {}
      }
    >
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
          overlayClassName="rectangle w-[max-content]"
          title={t('page.rabbyPoints.claimItem.disabledTip')}
          visible={showDisabledTip ? undefined : false}
        >
          <div>
            <Button
              className={clsx(
                'min-w-[100px] h-[32px]  text-[13px] font-medium border-none',
                !props.claimLoading && disabled
                  ? 'disabled-btn border-rabby-neutral-card-2 bg-r-neutral-card-2 text-r-neutral-foot text-opacity-50'
                  : 'text-r-neutral-title-2'
              )}
              style={
                props.claimable
                  ? {
                      borderRadius: '4px',
                      background:
                        'linear-gradient(91deg, #326CFF 1.88%, #AE2BFF 99.85%)',
                      boxShadow: '0px 2px 8px 0px rgba(95, 124, 254, 0.16)',
                      border: 'none',
                    }
                  : {}
              }
              disabled={disabled}
              onClick={claim}
            >
              <div className="relative flex items-start justify-center gap-4 loading-button-wrapper">
                <span>
                  {t('page.rabbyPoints.claimItem.claim')}{' '}
                  {props.claimable_points <= 0 || !props.claimable
                    ? ''
                    : props.claimable_points}
                </span>
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
