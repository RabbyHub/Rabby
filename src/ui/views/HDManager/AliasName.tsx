import { Input } from 'antd';
import React from 'react';
import { ReactComponent as EditPenSVG } from 'ui/assets/editpen.svg';
import { ReactComponent as CheckSVG } from 'ui/assets/check-2.svg';
import { Flex, Text, TextField } from '@radix-ui/themes';

interface Props {
  address: string;
  aliasName?: string;
  cacheAliasName?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const cachedName = new Map<string, string>();

export const AliasName: React.FC<Props> = ({
  address,
  aliasName,
  cacheAliasName,
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

    if (aliasName) {
      cachedName[address] = aliasName;
    }
  }, [aliasName]);

  if (!value || disabled) {
    if (cachedName[address] ?? cacheAliasName) {
      return (
        <div className="AliasName AliasName--disabled">
          <div className="label">
            <span className="text">
              {cachedName[address] ?? cacheAliasName}
            </span>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="AliasName" onClick={() => setHover(true)}>
      {hover || focus ? (
        <Flex align={'center'} gap={'2'} className="input-group">
          {/*<Input
            className="alias-input"
            defaultValue={value}
            onBlur={onChangeAliasName}
            onFocus={() => setFocus(true)}
            onPressEnter={onChangeAliasName}
            autoFocus
          />*/}
          <TextField.Root
            radius="large"
            defaultValue={value}
            onBlur={onChangeAliasName}
            onFocus={() => setFocus(true)}
            // onPressEnter={onChangeAliasName}
            autoFocus
          />
          <CheckSVG className="icon" />
        </Flex>
      ) : (
        <Flex align={'center'} gap={'2'} className="label">
          <Text size={'2'} className="text">
            {value}
          </Text>
          <EditPenSVG className="icon" />
        </Flex>
      )}
    </div>
  );
};
