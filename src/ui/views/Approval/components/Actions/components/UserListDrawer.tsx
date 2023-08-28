import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import styled, { createGlobalStyle } from 'styled-components';
import { Popup, Checkbox } from 'ui/component';
import { Chain } from 'background/service/openapi';

const Footer = styled.div`
  background: #f5f6fa;
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
    color: #13141a;
    position: relative;
    border: 1px solid transparent;
    .rabby-checkbox__wrapper {
      .rabby-checkbox {
        border: 1px solid #707280;
        background-color: #fff !important;
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
      background-color: #e5e9ef;
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
  address: string;
  chain: Chain;
  onWhitelist: boolean;
  onBlacklist: boolean;
  onChange({
    onWhitelist,
    onBlacklist,
  }: {
    onWhitelist: boolean;
    onBlacklist: boolean;
  }): void;
}

const UserListDrawer = ({
  address,
  chain,
  onWhitelist,
  onBlacklist,
  onChange,
}: Props) => {
  const { t } = useTranslation();
  return (
    <div>
      <GlobalStyle />
      <Footer>
        <div
          className="item"
          onClick={() => onChange({ onBlacklist: false, onWhitelist: false })}
        >
          <div>{t('page.signTx.noMark')}</div>
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
          <div className="text-green">{t('page.signTx.trusted')}</div>
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
          <div className="text-red">{t('page.signTx.blocked')}</div>
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
    </div>
  );
};

export default ({
  address,
  chain,
  onWhitelist,
  onBlacklist,
  onChange,
}: {
  address: string;
  chain: Chain;
  onWhitelist: boolean;
  onBlacklist: boolean;
  onChange({
    onWhitelist,
    onBlacklist,
  }: {
    onWhitelist: boolean;
    onBlacklist: boolean;
  }): void;
}) => {
  const { destroy } = Popup.info({
    content: (
      <UserListDrawer
        address={address}
        chain={chain}
        onWhitelist={onWhitelist}
        onBlacklist={onBlacklist}
        onChange={(res) => {
          onChange(res);
          destroy();
        }}
      />
    ),
    height: 240,
    closable: true,
    title: i18n.t('page.signTx.myMarkWithContract', {
      chainName: chain.name,
    }),
    className: 'user-list-drawer',
    onClose: () => destroy(),
    onCancel: () => destroy(),
  });
};
