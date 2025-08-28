import React from 'react';
import ReactDOM from 'react-dom';

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

  return new Promise<void>((resolve, reject) => {
    const handleCancel = () => {
      setTimeout(() => {
        ReactDOM.unmountComponentAtNode(div);
        div.parentElement?.removeChild(div);
      }, 1000);
      reject();
    };

    ReactDOM.render(
      // @ts-expect-error we know T would be valid
      <Component
        onFinished={resolve as () => void}
        onCancel={handleCancel}
        {...props}
      />,
      div
    );
  });
};

/**
 * 说明：
 * - 允许多个 resolve/reject 键；
 * - 仅在必要位置使用 any，避免 TS 推断“相互牵制”/never 塌陷；
 * - React 17：使用 ReactDOM.render / unmountComponentAtNode。
 */
export type WrapPromiseOptions<TProps> = {
  /** 触发 resolve 的回调 prop 名（可多个） */
  resolveProps: readonly (keyof TProps)[];
  /** 触发 reject 的回调 prop 名（可多个） */
  rejectProps: readonly (keyof TProps)[];
  /** 自定义挂载容器，默认 body */
  container?: HTMLElement;
  /** 预置的初始 props（会与 present 传入的额外 props 合并） */
  initialProps?: Partial<TProps>;
};

export function wrapPromise<TProps extends Record<string, any>>(
  Component: React.ComponentType<TProps>,
  options: WrapPromiseOptions<TProps>
) {
  const {
    resolveProps,
    rejectProps,
    container = document.body,
    initialProps,
  } = options;

  /**
   * present：渲染组件并返回 Promise。
   * - Promise<unknown>：由于允许多键/多参数，返回值在运行时做“0 参数→undefined；1 参数→该值；>=2 参数→元组”归一化。
   * - 你可以在调用处用泛型断言收窄（如 `const r = await present() as boolean | [string, Meta]`）
   */
  function present(extraProps?: Partial<TProps>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const div = document.createElement('div');
      container.appendChild(div);

      const cleanup = () => {
        ReactDOM.unmountComponentAtNode(div);
        container.removeChild(div);
      };

      const normalize = (args: IArguments | any[]): unknown => {
        const arr = Array.prototype.slice.call(args) as any[];
        if (arr.length === 0) return undefined;
        if (arr.length === 1) return arr[0];
        return arr as unknown[];
      };

      const doResolve = function (this: any, ...args: any[]) {
        cleanup();
        resolve(normalize(args));
      };

      const doReject = function (this: any, ...args: any[]) {
        cleanup();
        reject(normalize(args));
      };

      // 组合最终 props，并把所有 resolve/reject 键注入处理器
      const injected: TProps = {
        ...(initialProps as TProps),
        ...(extraProps as TProps),
      };

      for (const key of resolveProps) {
        // 强制写入：组件侧该键应是函数；这里用 any 避免 TS 报错
        (injected as any)[key as any] = (...args: any[]) => doResolve(...args);
      }
      for (const key of rejectProps) {
        (injected as any)[key as any] = (...args: any[]) => doReject(...args);
      }

      ReactDOM.render(<Component {...(injected as TProps)} />, div);
    });
  }

  return { present };
}
