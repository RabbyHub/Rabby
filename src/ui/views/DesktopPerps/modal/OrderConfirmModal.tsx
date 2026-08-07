import { Button, Modal } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

/** Colour treatment for a value cell. */
export type OrderConfirmTone = 'default' | 'up' | 'down';

export interface OrderConfirmRow {
  /** Stable key — labels can repeat across a section (e.g. two `Trigger` rows). */
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: OrderConfirmTone;
  /** Renders label + value in medium weight (TWAP's `Total Size` row). */
  emphasize?: boolean;
}

export interface OrderConfirmSection {
  key: string;
  /** Heading above the rows (`TP/SL`, `Take Profit`, …). */
  heading?: string;
  rows: OrderConfirmRow[];
}

export interface OrderConfirmModalProps {
  visible: boolean;
  /** Primary title, e.g. `BTC-USDC` or a standalone `Order Preview`. */
  title: React.ReactNode;
  /** Direction label rendered after the title in green/red. */
  titleSuffix?: { text: string; tone: Exclude<OrderConfirmTone, 'default'> };
  sections?: OrderConfirmSection[];
  /** Custom body, used by Scale for its order table. Replaces `sections`. */
  children?: React.ReactNode;
  /** Omit entirely to hide the opt-out row (Scale's confirmation is mandatory). */
  dontShowAgain?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    text: string;
  };
  confirmText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  zIndex?: number;
}

/**
 * The opt-out checkbox, traced from the exported Figma asset (161436:99034):
 * an 11.2x11.2 square centred in a 14x14 box, noticeably smaller and squarer
 * than the shared `PerpsCheckbox`, which is why this dialog doesn't reuse it.
 * The unchecked stroke takes `--rb-neutral-secondary` via currentColor so light
 * mode follows the token.
 */
const OrderConfirmCheckbox: React.FC<{ checked: boolean }> = ({ checked }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={checked ? undefined : 'text-rb-neutral-secondary'}
  >
    <rect
      x="1.4"
      y="1.4"
      width="11.2"
      height="11.2"
      rx="0.9333"
      fill={checked ? 'var(--rb-blue-default, #7084ff)' : 'none'}
      stroke={checked ? 'var(--rb-blue-default, #7084ff)' : 'currentColor'}
      strokeWidth="0.875"
      strokeLinejoin="round"
    />
    {checked ? (
      <path
        d="M4.375 7.14 6.3 9.065 9.8 5.565"
        stroke="#fff"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : null}
  </svg>
);

const toneClass = (tone?: OrderConfirmTone) => {
  if (tone === 'up') return 'text-rb-green-default';
  if (tone === 'down') return 'text-rb-red-default';
  return 'text-rb-neutral-title-1';
};

export const OrderConfirmRowItem: React.FC<{ row: OrderConfirmRow }> = ({
  row,
}) => (
  <div className="flex items-center justify-between gap-[12px]">
    <span
      className={clsx(
        'text-[13px] leading-[16px] shrink-0',
        row.emphasize
          ? 'font-medium text-rb-neutral-foot'
          : 'text-rb-neutral-secondary'
      )}
    >
      {row.label}
    </span>
    <span
      className={clsx(
        'text-[13px] leading-[16px] text-right',
        row.emphasize && 'font-medium',
        toneClass(row.tone)
      )}
    >
      {row.value}
    </span>
  </div>
);

export const OrderConfirmModal: React.FC<OrderConfirmModalProps> = ({
  visible,
  title,
  titleSuffix,
  sections,
  children,
  dontShowAgain,
  confirmText,
  loading,
  onConfirm,
  onCancel,
  zIndex,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      width={400}
      centered
      destroyOnClose
      closable
      footer={null}
      zIndex={zIndex}
      bodyStyle={{ padding: 0, maxHeight: 'unset' }}
      maskStyle={{
        zIndex,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      className={clsx(
        'modal-support-darkmode',
        'desktop-perps-modal-surface',
        'desktop-perps-confirm-modal'
      )}
      closeIcon={
        <RcIconCloseCC className="w-[20px] h-[20px] text-rb-neutral-body" />
      }
    >
      <div className="flex flex-col bg-rb-neutral-bg-0">
        {/* 56px tall so the title baseline aligns with the 20px close icon. */}
        <div className="flex h-[56px] shrink-0 items-center gap-[7px] pl-[20px] pr-[56px]">
          <span className="text-[20px] leading-[24px] font-medium text-rb-neutral-title-1 truncate">
            {title}
          </span>
          {titleSuffix ? (
            <span
              className={clsx(
                'text-[20px] leading-[24px] font-medium shrink-0',
                titleSuffix.tone === 'up'
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              )}
            >
              {titleSuffix.text}
            </span>
          ) : null}
        </div>

        {children ?? (
          <div className="flex flex-col gap-[24px] px-[20px] pb-[24px]">
            {sections?.map((section, index) => (
              <React.Fragment key={section.key}>
                {index > 0 ? (
                  <div className="h-0 w-full border-t border-solid border-rb-neutral-line" />
                ) : null}
                <div className="flex flex-col gap-[12px]">
                  {section.heading ? (
                    <div className="text-[15px] leading-[18px] font-medium text-rb-neutral-title-1">
                      {section.heading}
                    </div>
                  ) : null}
                  {section.rows.map((row) => (
                    <OrderConfirmRowItem key={row.key} row={row} />
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-[16px] border-t-[0.5px] border-solid border-rb-neutral-line px-[20px] py-[16px]">
          {dontShowAgain ? (
            // Traced from Figma 161436:99033 (360x28):
            //   checkbox column  x=0  y=0  14x28, box inside it at y=2
            //   copy             x=22 y=0  338x28 -> 12px text, 14px line,
            //                                        two lines = 28
            // The box is top-aligned with a 2px offset, NOT centred on the
            // two-line block, and the line-height is exactly 14px — `normal`
            // resolves to ~14.3 here, which grows the block and drops the box.
            <div
              className="flex w-full items-start gap-[8px] cursor-pointer select-none"
              onClick={() => dontShowAgain.onChange(!dontShowAgain.checked)}
            >
              <span className="flex h-[14px] w-[14px] shrink-0 items-center">
                <OrderConfirmCheckbox checked={dontShowAgain.checked} />
              </span>
              <span className="flex-1 min-w-0 text-[12px] leading-[14px] text-rb-neutral-foot">
                {dontShowAgain.text}
              </span>
            </div>
          ) : null}
          <Button
            block
            size="large"
            type="primary"
            loading={loading}
            onClick={onConfirm}
            className="h-[48px] rounded-[6px] text-[15px] font-medium"
          >
            {confirmText || t('global.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default OrderConfirmModal;
