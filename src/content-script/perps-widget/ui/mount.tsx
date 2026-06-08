/** Mounts the React tree into the Shadow DOM. Returns an unmount fn the bootstrap registers as teardown. */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App } from './App';
import { installStyles } from './styles';

export function mountUI(root: ShadowRoot): () => void {
  installStyles(root);

  // React 18's createRoot needs an Element container; ShadowRoot itself doesn't qualify.
  const container = document.createElement('div');
  container.style.cssText = 'all: initial; pointer-events: none;';
  root.appendChild(container);

  const reactRoot: Root = createRoot(container);
  reactRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  return (): void => {
    try {
      reactRoot.unmount();
    } catch {
      /* ignore */
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };
}
