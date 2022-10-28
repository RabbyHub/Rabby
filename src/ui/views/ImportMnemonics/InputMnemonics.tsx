import React, { useEffect } from 'react';
import { Form, FormInstance, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { Navbar, StrayPageWithButton } from 'ui/component';
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
  .mnemonics-with-error,
  .ant-form-item-has-error {
    .ant-form-item-control-input
      + .ant-form-item-explain.ant-form-item-explain-error {
      display: none;
    }
  }
`;

const TipTextList = styled.div`
  margin-top: 32px;
  h3 {
    font-weight: 700;
    font-size: 13px;
    line-height: 15px;
    color: #13141a;
    margin-top: 0;
    margin-bottom: 8px;
  }
  p {
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: #4b4d59;
    margin: 0;
  }
  section + section {
    margin-top: 16px;
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
      onSubmit={({ mnemonics }: { mnemonics: string }) => run(mnemonics)}
      onNextClick={() => {
        const mnemonics = form.getFieldValue('mnemonics');
        if (!mnemonics) {
          setErrMsgs([t('Please enter the seed phrase')]);
          return;
        }
        setErrMsgs([]);
      }}
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
      NextButtonContent="Confirm"
    >
      <Navbar
        onBack={() => {
          if (history.length > 1) {
            history.goBack();
          } else {
            history.replace('/');
          }
        }}
      >
        {t('Import Seed Phrase')}
      </Navbar>
      <div className="rabby-container">
        <div className="pt-12 px-20">
          <Toptip className="mb-[12px]">
            You can paste your entire secret recovery phrase in 1st field
          </Toptip>
          <FormItemWrapper className="relative">
            <Form.Item
              name="mnemonics"
              className={clsx(
                'mb-[12px]',
                errMsgs?.length && 'mnemonics-with-error'
              )}
            >
              <WordsMatrix.MnemonicsInputs errMsgs={errMsgs} />
            </Form.Item>
          </FormItemWrapper>
          <TipTextList>
            <section>
              <h3>What is a Seed Phrase?</h3>
              <p>A 12, 18, or 24-word phrase used to control your assets.</p>
            </section>
            <section>
              <h3>Is it safe to import it in Rabby?</h3>
              <p>
                Yes, it will be stored locally on your browser and only
                accessible to you.
              </p>
            </section>
          </TipTextList>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(ImportMnemonics);
