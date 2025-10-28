class PortalController {
  private items: Array<{
    id: number;
    container: HTMLElement;
    element: React.ReactNode;
  }> = [];
  private listeners = new Set<() => void>();
  private nextId = 1;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  snapshot = () => this.items;

  add(element: React.ReactNode, container?: HTMLElement) {
    const node = container ?? document.body;
    const id = this.nextId++;
    const item = {
      id,
      container: this.ensureChildContainer(node, id),
      element,
    };
    this.items = [...this.items, item];
    this.emit();
    return id;
  }

  remove(id: number) {
    const item = this.items.find((x) => x.id === id);
    if (item?.container && item.container.parentNode) {
      item.container.parentNode.removeChild(item.container);
    }
    this.items = this.items.filter((x) => x.id !== id);
    this.emit();
  }

  removeAll() {
    this.items?.forEach((item) => {
      if (item?.container && item.container.parentNode) {
        item.container.parentNode.removeChild(item.container);
      }
    });
    this.items = [];
    this.emit();
  }

  private ensureChildContainer(root: HTMLElement, id: number) {
    const el = document.createElement('div');
    el.setAttribute('rabby-data-portal-id', String(id));
    root.appendChild(el);
    return el;
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const portalController = new PortalController();
