export type Action =
  | { type: 'click'; scroll?: boolean }
  | { type: 'input'; value: string }
  | { type: 'wait'; ms: number }
  | { type: 'log'; message: string };

export type AttrMatchMode =
  | 'exists'
  | 'equals'
  | 'includes'
  | 'startsWith'
  | 'endsWith'
  | 'regex';

export interface AttrMatch {
  name: string;
  value?: string;
  mode?: AttrMatchMode;
  selector?: string;
  flags?: string;
}

export interface RoleMatch {
  role: string;
  name?: string;
  nameRegex?: { pattern: string; flags?: string };
  selector?: string;
}

export interface TextMatch {
  text: string;
  selector?: string;
}

export interface RegexTextMatch {
  pattern: string;
  flags?: string;
  selector?: string;
}

export type PathStep =
  | { css: string }
  | { cssAll: string }
  | { xpath: string }
  | { xpathAll: string }
  | { nth: number }
  | { within: true }
  | { closest: string }
  | { enabled: true }
  | ({ text: string } & Omit<TextMatch, 'text'>)
  | { regexText: RegexTextMatch }
  | { attr: AttrMatch }
  | { role: RoleMatch };

export interface StructuredSelector {
  path: PathStep[];
}

export type SelectorLike = string | StructuredSelector;

export interface StepConfig {
  wait?: SelectorLike;
  action?: Action;
  done?: SelectorLike;
  doneNotExists?: SelectorLike;

  timeoutMs?: number;
  doneTimeoutMs?: number;
  beforeMs?: number;
  gapMs?: number;
}

export interface FlowConfig {
  steps: StepConfig[];
  timeoutMs?: number;
  debug?: boolean;
}

export interface FlowContext {
  vars: Record<string, unknown>;
}

/** ---------------- Utilities ---------------- */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function getByAriaLabelledby(el: Element): string | null {
  const ids = el.getAttribute('aria-labelledby')?.trim();
  if (!ids) return null;
  const parts = ids.split(/\s+/).filter(Boolean);
  const texts: string[] = [];
  for (const id of parts) {
    const ref = el.ownerDocument?.getElementById(id);
    if (ref?.textContent) texts.push(ref.textContent.trim());
  }
  const joined = texts.join(' ').trim();
  return joined || null;
}

