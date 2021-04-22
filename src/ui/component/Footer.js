import { memo } from 'react';
import { useHistory } from 'react-router-dom';
import cx from 'clsx';
import { Button } from 'ui/component';
import { noop } from 'ui/utils';

const Footer = memo(({ className, children }) => {
  return (
    <div className={cx('p-6 pt-0 w-full absolute bottom-0 left-0', className)}>
      {children}
    </div>
  );
});

Footer.Nav = memo(
  ({
    onNextClick = noop,
    onBackClick,
    backDisabled,
    nextDisabled,
    ...restProps
  }) => {
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
            onClick={onBackClick || handleBack}>
            Back
          </Button>
          <Button
            block
            disabled={nextDisabled}
            type="primary"
            htmlType="submit"
            onClick={onNextClick}>
            Next
          </Button>
        </div>
      </Footer>
    );
  }
);

export default Footer;
