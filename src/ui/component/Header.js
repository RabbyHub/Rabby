import { useHistory } from "react-router-dom";
import { Icon } from 'ui/component';

const Header = ({
  title,
  subTitle,
  showClose = true,
  onCloseClick,
}) => {
  const history = useHistory();

  const handleClose = () => {
    if (onCloseClick) {
      onCloseClick();

      return;
    }

    history.goBack();
  }

  return (
    <div className="flex items-center mb-6">
      <div className="flex-1 text-xl font-bold">
        {title}
        <div className="text-xs text-gray-light">{subTitle}</div>
      </div>
      {showClose && !subTitle && <Icon type="cross" onClick={handleClose} />}
    </div>
  )
}

export default Header;
