import React from 'react';

/**
 * @description return one valid css selector from styled-components
 */
export const getStyledComponentId = (
  jsxComponent:
    | string
    | ((
        | React.Component<any, any>
        | React.FC<any>
        | ((...args: any[]) => JSX.Element)
      ) & {
        styledComponentId?: string;
      })
): `.${string}` | 'NO_SELECTOR' => {
  if (typeof jsxComponent === 'string') {
    return `.${jsxComponent}`;
  }

  if (jsxComponent?.styledComponentId) {
    return `.${jsxComponent.styledComponentId}`;
  }

  return 'NO_SELECTOR';
};

export const styid = getStyledComponentId;

export const fadeColor = ({
  hex = '#000',
  fade = 0,
}: {
  hex?: string | ((props: any) => string);
  fade?: number;
}) => {
  if (typeof hex === 'function') {
    return (props: any) => fadeColor({ hex: hex(props), fade });
  }
  let c: any = hex.replace('#', '').split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  c = `0x${c.join('')}`;
  return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${
    fade / 100
  })`;
};
