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
