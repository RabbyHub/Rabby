import React from 'react';
import { useTranslation } from 'react-i18next';
import { Popup, Checkbox } from 'ui/component';
import { useDocumentClass } from '@/ui/hooks/useDocumentClass';
import styles from './UserListDrawer.module.css';

// Rendered inside the Popup so the rules apply exactly while its content is
// mounted, as the former createGlobalStyle did.
const GlobalStyle = () => {
  useDocumentClass(styles.globalActive);
  return null;
};

interface Props {
  origin: string;
  logo: string;
  onWhitelist: boolean;
  onBlacklist: boolean;
  visible: boolean;
  onClose(): void;
  onChange({
    onWhitelist,
    onBlacklist,
  }: {
    onWhitelist: boolean;
    onBlacklist: boolean;
  }): void;
}

const UserListDrawer = ({
  origin,
  logo,
  onWhitelist,
  onBlacklist,
  onChange,
  visible,
  onClose,
}: Props) => {
  const { t } = useTranslation();

  return (
    <Popup
      visible={visible}
      onClose={onClose}
      height="340"
      closable
      title={t('page.connect.manageWhiteBlackList')}
      className="user-list-drawer"
      isSupportDarkMode
    >
      <GlobalStyle />
      <div className={styles.userListDrawerWrapper}>
        <div className="origin">
          <img src={logo} className="logo" />
          <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {origin}
          </span>
        </div>
      </div>
      <div className={styles.footer}>
        <div
          className="item"
          onClick={() => onChange({ onBlacklist: false, onWhitelist: false })}
        >
          <div>{t('page.connect.noMark')}</div>
          <div>
            <Checkbox
              checked={!onWhitelist && !onBlacklist}
              onChange={() =>
                onChange({ onBlacklist: false, onWhitelist: false })
              }
            />
          </div>
        </div>
        <div
          className="item"
          onClick={() => onChange({ onBlacklist: false, onWhitelist: true })}
        >
          <div className="text-r-green-default">
            {t('page.connect.trusted')}
          </div>
          <div>
            <Checkbox
              checked={onWhitelist}
              onChange={() =>
                onChange({ onBlacklist: false, onWhitelist: true })
              }
            />
          </div>
        </div>
        <div
          className="item"
          onClick={() => onChange({ onBlacklist: true, onWhitelist: false })}
        >
          <div className="text-r-red-default">{t('page.connect.blocked')}</div>
          <div>
            <Checkbox
              checked={onBlacklist}
              onChange={() =>
                onChange({ onBlacklist: true, onWhitelist: false })
              }
            />
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default UserListDrawer;
