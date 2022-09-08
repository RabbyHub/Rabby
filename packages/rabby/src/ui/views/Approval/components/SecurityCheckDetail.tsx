import React, { useEffect, useState, useRef } from 'react';
import { useDebounce } from 'react-use';
import { Drawer, Button, Input, Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { Checkbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import { SecurityCheckResponse } from 'background/service/openapi';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

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
  const inputEl = useRef<any>(null);
  const { t } = useTranslation();
  const [needPassword, setNeedPassword] = useState(false);
  const [forceProcess, setForceProcess] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordCorrect, setPasswordCorrect] = useState(true);
  const handleForceProcessChange = (checked: boolean) => {
    setForceProcess(checked);
  };
  const handlePasswordChange = (val: string) => {
    setPassword(val);
  };
  const handleClickSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (needPassword) {
        await wallet.verifyPassword(password);
      }
      onOk();
    } catch (e) {
      setPasswordCorrect(false);
    }
  };

  useDebounce(
    async () => {
      if (!password && passwordCorrect) return;
      try {
        await wallet.verifyPassword(password);
        setPasswordCorrect(true);
      } catch (e) {
        setPasswordCorrect(false);
      }
    },
    500,
    [password]
  );

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        if (inputEl.current) {
          inputEl.current.focus();
        }
      }, 100);
    }
  }, [visible]);

  useEffect(() => {
    if (!data) return;
    if (
      data.forbidden_list.length > 0 ||
      data.danger_list.length > 0 ||
      !preprocessSuccess
    ) {
      setNeedPassword(true);
    }
  }, [data, preprocessSuccess]);

  useEffect(() => {
    if (data.danger_list.length <= 0 && data.forbidden_list.length <= 0) {
      setCanSubmit(true);
      return;
    }
    if (
      data.forbidden_list.length > 0 &&
      passwordCorrect &&
      password &&
      forceProcess
    ) {
      setCanSubmit(true);
      return;
    }
    if (data.danger_list.length > 0 && passwordCorrect && password) {
      setCanSubmit(true);
      return;
    }
    setCanSubmit(false);
  }, [data, forceProcess, password, passwordCorrect]);

  return (
    <Drawer
      title="Security Check"
      placement="bottom"
      className="security-check-drawer"
      visible={visible}
      destroyOnClose
      onClose={onCancel}
      height={window.innerHeight - 60}
      closeIcon={
        <img src={IconArrowRight} className="w-14 icon icon-drawer-close" />
      }
    >
      <div className="security-check-detail">
        <div className="container">
          {data.forbidden_list.length > 0 && (
            <div className="forbidden flex items-start">
              <div className="w-[70px]">
                <div className="symbol">{t('Forbidden')}</div>
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
                <div className="symbol">{t('Danger')}</div>
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
                <div className="symbol">{t('Warning')}</div>
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
              <p>{t('Enter password to continue your transaction')}</p>
              <Form onFinish={handleClickSubmit}>
                <Form.Item
                  name="password"
                  validateTrigger="blur"
                  validateStatus={passwordCorrect ? 'success' : 'error'}
                  help={passwordCorrect ? null : t('incorrect password')}
                >
                  <Input
                    placeholder={t('Please enter the password')}
                    type="password"
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    spellCheck={false}
                    ref={inputEl}
                  />
                </Form.Item>
              </Form>
            </div>
          )}
          {data.forbidden_list.length > 0 && (
            <div className="force-process">
              <Checkbox
                checked={forceProcess}
                onChange={(value) => handleForceProcessChange(value)}
              >
                {t('processAnyway')}
              </Checkbox>
            </div>
          )}
          <div className="buttons">
            <Button type="primary" onClick={onCancel} size="large">
              {cancelText}
            </Button>
            <Button
              type="primary"
              onClick={handleClickSubmit}
              size="large"
              disabled={!canSubmit}
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
