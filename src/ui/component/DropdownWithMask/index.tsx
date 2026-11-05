import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dropdown } from 'antd';
import type { DropdownProps } from 'antd';

export interface DropdownWithMaskProps
  extends Omit<
    DropdownProps,
    | 'open'
    | 'onOpenChange'
    | 'visible'
    | 'onVisibleChange'
    | 'getPopupContainer'
  > {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zIndex?: number;
}

/** Adds a viewport mask beneath a controlled Dropdown, including inside modals. */
const DropdownWithMask = ({
  open,
  onOpenChange,
  zIndex = 1050,
  overlayStyle,
  ...props
}: DropdownWithMaskProps) => {
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
      trigger?.focus();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, onOpenChange]);

  return (
    <>
      {open &&
        createPortal(
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-[rgba(0,0,0,0.2)]"
            style={{ zIndex: zIndex - 1 }}
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenChange(false);
            }}
          />,
          document.body
        )}
      <Dropdown
        {...props}
        transitionName=""
        open={open}
        onOpenChange={onOpenChange}
        getPopupContainer={() => document.body}
        overlayStyle={{ ...overlayStyle, zIndex }}
      />
    </>
  );
};

export default DropdownWithMask;
