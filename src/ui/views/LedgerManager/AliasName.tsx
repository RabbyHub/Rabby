import { Input } from 'antd';
import React from 'react';
import { Account } from './AccountList';
import { ReactComponent as EditPenSVG } from 'ui/assets/editpen.svg';

interface Props {
  account: Account;
  onChange: (value: string) => void;
}
export const AliasName: React.FC<Props> = ({ account, onChange }) => {
  const [hover, setHover] = React.useState(false);
  const [value, setValue] = React.useState(account.aliasName ?? '');
  const [focus, setFocus] = React.useState(false);

  const onChangeAliasName = React.useCallback(() => {
    if (value !== account.aliasName) {
      onChange(value);
    }
    setFocus(false);
    setHover(false);
  }, [value]);

  if (!account.aliasName) {
    return null;
  }

  return (
    <div className="AliasName" onClick={() => setHover(true)}>
      {hover || focus ? (
        <Input
          className="alias-input"
          defaultValue={account.aliasName}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onChangeAliasName}
          onFocus={() => setFocus(true)}
          onPressEnter={onChangeAliasName}
          autoFocus
        />
      ) : (
        <div className="label">
          <span className="text">{account.aliasName}</span>
          <EditPenSVG />
        </div>
      )}
    </div>
  );
};
