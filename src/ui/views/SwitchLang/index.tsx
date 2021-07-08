import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { PageHeader } from 'ui/component';
import FieldCheckbox from 'ui/component/FieldCheckbox';
import { LANGS } from 'consts';
import i18n, { addResourceBundle } from 'src/i18n';
import './style.less';

const SwitchLang = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [lang, setLang] = useState(wallet.getLocale());
  const handleSwitchLang = async (checked: boolean, value: string) => {
    if (checked) {
      setLang(value);
      wallet.setLocale(value);
      await addResourceBundle(value);
      i18n.changeLanguage(value);
    }
  };

  return (
    <div className="switch-lang">
      <PageHeader>{t('Languages')}</PageHeader>
      {LANGS.map((current) => (
        <FieldCheckbox
          leftIcon={<img src={current.icon} className="icon-lang" />}
          checked={current.value === lang}
          onChange={(checked) => handleSwitchLang(checked, current.value)}
        >
          {current.label}
        </FieldCheckbox>
      ))}
    </div>
  );
};

export default SwitchLang;
