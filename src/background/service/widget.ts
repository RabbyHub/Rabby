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
  widgets: WidgetItem[];
  disableWidgets: string[];
}

class WidgetService {
  store: WidgetServiceStore = {
    widgets: [
      {
        name: DEXPriceComparison.widgetName,
        image: DEXPriceComparison.image,
        description: DEXPriceComparison.description,
        version: DEXPriceComparison.version,
        include: DEXPriceComparison.include,
      },
    ],
    disableWidgets: [],
  };

  init = async () => {
    const storage = await createPersistStore<WidgetServiceStore>({
      name: 'widgets',
      template: {
        widgets: [
          {
            name: DEXPriceComparison.widgetName,
            image: DEXPriceComparison.image,
            description: DEXPriceComparison.description,
            version: DEXPriceComparison.version,
            include: DEXPriceComparison.include,
          },
        ],
        disableWidgets: [],
      },
    });
    this.store = storage || this.store;
  };

  getWidgets = () => {
    const widgets = this.store.widgets;
    return widgets.map((widget) => ({
      ...widget,
      disabled: this.store.disableWidgets.includes(widget.name),
    }));
  };

  disableWidget = (name: string) => {
    console.log(name, this.store.disableWidgets);
    if (!this.store.disableWidgets.includes(name)) {
      this.store.disableWidgets = [...this.store.disableWidgets, name];
    }
  };

  enableWidget = (name: string) => {
    if (this.store.disableWidgets.includes(name)) {
      this.store.disableWidgets = this.store.disableWidgets.filter(
        (item) => item !== name
      );
    }
  };

  isWidgetDisabled = (name: string) => {
    return this.store.disableWidgets.includes(name);
  };
}

export default new WidgetService();
