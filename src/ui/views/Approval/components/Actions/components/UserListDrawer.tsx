import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import styled, { createGlobalStyle } from 'styled-components';
import { Popup, Checkbox } from 'ui/component';
import { Chain } from 'background/service/openapi';

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  .item {
    display: flex;
    cursor: pointer;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: var(--r-neutral-title1, #192945);
    position: relative;
    border: 1px solid transparent;
    border-radius: 8px;
    background: var(--r-neutral-card1, #fff);
    .rabby-checkbox__wrapper {
      .rabby-checkbox {
      }
      &.checked {
        .rabby-checkbox {
        }
      }
    }
    &:hover {
      background: var(--r-blue-light-1, #eef1ff);
      border: 1px solid var(--r-blue-default, #7084ff);
    }
  }
`;

interface Props {
  address: string;
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
  onWhitelist,
  onBlacklist,
  onChange,
}: Props) => {
  const { t } = useTranslation();
  return (
    <div>
      <Footer>
        <div
          className="item"
          onClick={() => onChange({ onBlacklist: false, onWhitelist: false })}
        >
          <div>{t('page.signTx.noMark')}</div>
          <div>
            <Checkbox
              width="20px"
              height="20px"
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
              width="20px"
              height="20px"
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
              width="20px"
              height="20px"
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
  chain?: Chain;
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
    bodyStyle: {
      padding: '16px 20px 0',
    },
    isNew: true,
    content: (
      <UserListDrawer
        address={address}
        onWhitelist={onWhitelist}
        onBlacklist={onBlacklist}
        onChange={(res) => {
          onChange(res);
          destroy();
        }}
      />
    ),
    height: 260,
    closable: true,
    title: i18n.t('page.signTx.myMarkWithContract', {
      chainName: chain?.name,
    }),
    className: 'user-list-drawer',
    onClose: () => destroy(),
    onCancel: () => destroy(),
  });
};
