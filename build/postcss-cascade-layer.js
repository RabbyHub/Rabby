/**
 * Moves every stylesheet except Tailwind's own into `@layer legacy`.
 *
 * Tailwind's utilities live in a later layer, so they now win over antd and
 * the project's Less/CSS without `important: true`. antd and project styles
 * share the one layer on purpose: inside it they keep cascading exactly as
 * before (specificity, then source order).
 *
 * Every wrapped file also repeats the full layer order, so the order holds
 * whichever <style> tag the browser sees first.
 */
// `properties` is the layer Tailwind v4 declares first for its @property fallbacks.
const LAYER_ORDER = 'properties, theme, base, legacy, components, utilities';
const TAILWIND_ENTRY = /[\\/]src[\\/]ui[\\/]style[\\/]tailwind\.css$/;

const staysAtTopLevel = (node) =>
  (node.type === 'atrule' &&
    (node.name === 'charset' ||
      node.name === 'import' ||
      (node.name === 'layer' && !node.nodes) ||
      // already wrapped (the plugin may run twice on one file)
      (node.name === 'layer' && node.params === 'legacy'))) ||
  // ICSS blocks must stay top-level for css-loader
  (node.type === 'rule' && /^:(export|import)\b/.test(node.selector));

const plugin = () => ({
  postcssPlugin: 'rabby-cascade-layer',
  OnceExit(root, { AtRule }) {
    const file = (root.source && root.source.input && root.source.input.file) || '';
    if (TAILWIND_ENTRY.test(file)) return;

    const moved = [];
    root.each((node) => {
      if (!staysAtTopLevel(node)) moved.push(node);
    });
    if (!moved.some((node) => node.type !== 'comment')) return;

    const layer = new AtRule({ name: 'layer', params: 'legacy' });
    moved.forEach((node) => layer.append(node));
    root.append(layer);

    if (root.nodes.some((n) => n.type === 'atrule' && n.name === 'layer' && n.params === LAYER_ORDER)) {
      return;
    }
    const order = new AtRule({ name: 'layer', params: LAYER_ORDER });
    const charset = root.nodes.find((n) => n.type === 'atrule' && n.name === 'charset');
    if (charset) charset.after(order);
    else root.prepend(order);
  },
});
plugin.postcss = true;
plugin.LAYER_ORDER = LAYER_ORDER;

module.exports = plugin;
