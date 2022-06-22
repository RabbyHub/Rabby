import React, { useEffect } from 'react';
import { Form, FormInstance, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import clsx from 'clsx';
import { useMedia } from 'react-use';
import LessPalette from 'ui/style/var-defs';
import { connectStore, useRabbyDispatch } from '../../store';
import WordsMatrix from '@/ui/component/WordsMatrix';

const Toptip = styled.div`
  background: rgba(134, 151, 255, 0.1);
  border-radius: 4px;
  padding: 9px 15px;

  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;

  color: ${LessPalette['@primary-color']};
`;

const FormItemWrapper = styled.div`
  .mnemonics-with-error {
    .ant-form-item-control-input
      + .ant-form-item-explain.ant-form-item-explain-error {
      display: none;
    }
  }
`;

const TipTextList = styled.ol`
  list-style-type: decimal;

  > li {
    font-weight: 400;
    color: ${LessPalette['@color-body']};
    line-height: 20px;
  }

  > li + li {
    margin-top: 4px;
  }
`;

type IFormStates = {
  mnemonics: string;
};
const ImportMnemonics = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm<IFormStates>();
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');

  const dispatch = useRabbyDispatch();

  const [run, loading] = useWalletRequest(
    async (mnemonics: string) => {
      const {
        keyringId: stashKeyringId,
        isExistedKR,
      } = await wallet.generateKeyringWithMnemonic(mnemonics);

      dispatch.importMnemonics.switchKeyring({
        finalMnemonics: mnemonics,
        isExistedKeyring: isExistedKR,
        stashKeyringId,
      });
    },
    {
      onSuccess() {
        setErrMsgs([]);
        history.push({
          pathname: '/popup/import/mnemonics-confirm',
        });
      },
      onError(err) {
        // nothing but reset form errors
        form.setFields([
          {
            name: 'mnemonics',
            value: form.getFieldValue('mnemonics'),
          },
        ]);
        setErrMsgs([
          err?.message || t('The seed phrase is invalid, please check!'),
        ]);
      },
    }
  );

  useEffect(() => {
    (async () => {
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache && cache.path === history.location.pathname) {
          form.setFieldsValue({
            ...cache.states,
            mnemonics: '',
          });
        }
      }
    })();

    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  const [errMsgs, setErrMsgs] = React.useState<string[]>();

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      spinning={loading}
      form={form}
      formProps={{
        onValuesChange: (states) => {
          setErrMsgs([]);
          wallet.setPageStateCache({
            path: history.location.pathname,
            params: {},
            states,
          });
        },
      }}
      onSubmit={({ mnemonics }) => run(mnemonics)}
      onNextClick={() => {
        form
          .validateFields(['mnemonics'])
          .then(() => {
            setErrMsgs([]);
          })
          .catch(({ errorFields }) => {
            const errMsgs = form.getFieldError('mnemonics');

            setErrMsgs(errMsgs);
          });
      }}
      hasBack
      hasDivider
      noPadding
      onBackClick={() => {
        if (history.length > 1) {
          history.goBack();
        } else {
          history.replace('/');
        }
      }}
      backDisabled={false}
    >
      <header className="create-new-header import-mnemonics-header h-[60px] leading-[60px] py-0">
        <h2 className="text-20 mb-0 mt-0 text-white text-center font-medium">
          {t('Import Seed Phrase')}
        </h2>
      </header>
      <div className="rabby-container">
        <div className="pt-20 px-20">
          <Toptip className="mb-[20px]">
            You can paste your entire secret recovery phrase in any field
          </Toptip>
          <FormItemWrapper className="relative">
            <Form.Item
              name="mnemonics"
              className={clsx(
                'mb-[12px]',
                errMsgs?.length && 'mnemonics-with-error'
              )}
              rules={[
                { required: true, message: t('Please input Seed Phrase') },
              ]}
            >
              <WordsMatrix.MnemonicsInputs errMsgs={errMsgs} />
            </Form.Item>
          </FormItemWrapper>
          <TipTextList className="text-14 pl-20 mt-35">
            <li>
              The seed phrase you import will only be stored on the front end of
              your browser and will not be uploaded to Rabby's servers.
            </li>
            <li>
              After you uninstall Rabby or your browser, the seed phrase will be
              deleted and cannot be recovered.
            </li>
          </TipTextList>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(ImportMnemonics);
