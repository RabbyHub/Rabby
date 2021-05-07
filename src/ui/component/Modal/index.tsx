import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import cx from 'clsx';

interface ModalProps {
  children: ReactNode;
  className?: string;
  isOpen?: boolean;
  onClose?(): void;
}

const Modal = ({ children, className, isOpen, onClose }: ModalProps) => {
  const modalDom = document.createElement('div');

  const handleClose = () => {
    onClose && onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.appendChild(modalDom);
    }

    return () => {
      modalDom.remove();
    };
  });

  return createPortal(
    isOpen && (
      <>
        <div
          className="fixed z-50 w-full h-full inset-0"
          onClick={handleClose}
        />
        <div
          className={cx(
            'fixed z-50 transform -translate-y-1/2 -translate-x-1/2 top-1/2 left-1/2',
            className
          )}
        >
          {children}
        </div>
      </>
    ),
    modalDom
  );
};

export default Modal;
