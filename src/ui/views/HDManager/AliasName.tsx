import { Input } from 'antd';
import React from 'react';
import { ReactComponent as EditPenSVG } from 'ui/assets/editpen.svg';
import { ReactComponent as CheckSVG } from 'ui/assets/check-2.svg';

interface Props {
  address: string;
  aliasName?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const cachedName = new Map<string, string>();

export const AliasName: React.FC<Props> = ({
  address,
  aliasName,
  onChange,
  disabled,
}) => {
  const [hover, setHover] = React.useState(false);
  const [value, setValue] = React.useState(aliasName);
  const [focus, setFocus] = React.useState(false);

  const onChangeAliasName = React.useCallback((e) => {
    const value = e.target.value;
    if (!value) {
      setFocus(false);
      setHover(false);
      return;
    }
    if (value && value !== aliasName) {
      if (address) {
        cachedName[address] = value;
      }

      onChange(value);
    }
    setFocus(false);
    setHover(false);
    setValue(value);
  }, []);

  React.useEffect(() => {
    setValue(aliasName);

    if (aliasName && cachedName[address] && cachedName[address] !== aliasName) {
      setValue(cachedName[address]);
      onChange(cachedName[address]);
    } else if (aliasName) {
      cachedName[address] = aliasName;
    }
  }, [aliasName]);

  if (!value || disabled) {
    if (cachedName[address]) {
      return (
        <div className="AliasName AliasName--disabled">
          <div className="label">
            <span className="text">{cachedName[address]}</span>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="AliasName" onClick={() => setHover(true)}>
      {hover || focus ? (
        <div className="input-group">
          <Input
            className="alias-input"
            defaultValue={value}
            onBlur={onChangeAliasName}
            onFocus={() => setFocus(true)}
            onPressEnter={onChangeAliasName}
            autoFocus
          />
          <CheckSVG className="icon" />
        </div>
      ) : (
        <div className="label">
          <span className="text">{value}</span>
          <EditPenSVG className="icon" />
        </div>
      )}
    </div>
  );
};
