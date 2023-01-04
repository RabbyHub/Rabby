import { Input } from 'antd';
import React from 'react';
import { ReactComponent as EditPenSVG } from 'ui/assets/editpen.svg';

interface Props {
  address: string;
  aliasName?: string;
  onChange: (value: string) => void;
}

const cachedName = new Map<string, string>();

export const AliasName: React.FC<Props> = ({
  address,
  aliasName,
  onChange,
}) => {
  const [hover, setHover] = React.useState(false);
  const [value, setValue] = React.useState(aliasName);
  const [focus, setFocus] = React.useState(false);

  const onChangeAliasName = React.useCallback(() => {
    if (value && value !== aliasName) {
      if (address) {
        cachedName[address] = value;
      }

      onChange(value);
    }
    setFocus(false);
    setHover(false);
  }, [value]);

  React.useEffect(() => {
    setValue(aliasName);
    if (aliasName) {
      cachedName[address] = aliasName;
    }
  }, [aliasName]);

  if (!value) {
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
        <Input
          className="alias-input"
          defaultValue={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onChangeAliasName}
          onFocus={() => setFocus(true)}
          onPressEnter={onChangeAliasName}
          autoFocus
        />
      ) : (
        <div className="label">
          <span className="text">{value}</span>
          <EditPenSVG />
        </div>
      )}
    </div>
  );
};
