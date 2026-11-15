import type { mount, unmount, WidgetInstance } from "../src/widget";

declare global {
  interface Window {
    EnergyToolAssistant: { mount: typeof mount; unmount: typeof unmount };
    testWidget: WidgetInstance;
  }
}
