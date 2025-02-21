import { Popup } from '@/ui/component';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled, { createGlobalStyle } from 'styled-components';
import IconArrowRight from 'ui/assets/dashboard/settings/icon-right-arrow.svg';

const GlobalStyle = createGlobalStyle`
  .safe-replace-popup {
    .ant-drawer-title {
      color: var(--r-neutral-title-1, #192945);
      font-size: 17px;
      line-height: 20px;
      font-weight: 500;
      text-align: left;
    }
    .ant-drawer-body {
      padding-top: 12px;
      padding-bottom: 22px
    }
  }
`;

const Wrapper = styled.div`
  .desc {
    color: var(--r-neutral-body, #3e495e);
    font-size: 14px;
    font-weight: 400;
    margin-bottom: 20px;
    line-height: 17px;
  }
  .option-list {
    &-item {
      display: flex;
      align-items: center;
      border-radius: 6px;
      background: var(--r-neutral-card-2, #f2f4f7);
      border: 1px solid transparent;
      padding: 15px;
      cursor: pointer;

      &:not(:last-child) {
        margin-bottom: 12px;
      }

      &:hover {
        border: 1px solid var(--r-blue-default, #7084ff);
        background: var(--r-blue-light-1, #eef1ff);
      }

      &-content {
        color: var(--r-neutral-title-1, #192945);
        font-size: 15px;
        font-weight: 500;
        line-height: 18px;
      }
      &-right {
        margin-left: auto;
      }
    }
  }
`;

interface ReplacePopupProps {
  visible?: boolean;
  onClose?: () => void;
  onSelect?: (value: string) => void;
}
export const ReplacePopup = ({
  visible,
  onClose,
  onSelect,
}: ReplacePopupProps) => {
  const { t } = useTranslation();
  const options = [
    {
      label: t('page.safeQueue.ReplacePopup.options.send'),
      value: 'send',
    },
    {
      label: t('page.safeQueue.ReplacePopup.options.reject'),
      value: 'reject',
    },
  ];
  return (
    <Popup
      title={t('page.safeQueue.ReplacePopup.title')}
      visible={visible}
      onCancel={onClose}
      closable
      className="safe-replace-popup"
      height={250}
    >
      <GlobalStyle />
      <Wrapper>
        <div className="desc">{t('page.safeQueue.ReplacePopup.desc')}</div>
        <div className="option-list">
          {options.map((item) => {
            return (
              <div
                key={item.value}
                className="option-list-item"
                onClick={() => {
                  onSelect?.(item.value);
                }}
              >
                <div className="option-list-item-content">{item.label}</div>
                <div className="option-list-item-right">
                  <img src={IconArrowRight} alt="" />
                </div>
              </div>
            );
          })}
        </div>
      </Wrapper>
    </Popup>
  );
};
