import IconClose from './assets/close.svg';
interface Options {
  content: string;
  closeButton: HTMLElement | string;
  container: HTMLElement;
  timeout: number;
  onHide?: () => void;
  className?: string;
  closeable: boolean;
}
class Notice {
  options: Options;
  el: HTMLDivElement | null;
  events: Record<string, (...args) => void>;

  closeButton?: HTMLElement;

  timer?: number | null;

  constructor(options: Options) {
    this.options = options;
    this.el = document.createElement('div');
    this.el.className = `rabby-notice ${
      this.options.className ? this.options.className : ''
    }`;

    // initial events
    this.events = {};

    // inner element
    this.insert();

    // auto hide animation
    if (this.options.timeout) {
      this.startTimer();
    }

    // mouse events
    this.registerEvents();
  }

  insert() {
    if (!this.el) {
      return;
    }

    // main
    const elMain = document.createElement('div');
    elMain.className = 'rabby-notice-content';
    elMain.innerHTML = this.options.content;
    this.el?.appendChild(elMain);

    // close button
    if (this.options.closeable) {
      this.closeButton = document.createElement('img');
      this.closeButton.setAttribute('src', IconClose);
      this.closeButton.className = 'rabby-notice-close';
      this.el.appendChild(this.closeButton);
    }

    this.options.container.appendChild(this.el);
  }

  registerEvents() {
    if (this.options.timeout) {
      this.events.mouseover = () => this.stopTimer();
      this.events.mouseleave = () => this.startTimer();
      this.el?.addEventListener('mouseover', this.events.mouseover, false);
      this.el?.addEventListener('mouseleave', this.events.mouseleave, false);
    }

    this.events.hide = () => this.hide();

    this.closeButton?.addEventListener('click', this.events.hide, false);
  }

  startTimer(timeout = this.options.timeout) {
    this.timer = (setTimeout(() => {
      this.hide();
    }, timeout) as unknown) as number;
  }

  stopTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  hide() {
    if (!this.el) {
      return;
    }
    this.el.classList.add('.rabby-notice-is-hide');
    // setTimeout(() => {
    this.options.container.removeChild(this.el!);
    this.el = null;
    if (this.options.onHide) {
      this.options.onHide();
    }
    this.stopTimer();
    // }, 300);
  }
}
let container: HTMLDivElement | null = null;
let style: HTMLStyleElement | null = null;

const styles = `
    .rabby-notice-container {
      position: fixed;
      z-index: 99999;
      top: 60px;
      right: 42px;
    }
    .rabby-notice {
      min-width: 230px;
      height: 44px;
      background: #FFFFFF;
      border: 1px solid #8697FF;
      border: 1.5px solid #8697FF;
      box-sizing: border-box;
      box-shadow: 0px 24px 40px rgba(134, 151, 255, 0.12);
      border-radius: 6px;
      display: flex;
      align-items: center;

      font-family: 'Arial', sans-serif;
      font-style: normal;
      font-weight: 400;
      font-size: 14px;
      line-height: 16px;
      color: #13141A;

      padding: 12px;
      gap: 8px;

      opacity: 1;
    }
    .rabby-notice + .rabby-notice {
      margin-top: 30px;
    }
    .rabby-notice-content {
      display: flex;
      align-items: center;
    }
    .rabby-notice-is-hide {
      opacity: 0;
      transition: 0.3s;
    }

    .rabby-notice-icon {
      width: 20px;
    }
    .rabby-notice-close {
      flex-shrink: 0;
      margin-left: 16px;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .rabby-strong {
      font-weight: bold;
    }
    .rabby-notice-default-wallet {
      border-radius: 12px;
      height: 64px;
      padding-left: 16px;
      padding-right: 20px;

      font-size: 12px;
      line-height: 16px;

      color: #13141A;
    }
  `;

function notice(options: Partial<Options>) {
  const {
    content = '',
    // timeout = 3000,
    timeout = 0,
    closeButton = '×',
    className = '',
    closeable = false,
  } = options || {};

  if (!container) {
    container = document.createElement('div');
    container.classList.add('rabby-notice-container');
    style = document.createElement('style');
    style.innerHTML = styles;
    document.body.appendChild(style);
    document.body.appendChild(container);
  }

  return new Notice({
    content,
    timeout,
    closeButton,
    container,
    className,
    closeable,
    onHide: () => {
      if (container && !container?.hasChildNodes()) {
        document.body.removeChild(container);
        style && document.body.removeChild(style);
        style = null;
        container = null;
      }
    },
  });
}

export default notice;
