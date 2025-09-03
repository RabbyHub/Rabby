import React from 'react';
import { portalController } from './PortalController';

export type WrapPromiseOptions<TProps> = {
  resolveProps: readonly (keyof TProps)[];
  rejectProps: readonly (keyof TProps)[];
  container?: HTMLElement;
  initialProps?: Partial<TProps>;
};

export function wrapPromiseOnPortal<TProps extends Record<string, any>>(
  Component: React.ComponentType<TProps>,
  options: WrapPromiseOptions<TProps>
) {
  const { resolveProps, rejectProps, container, initialProps } = options;

  function present(extraProps?: Partial<TProps>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let id = -1;
      const close = () => {
        if (id !== -1) portalController.remove(id);
      };

      const normalize = (args: any[]): unknown =>
        args.length === 0 ? undefined : args.length === 1 ? args[0] : args;

      const injected: TProps = {
        ...(initialProps as TProps),
        ...(extraProps as TProps),
      };

      for (const key of resolveProps) {
        (injected as any)[key] = (...args: any[]) => {
          const resolveFn = extraProps?.[key] || initialProps?.[key];
          resolveFn?.(normalize(args));
          close();
          resolve(normalize(args));
        };
      }
      for (const key of rejectProps) {
        (injected as any)[key] = (...args: any[]) => {
          const rejectFn = extraProps?.[key] || initialProps?.[key];
          rejectFn?.(normalize(args));
          close();
          reject(normalize(args));
        };
      }

      const element = <Component {...(injected as TProps)} />;
      id = portalController.add(element, container);
    });
  }

  return { present };
}
