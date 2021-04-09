import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import cx from 'clsx';

const Modal = ({ children, className, isOpen }) => {
  const modalDom = document.createElement('div');

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (isOpen) {
      document.body.appendChild(modalDom);
    } else {
      modalDom.remove();
    }
  })

  return createPortal(
    isOpen && <>
      <div className="fixed z-50 w-full h-full" onClick={close} />
      <div className={cx('fixed z-50', className)}>{children}</div>
    </>, modalDom
  );
}

export default Modal;
