interface MountedWidget {
  container: HTMLElement;
  instance: { unmount: () => void };
}

// Symbol.for also shares the guard between repeated loads of widget.js on the same page.
const registryKey = Symbol.for("EnergyToolAssistant.mountedInstance");
const registry: typeof globalThis & { [registryKey]?: MountedWidget } = globalThis;

export const getMountedWidget = () => registry[registryKey];

export const assertWidgetCanMount = () => {
  if (getMountedWidget() !== undefined) {
    throw new Error("Only one widget can be mounted on a page. Unmount the existing widget first.");
  }
};

export const registerWidget = (widget: MountedWidget) => {
  assertWidgetCanMount();
  registry[registryKey] = widget;
};

export const unregisterWidget = (widget: MountedWidget) => {
  if (getMountedWidget() === widget) {
    delete registry[registryKey];
  }
};
