/** ---------------- Utilities ---------------- */
/**
 * Flow Runner (TypeScript) — Core + Shadow DOM (open) + Step-level observe roots
 *
 * ✅ Supports:
 * - Serial steps: wait -> action -> done/doneNotExists
 * - Wait via MutationObserver
 * - Step-level MutationObserver roots: observe.root
 * - Deep observe: document + all reachable open shadowRoots under roots
 * - Selector DSL:
 *    - String CSS: "#app button"
 *    - String XPath: "xpath://nav//button"
 *    - Structured AST: { path: [...] }
 * - AST steps:
 *    css / cssAll / xpath / xpathAll / nth / within / shadow / closest / enabled / text / regexText / attr / role
 *
 * ❌ Not included (by design):
 * - iframe support (same-origin / cross-origin)
 * - debounce/throttle scheduling (kept minimal)
 *
 * Notes:
 * - Shadow DOM: only open shadow roots are reachable (element.shadowRoot).
 * - For waiting inside shadow DOM, we observe each discovered shadowRoot so dynamic rendering can be detected.
 */

type Action =
  | { type: 'click'; scroll?: boolean }
  | { type: 'input'; value: string }
  | { type: 'wait'; ms: number }
  | { type: 'log'; message: string };

type AttrMatchMode =
  | 'exists'
  | 'equals'
  | 'includes'
  | 'startsWith'
  | 'endsWith'
  | 'regex';

interface AttrMatch {
  name: string;
  value?: string;
  mode?: AttrMatchMode;
  selector?: string;
  flags?: string;
}

interface RoleMatch {
  role: string;
  name?: string;
  nameRegex?: { pattern: string; flags?: string };
  selector?: string;
}

interface RegexTextMatch {
  pattern: string;
  flags?: string;
  selector?: string;
}

type PathStep =
  | { css: string }
  | { cssAll: string }
  | { xpath: string }
  | { xpathAll: string }
  | { nth: number }
  | { within: true }
  | { shadow: true } // ⭐ enter open shadowRoot of last element
  | { closest: string }
  | { enabled: true }
  | { text: string; selector?: string }
  | { regexText: RegexTextMatch }
  | { attr: AttrMatch }
  | { role: RoleMatch };

interface StructuredSelector {
  path: PathStep[];
}

type SelectorLike = string | StructuredSelector;

type ObserveRoot =
  | 'document'
  | 'auto'
  | 'waitScope'
  | SelectorLike
  | SelectorLike[];

interface ObserveConfig {
  /**
   * - "document": document.documentElement
   * - "waitScope": use resolved element from step.wait as observer root
   * - "auto": minimal inference (within container -> first step element -> document)
   * - SelectorLike / SelectorLike[]: resolve to element(s)
   */
  root?: ObserveRoot;

  /** default: { childList:true, subtree:true } */
  options?: MutationObserverInit;
}

export interface StepConfig {
  wait?: SelectorLike;
  action?: Action;
  done?: SelectorLike;
  doneNotExists?: SelectorLike;

  observe?: ObserveConfig;

  timeoutMs?: number;
  doneTimeoutMs?: number;
  beforeMs?: number;
  gapMs?: number;
}

export interface FlowConfig {
  steps: StepConfig[];
  timeoutMs?: number;
  debug?: boolean;

  observeDefaults?: ObserveConfig;
}

interface FlowContext {
  vars: Record<string, unknown>;
}

/** ---------------- utils ---------------- */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isXPathString(s: string): boolean {
  return s.trim().toLowerCase().startsWith('xpath:');
}

function normalizeSelectorLike(sel: SelectorLike): StructuredSelector {
  if (typeof sel === 'string') {
    const s = sel.trim();
    if (isXPathString(s))
      return { path: [{ xpath: s.replace(/^xpath:/i, '').trim() }] };
    return { path: [{ css: s }] };
  }
  return sel;
}

function getAccessibleNameLite(el: Element): string {
  const ariaLabel = el.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const ids = el.getAttribute('aria-labelledby')?.trim();
  if (ids) {
    const parts = ids.split(/\s+/).filter(Boolean);
    const texts: string[] = [];
    for (const id of parts) {
      const ref = el.ownerDocument?.getElementById(id);
      if (ref?.textContent) texts.push(ref.textContent.trim());
    }
    const joined = texts.join(' ').trim();
    if (joined) return joined;
  }

  return (el.textContent ?? '').trim();
}

