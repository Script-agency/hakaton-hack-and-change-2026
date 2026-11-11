import { mount } from "./widget";

const container = document.getElementById("root");

if (container === null) {
  throw new Error("Root element was not found");
}

const widget = mount({ container });

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(() => widget.unmount());
}
