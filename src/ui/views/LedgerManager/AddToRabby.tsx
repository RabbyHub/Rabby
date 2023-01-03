import React from 'react';
import RcSwitch from 'rc-switch';
import { ReactComponent as RabbySVG } from 'ui/assets/ledger/rabby.svg';
import { ReactComponent as RabbyGraySVG } from 'ui/assets/ledger/rabby-gray.svg';
interface Props {
  onChange?: (value: boolean) => void;
}
export const AddToRabby: React.FC<Props> = ({ onChange }) => {
  const [checked, setChecked] = React.useState(false);
  const handleOnChange = React.useCallback(
    (value: boolean) => {
      setChecked(value);
      onChange?.(value);
    },
    [setChecked]
  );
  return (
    <RcSwitch
      onChange={handleOnChange}
      prefixCls="ant-switch"
      className="AddToRabby"
      loadingIcon={
        <div className="ant-switch-handle">
          {checked ? (
            <RabbySVG className="icon" />
          ) : (
            <RabbyGraySVG className="icon" />
          )}
        </div>
      }
    />
  );
};
