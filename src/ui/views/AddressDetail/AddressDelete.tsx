import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, Field, PageHeader, Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import clsx from 'clsx';
import { Button, Form, Input, message } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { KEYRING_TYPE } from '@/constant';
import IconSuccess from 'ui/assets/success.svg';
import { useHistory } from 'react-router-dom';

function useQuestionsCheck() {
  const { t } = useTranslation();

  const QUESTIONS = React.useMemo(() => {
    return [
      {
        index: 1 as const,
        content: t(
          'I understand that if I delete this address, the corresponding Private Key & Seed Phrase of this address will be deleted and Rabby will NOT be able to recover it.'
        ),
        checked: false,
      },
      {
        index: 2 as const,
        content: t(
          "I confirm that I have backuped the private key or Seed Phrase and I'm ready to delete it now."
        ),
        checked: false,
      },
    ];
  }, []);

  const [questionChecks, setQuestionChecks] = React.useState(QUESTIONS);

  type TIndex = typeof QUESTIONS[number]['index'];
  const toggleCheckedByIndex = React.useCallback((index: TIndex) => {
    setQuestionChecks((prev) => {
      const idx = prev.findIndex((item) => item.index === index);

      prev[idx].checked = !prev[idx].checked;

      return [...prev];
    });
  }, []);

  const reset = useCallback(() => {
    setQuestionChecks((prev) => {
      return prev.map((item) => ({
        ...item,
        checked: false,
      }));
    });
  }, []);

  return {
    questionChecks,
    isAllChecked: React.useMemo(
      () => questionChecks.every((item) => item.checked),
      [questionChecks]
    ),
    toggleCheckedByIndex,
    reset,
  };
}

type AddressDeleteProps = {
  brandName?: string;
  type: string;
  address: string;
  source: string;
};

export const AddressDelete = ({
  type,
  address,
  brandName,
  source,
}: AddressDeleteProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const history = useHistory();
  const handleDeleteAddress = async () => {
    await wallet.removeAddress(address, type, brandName);
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('removed'),
      duration: 0.5,
    });
    setVisible(false);
    setTimeout(() => {
      history.goBack();
    }, 500);
  };

  return (
    <>
      <div className="rabby-list">
        <div
          className="rabby-list-item cursor-pointer"
          onClick={() => {
            setVisible(true);
          }}
        >
          <div className="rabby-list-item-content">
            <div className="rabby-list-item-label" style={{ color: '#EC5151' }}>
              Delete Address
            </div>
            <div className="rabby-list-item-arrow">
              <IconArrowRight
                width={16}
                height={16}
                viewBox="0 0 12 12"
              ></IconArrowRight>
            </div>
          </div>
        </div>
      </div>
      {[KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(type) ? (
        <AddressDeleteCheckModal
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
          onSubmit={() => {
            handleDeleteAddress();
          }}
        ></AddressDeleteCheckModal>
      ) : (
        <AddressDeleteModal
          source={source}
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
          onSubmit={() => {
            handleDeleteAddress();
          }}
        ></AddressDeleteModal>
      )}
    </>
  );
};
type DelectModalProps = {
  visible: boolean;
  onClose(): void;
  onSubmit(): void;
};
const AddressDeleteModal = ({
  visible,
  onClose,
  onSubmit,
  source,
}: DelectModalProps & {
  source: string;
}) => {
  const { t } = useTranslation();
  return (
    <Popup
      visible={visible}
      title={t('Delete address')}
      height={420}
      className="address-delete-modal"
      onClose={onClose}
    >
      <div className="desc">
        This address is a {source} address, Rabby does not store the private key
        or seed phrase for this address, you can just delete it
      </div>
      <footer className="footer flex gap-[16px]">
        <Button type="primary" size="large" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          type="primary"
          ghost
          size="large"
          className={'rabby-btn-ghost'}
          block
        >
          Confirm Delete
        </Button>
      </footer>
    </Popup>
  );
};

const AddressDeleteCheckModal = ({
  visible,
  onClose,
  onSubmit,
}: DelectModalProps) => {
  const {
    questionChecks,
    isAllChecked,
    toggleCheckedByIndex,
    reset,
  } = useQuestionsCheck();
  const { t } = useTranslation();
  const [isShowConfirm, setIsShowConfirm] = useState(false);

  useEffect(() => {
    if (!visible) {
      reset();
      setIsShowConfirm(false);
    }
  }, [visible]);

  return (
    <Popup
      visible={visible}
      title={t('Delete address')}
      height={420}
      className="address-delete-modal"
      onClose={onClose}
    >
      <div className="desc">
        Before you delete, keep the following points in mind to understand how
        to protect your assets
      </div>
      <div className="field-list">
        {questionChecks.map((q) => {
          const handleClickItem = () => {
            toggleCheckedByIndex(q.index);
          };
          return (
            <Field
              key={`item-${q.index}`}
              leftIcon={
                <Checkbox
                  checked={q.checked}
                  width={'20px'}
                  height={'20px'}
                  background="#27C193"
                  onChange={handleClickItem}
                />
              }
              rightIcon={null}
              onClick={handleClickItem}
            >
              {q.content}
            </Field>
          );
        })}
      </div>
      <footer className="footer flex gap-[16px]">
        <Button type="primary" size="large" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="primary"
          ghost
          size="large"
          className={'rabby-btn-ghost'}
          block
          disabled={!isAllChecked}
          onClick={() => {
            setIsShowConfirm(true);
          }}
        >
          Next
        </Button>
      </footer>
      <EnterPasswordModal
        visible={isShowConfirm}
        onClose={() => {
          setIsShowConfirm(false);
        }}
        onSubmit={() => {
          setIsShowConfirm(false);
          onSubmit();
        }}
      ></EnterPasswordModal>
    </Popup>
  );
};

const EnterPasswordModal = ({
  visible,
  onClose,
  onSubmit,
}: DelectModalProps) => {
  const [form] = useForm();
  const wallet = useWallet();
  const { t } = useTranslation();
  const inputRef = useRef<Input>(null);
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      });
    }
  }, [visible]);
  return (
    <div className={clsx('enter-password-modal', visible && 'show')}>
      <div className="title">Enter Password</div>
      <div>
        <Form
          form={form}
          onFinish={async () => {
            const { password } = await form.validateFields();
            try {
              await wallet.verifyPassword(password);
              onSubmit();
            } catch (e: any) {
              form.setFields([
                {
                  name: 'password',
                  errors: [e?.message || t('incorrect password')],
                },
              ]);
              throw e;
            }
          }}
        >
          <Form.Item
            name="password"
            className="h-[80px] mb-[58px]"
            rules={[{ required: true, message: t('Please input password') }]}
          >
            <Input
              ref={inputRef}
              className="popup-input h-[48px]"
              size="large"
              placeholder="Please input password"
              type="password"
              autoFocus
              spellCheck={false}
            ></Input>
          </Form.Item>
          <footer className="footer flex gap-[16px]">
            <Button type="primary" size="large" block onClick={onClose}>
              Back
            </Button>
            <Button
              type="primary"
              ghost
              size="large"
              htmlType="submit"
              className={'rabby-btn-ghost'}
              block
            >
              Confirm Delete
            </Button>
          </footer>
        </Form>
      </div>
    </div>
  );
};
