import React from 'react';
import { useTranslation } from 'react-i18next';
import { Popup, Checkbox } from 'ui/component';
import styled, { createGlobalStyle } from 'styled-components';

const UserListDrawerWrapper = styled.div`
  .origin {
    display: flex;
    margin-bottom: 80px;
    font-weight: 500;
    font-size: 22px;
    line-height: 26px;
    color: var(--r-neutral-title-1, #192945);
    .logo {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
  }
`;

const Footer = styled.div`
  background: var(--r-neutral-card-2, #f2f4f7);
  border-radius: 6px;
  .item {
    display: flex;
    cursor: pointer;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-title-1, #192945);
    position: relative;
    border: 1px solid transparent;
    .rabby-checkbox__wrapper {
      .rabby-checkbox {
        border: 1px solid var(--r-neutral-line);
        background-color: var(--r-neutral-foot) !important;
      }
      &.checked {
        .rabby-checkbox {
          background-color: var(--r-blue-default, #7084ff) !important;
          border: none;
        }
      }
    }
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 18px;
      width: 328px;
      height: 1px;
      background-color: var(--r-neutral-line, #e5e9ef);
    }
    &:hover {
      background: var(--r-blue-light-1, #eef1ff);
      border: 1px solid var(--r-blue-default, #7084ff);
      border-radius: 6px;
    }
    &:nth-last-child(1) {
      &::after {
        display: none;
      }
    }
  }
`;

const GlobalStyle = createGlobalStyle`
  .user-list-drawer {
    .ant-drawer-title {
      text-align: left;
      font-weight: 700;
      font-size: 15px;
      line-height: 18px;
      color: #13141A;
    }
  }
`;

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
      <UserListDrawerWrapper>
        <div className="origin">
          <img src={logo} className="logo" />
          <span className="flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
            {origin}
          </span>
        </div>
      </UserListDrawerWrapper>
      <Footer>
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
      </Footer>
    </Popup>
  );
};

export default UserListDrawer;