function getAccessibleNameLite(el: Element): string {
  const ariaLabel = el.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;
  const labelled = getByAriaLabelledby(el);
  if (labelled) return labelled;
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

type Scope = Document | Element;

function getOwnerDocument(scope: Scope): Document {
  return scope instanceof Document ? scope : scope.ownerDocument ?? document;
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

/** ---------------- "Paste-and-use" string selector ----------------
 * - "xpath:...." => XPath
 * - otherwise => CSS
 */

function isXPathString(s: string): boolean {
  return s.trim().toLowerCase().startsWith('xpath:');
}

function normalizeSelectorLike(sel: SelectorLike): StructuredSelector {
  if (typeof sel === 'string') {
    const s = sel.trim();
    if (isXPathString(s)) {
      return { path: [{ xpath: s.replace(/^xpath:/i, '').trim() }] };
    }
    return { path: [{ css: s }] };
  }
  return sel;
}

/** ---------------- Structured selector evaluation ---------------- */

function queryAllInScope(scope: Scope, selector: string): Element[] {
  return Array.from(scope.querySelectorAll(selector));
}

function queryOneInScope(scope: Scope, selector: string): Element | null {
  return scope.querySelector(selector);
}

function queryTextInScope(scope: Scope, match: TextMatch): Element | null {
  const candidates = match.selector
    ? queryAllInScope(scope, match.selector)
    : queryAllInScope(scope, '*');

  console.log('[iframe] [Flow] queryTextInScope match.text', match.text);
  console.log('[iframe] [Flow] queryTextInScope', candidates, match.text);

  for (const el of candidates) {
    const t = (el.textContent ?? '').trim();
    if (t.includes(match.text)) {
      return el;
    }
  }
  return null;
}

function queryRegexTextInScope(
  scope: Scope,
  match: RegexTextMatch
): Element | null {
  const re = new RegExp(match.pattern, match.flags);
  const candidates = match.selector
    ? queryAllInScope(scope, match.selector)
    : queryAllInScope(scope, '*');
  for (const el of candidates) {
    const t = (el.textContent ?? '').trim();
    if (re.test(t)) return el;
  }
  return null;
}

function matchAttr(el: Element, rule: AttrMatch): boolean {
  const mode: AttrMatchMode =
    rule.mode ?? (rule.value === undefined ? 'exists' : 'equals');
  const attr = el.getAttribute(rule.name);

  if (mode === 'exists') return attr !== null;

  const value = rule.value ?? '';
  if (attr === null) return false;

  switch (mode) {
    case 'equals':
      return attr === value;
    case 'includes':
      return attr.includes(value);
    case 'startsWith':
      return attr.startsWith(value);
    case 'endsWith':
      return attr.endsWith(value);
    case 'regex': {
      const re = new RegExp(value, rule.flags);
      return re.test(attr);
    }
    default:
      return false;
  }
}

function queryAttrInScope(scope: Scope, rule: AttrMatch): Element | null {
  const baseSelector = rule.selector ?? '*';
  const candidates = queryAllInScope(scope, baseSelector);
  for (const el of candidates) {
    if (matchAttr(el, rule)) return el;
  }
  return null;
}

function queryRoleInScope(scope: Scope, rule: RoleMatch): Element | null {
  const baseSelector = rule.selector ?? '*';
  const candidates = queryAllInScope(scope, baseSelector);

  for (const el of candidates) {
    const role = el.getAttribute('role')?.trim();
    if (role !== rule.role) continue;

    if (!rule.name && !rule.nameRegex) return el;

    const name = getAccessibleNameLite(el);
    if (rule.name) {
      if (name.includes(rule.name)) return el;
    } else if (rule.nameRegex) {
      const re = new RegExp(rule.nameRegex.pattern, rule.nameRegex.flags);
      if (re.test(name)) return el;
    }
  }
  return null;
}

/**
 * Evaluate structured selector. Returns null if not found OR not yet "enabled" when enabled step present.
 */
export function evaluateStructuredSelector(
  sel: StructuredSelector,
  startDoc: Document = document
): Element | null {
  let scope: Scope = startDoc;
  let lastEl: Element | null = null;
  let lastList: Element[] | null = null;

  for (const step of sel.path) {
    if ('css' in step) {
      lastEl = queryOneInScope(scope, step.css);
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('cssAll' in step) {
      lastList = queryAllInScope(scope, step.cssAll);
      lastEl = null;
      if (!lastList.length) return null;
      continue;
    }

    if ('xpath' in step) {
      lastEl = evalXPathFirst(scope, step.xpath);
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('xpathAll' in step) {
      lastList = evalXPathAll(scope, step.xpathAll);
      lastEl = null;
      if (!lastList.length) return null;
      continue;
    }

    if ('nth' in step) {
      if (!lastList) return null;
      const idx = step.nth;
      if (idx < 0 || idx >= lastList.length) return null;
      lastEl = lastList[idx] ?? null;
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('text' in step) {
      lastEl = queryTextInScope(scope, {
        text: step.text,
        selector: (step as any).selector,
      });
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('regexText' in step) {
      lastEl = queryRegexTextInScope(scope, step.regexText);
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('attr' in step) {
      lastEl = queryAttrInScope(scope, step.attr);
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('role' in step) {
      lastEl = queryRoleInScope(scope, step.role);
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('closest' in step) {
      if (!lastEl) return null;
      lastEl = lastEl.closest(step.closest);
      lastList = null;
      if (!lastEl) return null;
      continue;
    }

    if ('within' in step) {
      if (!lastEl) return null;
      console.log('[iframe] [Flow] within', lastEl);
      scope = lastEl; // scope becomes the container element
      lastEl = null;
      lastList = null;
      continue;
    }

    if ('enabled' in step) {
      if (!lastEl) return null;
      if (!isElementEnabled(lastEl)) return null; // keep waiting until enabled
      continue;
    }

    const _never: never = step as never;
    void _never;
    return null;
  }

  return lastEl;
}

function evaluateSelectorLike(
  sel: SelectorLike,
  startDoc: Document
): Element | null {
  const structured = normalizeSelectorLike(sel);
  return evaluateStructuredSelector(structured, startDoc);
}

/** ---------------- Wait helpers (document-only MutationObserver) ---------------- */

export function waitForExists(
  sel: SelectorLike,
  opts: { timeoutMs: number; startDoc?: Document }
): Promise<Element> {
  const startDoc = opts.startDoc ?? document;

  return new Promise((resolve, reject) => {
    const tryGet = () => evaluateSelectorLike(sel, startDoc);

    const exist = tryGet();
    if (exist) return resolve(exist);

    let finished = false;

    const root = startDoc.documentElement;
    if (!root) return reject(new Error('document.documentElement is null'));

    const mo = new MutationObserver(() => {
      if (finished) return;
      const el = tryGet();
      if (el) {
        finished = true;
        mo.disconnect();
        resolve(el);
      }
    });

    mo.observe(root, { childList: true, subtree: true });

    if (opts.timeoutMs > 0) {
      setTimeout(() => {
        if (finished) return;
        finished = true;
        mo.disconnect();
        reject(new Error(`Timeout waiting for: ${JSON.stringify(sel)}`));
      }, opts.timeoutMs);
    }
  });
}

export function waitForNotExists(
  sel: SelectorLike,
  opts: { timeoutMs: number; startDoc?: Document }
): Promise<void> {
  const startDoc = opts.startDoc ?? document;

  return new Promise((resolve, reject) => {
    const exists = () => !!evaluateSelectorLike(sel, startDoc);

    if (!exists()) return resolve();

    let finished = false;

    const root = startDoc.documentElement;
    if (!root) return reject(new Error('document.documentElement is null'));

    const mo = new MutationObserver(() => {
      if (finished) return;
      if (!exists()) {
        finished = true;
        mo.disconnect();
        resolve();
      }
    });

    mo.observe(root, { childList: true, subtree: true });

    if (opts.timeoutMs > 0) {
      setTimeout(() => {
        if (finished) return;
        finished = true;
        mo.disconnect();
        reject(new Error(`Timeout waiting NOT exists: ${JSON.stringify(sel)}`));
      }, opts.timeoutMs);
    }
  });
}

/** ---------------- Actions ---------------- */

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
      if (!el)
        throw new Error('[iframe] [Flow] Action "click" requires step.wait');
      if (!isElementEnabled(el)) {
        throw new Error('[iframe] [Flow] Target not clickable/enabled.');
      }
      console.log('[iframe] [Flow] click', el);
      (el as HTMLElement).dispatchEvent(new Event('click', { bubbles: true }));
      return;

    case 'input':
      if (!el)
        throw new Error('[iframe] [Flow] Action "input" requires step.wait');
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
      if (debug) console.log('[iframe] [Flow] log', action.message);
      return;
  }
}

/** ---------------- Flow Runner ---------------- */

export async function runFlow(
  config: FlowConfig
): Promise<{ ctx: FlowContext }> {
  const debug = !!config.debug;
  const defaultTimeoutMs = config.timeoutMs ?? 20000;

  const ctx: FlowContext = { vars: Object.create(null) };

  if (debug) console.log('[iframe] [Flow] start', config);

  for (let i = 0; i < config.steps.length; i++) {
    const step = config.steps[i];
    if (debug)
      console.log(
        `▶ [iframe] [Flow] Step ${i + 1}/${config.steps.length}`,
        step
      );

    if (step.beforeMs) await sleep(step.beforeMs);

    const timeoutMs = step.timeoutMs ?? defaultTimeoutMs;
    const doneTimeoutMs = step.doneTimeoutMs ?? timeoutMs;

    const el = step.wait ? await waitForExists(step.wait, { timeoutMs }) : null;

    if (step.action) await runAction(el, step.action, debug);

    if (step.done) {
      await waitForExists(step.done, { timeoutMs: doneTimeoutMs });
    }

    if (step.doneNotExists) {
      await waitForNotExists(step.doneNotExists, { timeoutMs: doneTimeoutMs });
    }

    if (step.gapMs) await sleep(step.gapMs);
  }

  if (debug) console.log('✅ [iframe] [Flow] finished', ctx);
  return { ctx };
}

/** ---------------- Example usage ----------------

import { runFlow } from "./flow-runner";

runFlow({
  debug: true,
  timeoutMs: 25000,
  steps: [
    // Direct paste CSS selector
    { wait: "#open-modal > button.primary", action: { type: "click" } },

    // Direct paste XPath (prefix with xpath:)
    { wait: "xpath://*[@id='submit']", action: { type: "click" } },

    // Structured selector with within + xpath + enabled
    {
      wait: {
        path: [
          { css: ".panel" },
          { within: true },
          { xpath: ".//button[@id='submit']" },
          { enabled: true }
        ]
      },
      action: { type: "click" }
    }
  ]
}).catch(console.error);

*/
