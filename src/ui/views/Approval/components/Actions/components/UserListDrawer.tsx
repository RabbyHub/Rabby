import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Popup, Checkbox } from 'ui/component';
import { Chain } from 'background/service/openapi';
import * as Values from './Values';

const UserListDrawerWrapper = styled.div`
  .origin {
    display: flex;
    margin-bottom: 80px;
    font-weight: 500;
    font-size: 22px;
    line-height: 26px;
    color: #13141a;
    .logo {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
  }
`;

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
          background-color: #8697ff !important;
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
      background: rgba(134, 151, 255, 0.1);
      border: 1px solid #8697ff;
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
  return (
    <div>
      <GlobalStyle />
      {/* <UserListDrawerWrapper>
        <div className="origin">
          <span className="flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
            <Values.Address address={address} chain={chain} iconWidth="18px" />
          </span>
        </div>
      </UserListDrawerWrapper> */}
      <Footer>
        <div
          className="item"
          onClick={() => onChange({ onBlacklist: false, onWhitelist: false })}
        >
          <div>No mark</div>
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
          <div className="text-green">Trusted</div>
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
          <div className="text-red">Blocked</div>
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
    title: 'My mark',
    className: 'user-list-drawer',
    onClose: () => destroy(),
    onCancel: () => destroy(),
  });
};
