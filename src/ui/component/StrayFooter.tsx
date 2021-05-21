import React, { memo, ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import cx from 'clsx';
import { Button } from 'antd';

interface StrayFooterProps {
  className?: string;
  children: ReactNode;
}

export interface StrayFooterNavProps {
  onNextClick?(): void;
  onBackClick?(): void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  hasBack?: boolean;
  hasDivider?: boolean;
  className?: string;
  NextButtonText?: string;
}

interface CompoundedComponent
  extends React.MemoExoticComponent<React.FunctionComponent<StrayFooterProps>> {
  Nav: typeof StrayFooterNav;
}

const StrayFooter = memo(({ className, children }: StrayFooterProps) => {
  return (
    <div className={cx('absolute bottom-0 left-0 w-full flex', className)}>
      {children}
    </div>
  );
}) as CompoundedComponent;

const StrayFooterNav = memo(
  ({
    onNextClick,
    onBackClick,
    backDisabled,
    nextDisabled,
    hasBack = false,
    hasDivider = false,
    NextButtonText = 'Next',
    className,
  }: StrayFooterNavProps) => {
    const history = useHistory();

    const handleBack = async () => {
      if (onBackClick) {
        await Promise.resolve(onBackClick());
      }
      history.goBack();
    };

    return (
      <StrayFooter className={className}>
        <div
          className={cx(
            'py-24 px-20 w-full flex justify-center',
            hasDivider && ['bg-white', 'border-gray-divider', 'border-t']
          )}
        >
          {hasBack && (
            <Button
              disabled={backDisabled}
              onClick={handleBack}
              size="large"
              className="flex-1 mr-16"
            >
              Back
            </Button>
          )}
          <Button
            disabled={nextDisabled}
            htmlType="submit"
            onClick={onNextClick}
            size="large"
            className={hasBack ? 'flex-1' : 'w-[200px]'}
            type="primary"
          >
            {NextButtonText}
          </Button>
        </div>
      </StrayFooter>
    );
  }
);

StrayFooter.Nav = StrayFooterNav;

export default StrayFooter;
