import React, { useEffect, useState } from 'react';
import { useDebounce } from 'react-use';
import { Drawer, Button, Input } from 'antd';
import { Checkbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import { SecurityCheckResponse } from 'background/service/openapi';
import { SvgIconCross } from 'ui/assets';

const SecurityCheckDetail = ({
  visible,
  data,
  okText = 'Confirm',
  cancelText = 'Cancel',
  onOk,
  onCancel,
  preprocessSuccess = true,
}: {
  visible: boolean;
  data: SecurityCheckResponse;
  okText?: string;
  cancelText?: string;
  onOk(): void;
  onCancel(): void;
  preprocessSuccess?: boolean;
}) => {
  const wallet = useWallet();
  const [needPassword, setNeedPassword] = useState(false);
  const [forceProcess, setForceProcess] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordCorrect, setPasswordCorrect] = useState(false);
  const handleForceProcessChange = (checked: boolean) => {
    setForceProcess(checked);
  };
  const handlePasswordChange = (val: string) => {
    setPassword(val);
  };
  useDebounce(
    async () => {
      if (!password) return;
      await wallet.verifyPassword(password);
      setPasswordCorrect(true);
    },
    500,
    [password]
  );
  useEffect(() => {
    if (!data) return;
    if (
      data.danger_list.length > 0 ||
      data.forbidden_list.length > 0 ||
      !preprocessSuccess
    ) {
      setNeedPassword(true);
    }
  }, [data, preprocessSuccess]);
  return (
    <Drawer
      title="Security Check"
      placement="bottom"
      className="security-check-drawer"
      visible={visible}
      onClose={onCancel}
      height="100vh"
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-gray-comment" />
      }
    >
      <div className="security-check-detail">
        <div className="container">
          {data.forbidden_list.length > 0 && (
            <div className="forbidden flex items-start">
              <div className="w-[70px]">
                <div className="symbol">Forbidden</div>
              </div>
              <ul>
                {data.forbidden_list.map((item) => (
                  <li key={`forbidden_${item.id}`}>
                    {item.alert} <span className="number">#{item.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.danger_list.length > 0 && (
            <div className="danger flex items-start">
              <div className="w-[70px]">
                <div className="symbol">Danger</div>
              </div>
              <ul>
                {data.danger_list.map((item) => (
                  <li key={`danger_${item.id}`}>
                    {item.alert} <span className="number">#{item.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.warning_list.length > 0 && (
            <div className="warning flex items-start">
              <div className="w-[70px]">
                <div className="symbol">Warning</div>
              </div>
              <ul>
                {data.warning_list.map((item) => (
                  <li key={`warning_${item.id}`}>
                    {item.alert} <span className="number">#{item.id}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="footer">
          {needPassword && (
            <div className="input-password">
              <p>Enter passward to continue your transaction</p>
              <Input
                placeholder="Please enter the password"
                type="password"
                onChange={(e) => handlePasswordChange(e.target.value)}
              />
            </div>
          )}
          {!preprocessSuccess && (
            <div className="force-process">
              <Checkbox
                checked={forceProcess}
                onChange={(value) => handleForceProcessChange(value)}
              >
                I'm sure I want to proceed anyway.
              </Checkbox>
            </div>
          )}
          <div className="buttons">
            <Button type="primary" onClick={onCancel} size="large">
              {cancelText}
            </Button>
            <Button
              type="primary"
              onClick={onOk}
              size="large"
              disabled={
                (needPassword && !passwordCorrect) ||
                (!preprocessSuccess && !forceProcess)
              }
            >
              {okText}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default SecurityCheckDetail;