function isElementEnabled(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if ((el as HTMLButtonElement).disabled) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  return true;
}

/** ---------------- XPath helpers ---------------- */

type Scope = Document | Element | ShadowRoot;

function getOwnerDocument(scope: Scope): Document {
  if (scope instanceof Document) return scope;
  return (scope as Element | ShadowRoot).ownerDocument ?? document;
}

function evalXPathFirst(scope: Scope, expr: string): Element | null {
  const doc = getOwnerDocument(scope);
  const contextNode: Node =
    scope instanceof Document ? doc : ((scope as unknown) as Node);
  const result = doc.evaluate(
    expr,
    contextNode,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  const node = result.singleNodeValue;
  return node && node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
}

function evalXPathAll(scope: Scope, expr: string): Element[] {
  const doc = getOwnerDocument(scope);
  const contextNode: Node =
    scope instanceof Document ? doc : ((scope as unknown) as Node);
  const result = doc.evaluate(
    expr,
    contextNode,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const out: Element[] = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    const n = result.snapshotItem(i);
    if (n && n.nodeType === Node.ELEMENT_NODE) out.push(n as Element);
  }
  return out;
}

/** ---------------- selector evaluation ---------------- */

function queryAll(scope: Scope, css: string): Element[] {
  return Array.from(
    (scope as Document | Element | ShadowRoot).querySelectorAll(css)
  );
}

function queryOne(scope: Scope, css: string): Element | null {
  return (scope as Document | Element | ShadowRoot).querySelector(css);
}

function matchAttr(el: Element, rule: AttrMatch): boolean {
  const mode: AttrMatchMode =
    rule.mode ?? (rule.value === undefined ? 'exists' : 'equals');
  const attr = el.getAttribute(rule.name);

  if (mode === 'exists') return attr !== null;
  if (attr === null) return false;

  const v = rule.value ?? '';
  switch (mode) {
    case 'equals':
      return attr === v;
    case 'includes':
      return attr.includes(v);
    case 'startsWith':
      return attr.startsWith(v);
    case 'endsWith':
      return attr.endsWith(v);
    case 'regex':
      return new RegExp(v, rule.flags).test(attr);
    default:
      return false;
  }
}

function findByText(
  scope: Scope,
  text: string,
  selector?: string
): Element | null {
  const candidates = selector
    ? queryAll(scope, selector)
    : queryAll(scope, '*');
  for (const el of candidates) {
    if ((el.textContent ?? '').trim().includes(text)) return el;
  }
  return null;
}

function findByRegexText(scope: Scope, m: RegexTextMatch): Element | null {
  const re = new RegExp(m.pattern, m.flags);
  const candidates = m.selector
    ? queryAll(scope, m.selector)
    : queryAll(scope, '*');
  for (const el of candidates) {
    if (re.test((el.textContent ?? '').trim())) return el;
  }
  return null;
}

function findByAttr(scope: Scope, rule: AttrMatch): Element | null {
  const base = rule.selector ?? '*';
  for (const el of queryAll(scope, base)) {
    if (matchAttr(el, rule)) return el;
  }
  return null;
}

function findByRole(scope: Scope, rule: RoleMatch): Element | null {
  const base = rule.selector ?? '*';
  for (const el of queryAll(scope, base)) {
    const role = el.getAttribute('role')?.trim();
    if (role !== rule.role) continue;

    if (!rule.name && !rule.nameRegex) return el;

    const name = getAccessibleNameLite(el);
    if (rule.name && name.includes(rule.name)) return el;
    if (
      rule.nameRegex &&
      new RegExp(rule.nameRegex.pattern, rule.nameRegex.flags).test(name)
    )
      return el;
  }
  return null;
}

/**
 * Evaluate selector and expose:
 * - lastWithinContainer: element used by last `{ within:true }` (for auto root inference)
 */
function evaluateStructuredWithMeta(
  sel: StructuredSelector,
  startDoc: Document = document
): { element: Element | null; lastWithinContainer: Element | null } {
  let scope: Scope = startDoc;
  let lastEl: Element | null = null;
  let lastList: Element[] | null = null;
  let lastWithinContainer: Element | null = null;

  for (const step of sel.path) {
    if ('css' in step) {
      lastEl = queryOne(scope, step.css);
      lastList = null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('cssAll' in step) {
      lastList = queryAll(scope, step.cssAll);
      lastEl = null;
      if (!lastList.length) return { element: null, lastWithinContainer };
      continue;
    }

    if ('xpath' in step) {
      lastEl = evalXPathFirst(scope, step.xpath);
      lastList = null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('xpathAll' in step) {
      lastList = evalXPathAll(scope, step.xpathAll);
      lastEl = null;
      if (!lastList.length) return { element: null, lastWithinContainer };
      continue;
    }

    if ('nth' in step) {
      if (!lastList) return { element: null, lastWithinContainer };
      const el = lastList[step.nth];
      lastList = null;
      lastEl = el ?? null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('within' in step) {
      // Note: within requires a single element (lastEl). If you used cssAll/xpathAll, add nth first.
      if (!lastEl) return { element: null, lastWithinContainer };
      scope = lastEl;
      lastWithinContainer = lastEl;
      lastEl = null;
      lastList = null;
      continue;
    }

    if ('shadow' in step) {
      // Enter open shadow root of lastEl
      if (!lastEl) return { element: null, lastWithinContainer };
      const sr = lastEl.shadowRoot;
      if (!sr) return { element: null, lastWithinContainer }; // closed or not created
      scope = sr;
      lastEl = null;
      lastList = null;
      continue;
    }

    if ('text' in step) {
      lastEl = findByText(scope, step.text, step.selector);
      lastList = null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('regexText' in step) {
      lastEl = findByRegexText(scope, step.regexText);
      lastList = null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('attr' in step) {
      lastEl = findByAttr(scope, step.attr);
      lastList = null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('role' in step) {
      lastEl = findByRole(scope, step.role);
      lastList = null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('closest' in step) {
      if (!lastEl) return { element: null, lastWithinContainer };
      lastEl = lastEl.closest(step.closest);
      lastList = null;
      if (!lastEl) return { element: null, lastWithinContainer };
      continue;
    }

    if ('enabled' in step) {
      if (!lastEl) return { element: null, lastWithinContainer };
      if (!isElementEnabled(lastEl))
        return { element: null, lastWithinContainer };
      continue;
    }

    const _never: never = step as never;
    void _never;
    return { element: null, lastWithinContainer };
  }

  return { element: lastEl, lastWithinContainer };
}

function evaluateSelectorLike(
  sel: SelectorLike,
  startDoc: Document
): Element | null {
  return evaluateStructuredWithMeta(normalizeSelectorLike(sel), startDoc)
    .element;
}

/** ---------------- observe roots (core) ---------------- */

function docRoot(doc: Document): Element {
  const r = doc.documentElement;
  if (!r) throw new Error('document.documentElement is null');
  return r;
}

function resolveAutoRoot(
  sel: SelectorLike | undefined,
  startDoc: Document
): Element | null {
  if (!sel) return null;

  // If structured selector: prefer last within container
  if (typeof sel !== 'string') {
    const meta = evaluateStructuredWithMeta(sel, startDoc);
    if (meta.lastWithinContainer) return meta.lastWithinContainer;

    // fallback: first step if resolvable
    const first = sel.path[0];
    if ('css' in first) return startDoc.querySelector(first.css);
    if ('xpath' in first) return evalXPathFirst(startDoc, first.xpath);
    return null;
  }

  // If string CSS/XPath: can't infer container safely
  return null;
}

function mergeObserve(
  defaults: ObserveConfig | undefined,
  stepObs: ObserveConfig | undefined
): Required<ObserveConfig> {
  return {
    root: stepObs?.root ?? defaults?.root ?? 'auto',
    options: stepObs?.options ??
      defaults?.options ?? { childList: true, subtree: true },
  };
}

function resolveObserveRoots(
  observe: Required<ObserveConfig>,
  step: StepConfig,
  startDoc: Document,
  waitResolvedEl: Element | null
): Element[] {
  const root = observe.root;

  const resolveOne = (s: SelectorLike): Element | null => {
    const el = evaluateSelectorLike(s, startDoc);
    return el instanceof Element ? el : null;
  };

  if (root === 'document') return [docRoot(startDoc)];

  if (root === 'waitScope') {
    if (!waitResolvedEl)
      throw new Error(
        'observe.root="waitScope" requires step.wait to resolve an element'
      );
    return [waitResolvedEl];
  }

  if (root === 'auto') {
    const fromWait = resolveAutoRoot(step.wait, startDoc);
    if (fromWait) return [fromWait];

    const fromDone = resolveAutoRoot(step.done, startDoc);
    if (fromDone) return [fromDone];

    const fromDoneNot = resolveAutoRoot(step.doneNotExists, startDoc);
    if (fromDoneNot) return [fromDoneNot];

    return [docRoot(startDoc)];
  }

  if (Array.isArray(root)) {
    const roots = root.map(resolveOne).filter((x): x is Element => !!x);
    if (!roots.length)
      throw new Error('observe.root array resolved to no elements');
    return roots;
  }

  const one = resolveOne(root);
  if (!one)
    throw new Error(`observe.root did not resolve: ${JSON.stringify(root)}`);
  return [one];
}

/** ---------------- deep observe open shadow roots ---------------- */

/**
 * Collect all reachable open ShadowRoots under a node.
 * - If root is Document: traverses documentElement
 * - If root is Element: traverses subtree under that element
 */
function collectOpenShadowRoots(root: Document | Element): ShadowRoot[] {
  const doc = root instanceof Document ? root : root.ownerDocument ?? document;
  const startEl = root instanceof Document ? root.documentElement : root;
  if (!startEl) return [];

  const walker = doc.createTreeWalker(startEl, NodeFilter.SHOW_ELEMENT);
  const out: ShadowRoot[] = [];

  let node = walker.currentNode as Element | null;
  while (node) {
    const sr = node.shadowRoot;
    if (sr) out.push(sr);
    node = walker.nextNode() as Element | null;
  }

  return out;
}

/**
 * Observe:
 * - each root element
 * - every reachable open shadowRoot under those roots
 * This allows waits to react to DOM mutations inside shadow trees.
 */
function observeDeep(
  roots: Element[],
  options: MutationObserverInit,
  onChange: () => void
): MutationObserver[] {
  const observers: MutationObserver[] = [];

  const observeNode = (node: Node) => {
    const mo = new MutationObserver(onChange);
    mo.observe(node, options);
    observers.push(mo);
  };

  for (const r of roots) {
    observeNode(r);

    for (const sr of collectOpenShadowRoots(r)) {
      observeNode(sr);
    }
  }

  return observers;
}

/** ---------------- wait helpers (core) ---------------- */

async function waitForExists(
  sel: SelectorLike,
  step: StepConfig,
  observe: Required<ObserveConfig>,
  startDoc: Document,
  timeoutMs: number
): Promise<Element> {
  const tryGet = () => evaluateSelectorLike(sel, startDoc);
  const hit = tryGet();
  if (hit) return hit;

  // For waitScope, root depends on wait target
  const waitResolvedEl = step.wait
    ? evaluateSelectorLike(step.wait, startDoc)
    : null;
  const roots = resolveObserveRoots(observe, step, startDoc, waitResolvedEl);

  return new Promise<Element>((resolve, reject) => {
    let done = false;
    let observers: MutationObserver[] = [];

    const cleanup = () => {
      for (const o of observers) o.disconnect();
      observers = [];
    };

    const check = () => {
      if (done) return;
      const el = tryGet();
      if (el) {
        done = true;
        cleanup();
        resolve(el);
      }
    };

    observers = observeDeep(roots, observe.options, check);

    // race guard
    check();

    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(
        new Error(
          `Timeout(${timeoutMs}ms) waiting exists: ${JSON.stringify(sel)}`
        )
      );
    }, timeoutMs);

    // clear timer on resolve
    const origResolve = resolve;
    resolve = ((value: Element) => {
      window.clearTimeout(t);
      origResolve(value);
    }) as typeof resolve;
  });
}

async function waitForNotExists(
  sel: SelectorLike,
  step: StepConfig,
  observe: Required<ObserveConfig>,
  startDoc: Document,
  timeoutMs: number
): Promise<void> {
  const exists = () => !!evaluateSelectorLike(sel, startDoc);
  if (!exists()) return;

  const waitResolvedEl = step.wait
    ? evaluateSelectorLike(step.wait, startDoc)
    : null;
  const roots = resolveObserveRoots(observe, step, startDoc, waitResolvedEl);

  return new Promise<void>((resolve, reject) => {
    let done = false;
    let observers: MutationObserver[] = [];

    const cleanup = () => {
      for (const o of observers) o.disconnect();
      observers = [];
    };

    const check = () => {
      if (done) return;
      if (!exists()) {
        done = true;
        cleanup();
        resolve();
      }
    };

    observers = observeDeep(roots, observe.options, check);

    check();

    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(
        new Error(
          `Timeout(${timeoutMs}ms) waiting notExists: ${JSON.stringify(sel)}`
        )
      );
    }, timeoutMs);

    const origResolve = resolve;
    resolve = () => {
      window.clearTimeout(t);
      origResolve();
    };
  });
}

/** ---------------- actions ---------------- */

function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  const setter = desc?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function dispatchInputEvents(el: Element) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function runAction(el: Element | null, action: Action, debug: boolean) {
  switch (action.type) {
    case 'click':
      if (!el) throw new Error('Action "click" requires step.wait');
      if (!isElementEnabled(el))
        throw new Error('Target not clickable/enabled.');
      if (action.scroll !== false)
        (el as HTMLElement).scrollIntoView?.({
          block: 'center',
          inline: 'center',
        });
      (el as HTMLElement).click?.();
      return;

    case 'input':
      if (!el) throw new Error('Action "input" requires step.wait');
      (el as HTMLElement).focus?.();
      setNativeValue(
        el as HTMLInputElement | HTMLTextAreaElement,
        action.value
      );
      dispatchInputEvents(el);
      return;

    case 'wait':
      await sleep(action.ms);
      return;

    case 'log':
      if (debug) console.log('[Flow]', action.message);
      return;
  }
}

/** ---------------- runner ---------------- */

export async function runFlow(
  config: FlowConfig
): Promise<{ ctx: FlowContext }> {
  const debug = !!config.debug;
  const defaultTimeout = config.timeoutMs ?? 20000;

  const ctx: FlowContext = { vars: Object.create(null) };

  if (debug) console.log('🚀 [Flow] start', config);

  for (let i = 0; i < config.steps.length; i++) {
    const step = config.steps[i];
    if (debug)
      console.log(
        `▶ [Flow] Step ${i + 1}/${config.steps.length}`,
        Date.now(),
        step
      );

    if (step.beforeMs) await sleep(step.beforeMs);

    const observe = mergeObserve(config.observeDefaults, step.observe);
    const timeoutMs = step.timeoutMs ?? defaultTimeout;
    const doneTimeoutMs = step.doneTimeoutMs ?? timeoutMs;

    // 1) wait
    let el: Element | null = null;
    if (step.wait) {
      el = await waitForExists(step.wait, step, observe, document, timeoutMs);
    }

    // 2) action
    if (step.action) await runAction(el, step.action, debug);

    // 3) done conditions
    if (step.done) {
      await waitForExists(step.done, step, observe, document, doneTimeoutMs);
    }
    if (step.doneNotExists) {
      await waitForNotExists(
        step.doneNotExists,
        step,
        observe,
        document,
        doneTimeoutMs
      );
    }

    if (step.gapMs) await sleep(step.gapMs);
  }

  if (debug) console.log('✅ [Flow] finished', ctx);
  return { ctx };
}

/** ---------------- Example: your shadowRoot chain ----------------

import { runFlow } from "./flow-runner-shadow";

const target = {
  path: [
    { css: "body > w3m-modal" },
    { shadow: true },

    { css: "wui-flex > wui-card > w3m-router" },
    { shadow: true },

    { css: "w3m-router-container > w3m-connect-view" },
    { shadow: true },

    { css: "wui-flex > wui-flex > wui-flex > w3m-wallet-login-list" },
    { shadow: true },

    { css: "wui-flex > w3m-connector-list" },
    { shadow: true },

    { css: "wui-flex > w3m-list-wallet:nth-child(2)" },
    { shadow: true },

    { css: "wui-list-wallet" },
    { shadow: true },

    { css: "button > wui-flex" }
  ]
} as const;

runFlow({
  debug: true,
  observeDefaults: { root: "document" }, // optional; auto is also OK
  steps: [
    { wait: target, action: { type: "click" } }
  ]
}).catch(console.error);

*/
