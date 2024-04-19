import React, { memo, ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import cx from 'clsx';
import { Button } from 'antd';

interface StrayFooterProps {
  className?: string;
  children: ReactNode;
  isFixed?: boolean;
}

export interface StrayFooterNavProps {
  onNextClick?(e?: any): void;
  onBackClick?(): void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  hasBack?: boolean;
  hasDivider?: boolean;
  className?: string;
  NextButtonContent?: React.ReactNode;
  BackButtonContent?: React.ReactNode;
  footerFixed?: boolean;
}

interface CompoundedComponent
  extends React.MemoExoticComponent<React.FunctionComponent<StrayFooterProps>> {
  Nav: typeof StrayFooterNav;
}

const StrayFooter = memo(
  ({ className, children, isFixed = true }: StrayFooterProps) => {
    return (
      <div
        className={cx(
          'bottom-0 left-0 w-full flex lg:bottom-[-24px]',
          className,
          {
            fixed: isFixed,
            absolute: !isFixed,
          }
        )}
      >
        {children}
      </div>
    );
  }
) as CompoundedComponent;

const StrayFooterNav = memo(
  ({
    onNextClick,
    onBackClick,
    backDisabled,
    nextDisabled,
    nextLoading,
    hasBack = false,
    hasDivider = false,
    NextButtonContent = 'Next',
    BackButtonContent = 'Back',
    className,
    footerFixed,
  }: StrayFooterNavProps) => {
    const history = useHistory();

    const handleBack = async () => {
      if (onBackClick) {
        onBackClick();
        return;
      }

      history.goBack();
    };

    return (
      <StrayFooter className={className} isFixed={footerFixed}>
        <div
          className={cx(
            'py-20 px-20 w-full flex justify-center stray-footer-nav',
            hasDivider && 'bg-r-neutral-bg-1 border-t-r-neutral-line border-t'
          )}
        >
          {hasBack && (
            <Button
              disabled={backDisabled}
              onClick={handleBack}
              size="large"
              className="flex-1 mr-16 lg:h-[52px]"
            >
              {BackButtonContent}
            </Button>
          )}
          <Button
            disabled={nextDisabled}
            htmlType="submit"
            onClick={onNextClick}
            size="large"
            className={cx('lg:h-[52px]', 'flex-1')}
            type="primary"
            loading={nextLoading}
          >
            {NextButtonContent}
          </Button>
        </div>
      </StrayFooter>
    );
  }
);

StrayFooter.Nav = StrayFooterNav;

export default StrayFooter;
