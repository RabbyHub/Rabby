import React from 'react';
import { createRoot } from 'react-dom/client';

// eslint-disable-next-line @typescript-eslint/ban-types
export type WrappedComponentProps<T = {}> = {
  onFinished(...args: any[]): void;
  onCancel(): void;
  wallet: import('@/ui/utils').WalletControllerType;
} & T;

// eslint-disable-next-line @typescript-eslint/ban-types
type FunctionalComponent<P = {}> = ((p: P) => JSX.Element | null) | React.FC<P>;

export const wrapModalPromise = <T extends WrappedComponentProps>(
  Component: FunctionalComponent<T>
) => (props: Partial<T>) => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);

  return new Promise<void>((resolve, reject) => {
    const handleCancel = () => {
      setTimeout(() => {
        root.unmount();
        div.parentElement?.removeChild(div);
      }, 1000);
      reject();
    };

    root.render(
      // @ts-expect-error we know T would be valid
      <Component
        onFinished={resolve as () => void}
        onCancel={handleCancel}
        {...props}
      />
    );
  });
};
