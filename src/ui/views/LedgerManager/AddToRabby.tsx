import React from 'react';
import RcSwitch from 'rc-switch';
import { ReactComponent as RabbySVG } from 'ui/assets/ledger/rabby.svg';
import { ReactComponent as RabbyGraySVG } from 'ui/assets/ledger/rabby-gray.svg';
interface Props {
  onChange?: (value: boolean) => void;
  checked?: boolean;
}
export const AddToRabby: React.FC<Props> = ({ checked, onChange }) => {
  const handleOnChange = React.useCallback((value: boolean) => {
    onChange?.(value);
  }, []);
  return (
    <RcSwitch
      onChange={handleOnChange}
      prefixCls="ant-switch"
      className="AddToRabby"
      checked={checked}
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
