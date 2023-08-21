import React, { useEffect } from 'react';
import { Button, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import clsx from 'clsx';
import { getUiType, useWallet, useWalletRequest } from '@/ui/utils';
import { clearClipboard } from '@/ui/utils/clipboard';
import LessPalette from '@/ui/style/var-defs';
import { connectStore, useRabbyDispatch } from '../../store';
import WordsMatrix from '@/ui/component/WordsMatrix';
import IconMnemonicInk from '@/ui/assets/walletlogo/mnemonic-ink.svg';
import LogoSVG from '@/ui/assets/logo.svg';
import { KEYRING_CLASS } from '@/constant';
import { useTranslation } from 'react-i18next';

const Toptip = styled.div`
  background: var(--blue-light, #eef1ff);
  border-radius: 4px;
  padding: 9px 17px;

  font-style: normal;
  font-weight: 400;
  font-size: 13px;
  line-height: 14px;

  color: var(--brand-default, #7084ff);
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
  margin-top: 40px;
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
    margin-top: 24px;
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
  const dispatch = useRabbyDispatch();
  let keyringId: number | null;

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
      keyringId = stashKeyringId;
    },
    {
      onSuccess() {
        setErrMsgs([]);
        clearClipboard();
        history.push({
          pathname: '/import/select-address',
          state: {
            keyring: KEYRING_CLASS.MNEMONIC,
            keyringId,
          },
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
          err?.message ||
            t('page.newAddress.theSeedPhraseIsInvalidPleaseCheck'),
        ]);
      },
    }
  );

  // if is pop, redirect to dashboard
  if (getUiType().isPop) {
    history.replace('/dashboard');
    return null;
  }

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
    <main className="w-screen h-screen bg-gray-bg">
      <div className={clsx('mx-auto pt-[58px]', 'w-[600px]')}>
        <img src={LogoSVG} alt="Rabby" className="mb-[12px]" />
        <Form
          form={form}
          className={clsx(
            'px-[100px] pt-[36px] pb-[40px]',
            'bg-white rounded-[12px]'
          )}
          onFinish={({ mnemonics }: { mnemonics: string }) => run(mnemonics)}
          onValuesChange={(states) => {
            setErrMsgs([]);
            wallet.setPageStateCache({
              path: history.location.pathname,
              params: {},
              states,
            });
          }}
        >
          <h1
            className={clsx(
              'flex items-center justify-center',
              'space-x-[16px] mb-[24px]',
              'text-[20px] text-gray-title'
            )}
          >
            <img className="w-[24px]" src={IconMnemonicInk} />
            <span>{t('page.newAddress.importSeedPhrase')}</span>
          </h1>
          <div>
            <Toptip className="mb-[28px]">
              {t('page.newAddress.seedPhrase.importTips')}
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
                <h3>
                  {t('page.newAddress.seedPhrase.whatIsASeedPhrase.question')}
                </h3>
                <p>
                  {t('page.newAddress.seedPhrase.whatIsASeedPhrase.answer')}
                </p>
              </section>
              <section>
                <h3>
                  {t(
                    'page.newAddress.seedPhrase.isItSafeToImportItInRabby.question'
                  )}
                </h3>
                <p className="whitespace-nowrap">
                  {t(
                    'page.newAddress.seedPhrase.isItSafeToImportItInRabby.answer'
                  )}
                </p>
              </section>
            </TipTextList>
          </div>
          <div className="text-center">
            <Button
              htmlType="submit"
              type="primary"
              className="w-[210px] h-[44px] mt-[40px]"
            >
              {t('global.confirm')}
            </Button>
          </div>
        </Form>
      </div>
    </main>
  );
};

export default connectStore()(ImportMnemonics);
