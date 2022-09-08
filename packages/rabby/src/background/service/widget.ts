import { createPersistStore } from 'background/utils';
import { DEXPriceComparison } from '@rabby-wallet/widgets';

export interface WidgetItem {
  name: string;
  image: string;
  description: string;
  version: string;
  include: string[];
  disabled?: boolean;
}

interface WidgetServiceStore {
  enableWidgets: string[];
}

class WidgetService {
  widgets: WidgetItem[] = [
    {
      name: DEXPriceComparison.widgetName,
      image: DEXPriceComparison.image,
      description: DEXPriceComparison.description,
      version: DEXPriceComparison.version,
      include: DEXPriceComparison.include,
    },
  ];
  store: WidgetServiceStore = {
    enableWidgets: [],
  };

  init = async () => {
    const storage = await createPersistStore<WidgetServiceStore>({
      name: 'widgets',
      template: {
        enableWidgets: [],
      },
    });
    this.store = storage || this.store;
    if (!this.store.enableWidgets) {
      this.store.enableWidgets = [];
    }
  };

  getWidgets = () => {
    const widgets = this.widgets;
    return widgets.map((widget) => ({
      ...widget,
      disabled: !this.store.enableWidgets.includes(widget.name),
    }));
  };

  disableWidget = (name: string) => {
    if (this.store.enableWidgets.includes(name)) {
      this.store.enableWidgets = this.store.enableWidgets.filter((item) => {
        return item !== name;
      });
    }
  };

  enableWidget = (name: string) => {
    if (!this.store.enableWidgets.includes(name)) {
      this.store.enableWidgets = [...this.store.enableWidgets, name];
    }
  };

  isWidgetDisabled = (name: string) => {
    return !this.store.enableWidgets.includes(name);
  };
}

export default new WidgetService();
