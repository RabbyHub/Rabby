import { Button, Form, Input } from 'antd';
import styled from 'styled-components';
import clsx from 'clsx';
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Popup, Checkbox, Field } from 'ui/component';
import LessPalette from '@/ui/style/var-defs';
import { WrappedComponentProps, wrapModalPromise } from '../Modal/WrapPromise';

interface AuthenticationModalProps extends WrappedComponentProps {
  validationHandler?(password: string): Promise<void>;
  confirmText?: string;
  cancelText?: string;
  title?: string;
  description?: string;
  checklist?: string[];
}

const Description = styled.div`
  margin-bottom: 20px;
  font-weight: 400;
  font-size: 14px;
  line-height: 16px;
  text-align: center;
  color: #4b4d59;
`;

const FieldList = styled.div`
  margin-bottom: 20px;

  .field {
    background: ${LessPalette['@color-bg']};
    border-radius: 6px;
    padding: 16px 12px;

    font-weight: 400;
    font-size: 14px;
    line-height: 18px;
    color: ${LessPalette['@color-title']};
    border: 1px solid transparent;
    margin-bottom: 8px;

    &:hover {
      background-color: rgba(134, 151, 255, 0.2);
      border: 1px solid var(--brand-default, #7084ff);
    }

    &:nth-last-child(1) {
      margin-bottom: 0;
    }
  }
`;

function useQuestionsCheck(checklist: string[]) {
  const QUESTIONS = React.useMemo(() => {
    return checklist.map((item, index) => ({
      index,
      content: item,
      checked: false,
    }));
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

const AuthenticationModal = ({
  description,
  checklist = [],
  validationHandler,
  onFinished,
  onCancel,
  wallet,
  cancelText,
  confirmText = 'Confirm',
  title = 'Enter Password',
}: AuthenticationModalProps) => {
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const inputRef = useRef<Input>(null);
  const {
    questionChecks,
    isAllChecked,
    toggleCheckedByIndex,
    reset,
  } = useQuestionsCheck(checklist);
  const height = useMemo(() => {
    if (!description && checklist.length <= 0) return 240;
    if (description && checklist.length <= 0) return 280;
    return 480;
  }, [description, checklist]);

  const handleSubmit = async ({ password }: { password: string }) => {
    try {
      if (validationHandler) {
        await validationHandler(password);
      } else {
        await wallet?.verifyPassword(password);
      }
      onFinished();
      setVisible(false);
    } catch (e: any) {
      form.setFields([
        {
          name: 'password',
          errors: [e?.message || t('incorrect password')],
        },
      ]);
    }
  };

  const handleCancel = () => {
    setVisible(false);
    onCancel();
  };

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
      inputRef.current?.focus();
    });
  }, []);

  return (
    <Popup
      className={clsx('input-password-popup', { 'has-desc': !!description })}
      visible={visible}
      title={title}
      onCancel={handleCancel}
      height={height}
    >
      {description && <Description>{description}</Description>}
      {checklist.length > 0 && (
        <FieldList>
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
        </FieldList>
      )}
      <Form onFinish={handleSubmit} form={form}>
        <Form.Item
          name="password"
          rules={[{ required: true, message: t('Please input password') }]}
        >
          <Input
            className="popup-input"
            placeholder={t('Enter the Password to Confirm')}
            type="password"
            size="large"
            autoFocus
            ref={inputRef}
            spellCheck={false}
          />
        </Form.Item>
        <div
          className={clsx(
            'flex pt-6 popup-footer px-20',
            cancelText ? 'justify-between' : 'justify-center'
          )}
        >
          {cancelText && (
            <Button
              size="large"
              type="primary"
              className="w-[172px] rabby-btn-ghost"
              ghost
              onClick={handleCancel}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            className={clsx(cancelText ? 'w-[172px]' : 'w-[200px]')}
            disabled={checklist.length > 0 ? !isAllChecked : false}
          >
            {confirmText}
          </Button>
        </div>
      </Form>
    </Popup>
  );
};

const AuthenticationModalPromise = wrapModalPromise<AuthenticationModalProps>(
  AuthenticationModal
);

export default AuthenticationModalPromise;
