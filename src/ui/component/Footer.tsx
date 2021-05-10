import React, { memo, ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import cx from 'clsx';
import { Button } from 'antd';
import { noop } from 'ui/utils';

interface FooterProps {
  className?: string;
  children: ReactNode;
}

interface NavProps {
  onNextClick?(): void;
  onBackClick?(): void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
}

interface CompoundedComponent
  extends React.MemoExoticComponent<React.FunctionComponent<FooterProps>> {
  Nav: typeof Nav;
}

const Footer = memo(({ className, children }: FooterProps) => {
  return (
    <div className={cx('p-6 pt-0 w-full absolute bottom-0 left-0', className)}>
      {children}
    </div>
  );
}) as CompoundedComponent;

const Nav = memo(
  ({
    onNextClick = noop,
    onBackClick,
    backDisabled,
    nextDisabled,
    ...restProps
  }: NavProps) => {
    const history = useHistory();

    const handleBack = () => {
      history.goBack();
    };

    return (
      <Footer {...restProps}>
        <div className="flex space-x-4">
          <Button
            block
            disabled={backDisabled}
            onClick={onBackClick || handleBack}
          >
            Back
          </Button>
          <Button
            block
            key="submit"
            disabled={nextDisabled}
            type="primary"
            htmlType="submit"
            onClick={onNextClick}
          >
            Next
          </Button>
        </div>
      </Footer>
    );
  }
);

Footer.Nav = Nav;

export default Footer;
