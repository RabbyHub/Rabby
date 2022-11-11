import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input, Form, Spin, Button, Drawer } from 'antd';
import { useWallet, useWalletRequest } from 'ui/utils';
import UnlockLogo from 'ui/assets/unlock-logo.svg';
import IconCheck from 'ui/assets/check.svg';
import clsx from 'clsx';
import { useCss, useToggle } from 'react-use';
import ReactMarkdown from 'react-markdown';
import TermOfUse from '@/constant/term-of-use.md';
import remarkGfm from 'remark-gfm';

const MINIMUM_PASSWORD_LENGTH = 8;

const CreatePassword = () => {
  const history = useHistory();
  const location = useLocation<{ handle: (h: typeof history) => void }>();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const [run, loading] = useWalletRequest(wallet.boot, {
    onSuccess() {
      const { handle } = location.state;
      handle?.(history);
    },
    onError(err) {
      form.setFields([
        {
          name: 'password',
          errors: [err?.message || t('incorrect password')],
        },
      ]);
    },
  });

  const init = async () => {
    if ((await wallet.isBooted()) && !(await wallet.isUnlocked())) {
      history.replace('/unlock');
      return;
    }

    const currentAccount = await wallet.getCurrentAccount();
    if ((await wallet.isBooted()) && !currentAccount) {
      history.replace('/no-address');
      return;
    }
  };

  const [agreeTerm, toggleAgreeTerm] = useToggle(true);

  const [visible, toggleVisible] = useToggle(false);

  const isInvalidForm = useCallback(
    () =>
      form.getFieldsError().some((e) => e.errors.length > 0) ||
      !form.getFieldValue('password') ||
      form.getFieldValue('password')?.length < 8 ||
      form.getFieldValue('password') !== form.getFieldValue('confirmPassword'),
    [form]
  );

  const [invalidForm, setInValidForm] = useState(isInvalidForm);

  const disable = !agreeTerm || invalidForm;

  const drawClassName = useCss({
    '& .ant-drawer-content': {
      boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
      borderRadius: '16px 16px 0px 0',
    },
    '& .ant-drawer-body': {
      'h1,h2': {
        fontSize: '15px',
        fontWeight: '700',
        color: 'rgba(19, 20, 26, 1)',
        margin: '20px 0',
      },
      p: {
        margin: '0 0 10px 0',
      },
      li: {
        marginTop: '4px',
      },
      'p,li': {
        fontSize: '14px',
        color: 'rgba(75, 77, 89, 1)',
      },
      'ol, ul': {
        listStyle: 'disc outside none',
        paddingLeft: '14px ',
      },
    },
  });
  const spinClass = useCss({
    '&.ant-spin-nested-loading ,& .ant-spin-container': {
      height: '100%',
    },
    '& .ant-form-item-control > div:last-child.ant-form-item-control-input': {
      margin: '0 0 26px 0',
    },
    '& .ant-form-item-control > div:last-child.ant-form-item-explain.ant-form-item-explain-error': {
      margin: '8px 0 4px 0',
    },
  });

  useEffect(() => {
    init();
  }, []);

  return (
    <Spin spinning={loading} wrapperClassName={spinClass} size="large">
      <div className="rabby-container h-full" style={{ background: '#F5F6FA' }}>
        <Form
          className="h-full"
          onFinish={({ password }) => run(password.trim())}
          form={form}
          onChange={() => {
            setInValidForm(isInvalidForm);
          }}
        >
          <header className="create-new-header create-password-header h-[234px]">
            <img
              className="unlock-logo w-[100px] h-[100px] mx-auto mb-[16px]"
              src={UnlockLogo}
            />
            <p className="text-24 mb-8 mt-0 text-white text-center font-bold">
              Set Password
            </p>
            <p className="text-14 mb-0 text-white opacity-80 text-center">
              It will be used to unlock your wallet and encrypt local data
            </p>
            <img src="/images/create-password-mask.png" className="mask" />
          </header>
          <div className="p-32 min-h-[232px] max-h-[232px] overflow-hidden">
            <Form.Item
              className="mb-0 overflow-hidden"
              name="password"
              validateTrigger={['onChange', 'submit']}
              rules={[
                {
                  required: true,
                  message: t('Please input Password'),
                },
                {
                  min: MINIMUM_PASSWORD_LENGTH,
                  message: 'Password must be at least 8 characters long',
                },
              ]}
            >
              <Input
                className={'h-[52px]'}
                size="large"
                placeholder={'Password must be at least 8 characters long'}
                type="password"
                autoFocus
                spellCheck={false}
              />
            </Form.Item>
            <Form.Item
              className="mb-0 "
              name="confirmPassword"
              validateTrigger={['onChange', 'onsubmit']}
              rules={[
                {
                  required: true,
                  message: t('Please Confirm Password'),
                },
                ({ getFieldValue }) => ({
                  validator(_, value: string) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error(t('Passwords do not match'))
                    );
                  },
                }),
              ]}
            >
              <Input
                className="h-[52px]"
                size="large"
                placeholder={'Confirm password'}
                type="password"
                spellCheck={false}
              />
            </Form.Item>
          </div>
          <div
            className="flex items-center justify-center mb-[24px] cursor-pointer"
            onClick={toggleAgreeTerm}
          >
            <div
              className={clsx(
                'w-[15px] h-[15px] mr-[6px] flex items-center justify-center  rounded-full overflow-hidden',
                agreeTerm ? 'bg-blue-light' : 'bg-gray-comment'
              )}
            >
              <img src={IconCheck} className="w-[10px]" />
            </div>
            <span className="text-[13px] text-gray-subTitle">
              I have read and agree to the{' '}
              <span
                className="text-blue-light cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisible();
                }}
              >
                Terms of Use
              </span>
            </span>{' '}
          </div>
          <div className="p-32 pt-0">
            <Button
              type="primary"
              size="large"
              block
              htmlType="submit"
              disabled={disable}
            >
              Next
            </Button>
          </div>
        </Form>
      </div>

      <Drawer
        placement="bottom"
        width={'100%'}
        visible={visible}
        onClose={toggleVisible}
        className={drawClassName}
        contentWrapperStyle={{
          boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
          borderRadius: '16px 16px 0px 0',
          height: 580,
        }}
      >
        <header className="text-gray-title mb-[20px] text-20 font-medium leading-[20px] text-center">
          Rabby Term of Use
        </header>
        <div
          className="overflow-scroll"
          style={{
            maxHeight: 496,
          }}
        >
          <ReactMarkdown
            className="markdown-body"
            children={TermOfUse}
            remarkPlugins={[remarkGfm]}
          />
        </div>
      </Drawer>
    </Spin>
  );
};

export default CreatePassword;
