import React from 'react';
import ReactDOM from 'react-dom';

export type WrappedComponentProps<T = {}> = {
  onFinished(...args: any[]): void;
  onCancel(): void;
  wallet: import('@/ui/utils').WalletControllerType;
} & T;

type FunctionalComponent<P = {}> = ((p: P) => JSX.Element | null) | React.FC<P>;

export const wrapModalPromise = <T extends WrappedComponentProps>(
  Component: FunctionalComponent<T>
) => (props: Partial<T>) => {
  const div = document.createElement('div');
  document.body.appendChild(div);

  return new Promise<void>((resolve, reject) => {
    const handleCancel = () => {
      setTimeout(() => {
        ReactDOM.unmountComponentAtNode(div);
        div.parentElement?.removeChild(div);
      }, 1000);
      reject();
    };

    ReactDOM.render(
      // @ts-expect-error
      <Component
        onFinished={resolve as () => void}
        onCancel={handleCancel}
        {...props}
      />,
      div
    );
  });
};
