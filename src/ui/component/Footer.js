import { useHistory } from "react-router-dom";
import cx from 'clsx';
import { Button } from 'ui/component';
import { noop } from 'ui/helper';

const Footer = ({
  className,
  children,
}) => {
  return (
    <div className={cx('p-6 pt-0 w-full absolute bottom-0 left-0', className)}>
      {children}
    </div>
  );
}

Footer.Nav = ({
  onNextClick = noop,
  backDisabled,
  nextDisabled,
  ...restProps
}) => {
  const history = useHistory();

  const handleBack = () => {
    history.goBack();
  }

  return (
    <Footer {...restProps}>
      <div className="flex space-x-4">
        <Button block disabled={backDisabled} onClick={handleBack}>Back</Button>
        <Button block disabled={nextDisabled} type="primary" onClick={onNextClick}>Next</Button>
      </div>
    </Footer>
  )
}

export default Footer;
