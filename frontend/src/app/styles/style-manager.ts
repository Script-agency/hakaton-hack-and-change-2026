const bundledCss = "__HACK_CHANGE_WIDGET_CSS__";
const styles = new Map<string, string>();
const roots = new Map<ShadowRoot, Map<string, HTMLStyleElement>>();

const setStyle = (root: ShadowRoot, elements: Map<string, HTMLStyleElement>, id: string, css: string) => {
  let element = elements.get(id);

  if (element === undefined) {
    element = root.ownerDocument.createElement("style");
    elements.set(id, element);
    root.append(element);
  }

  element.textContent = css;
};

export const updateStyle = (id: string, css: string) => {
  styles.set(id, css);

  for (const [root, elements] of roots) {
    setStyle(root, elements, id, css);
  }
};

export const removeStyle = (id: string) => {
  styles.delete(id);

  for (const elements of roots.values()) {
    elements.get(id)?.remove();
    elements.delete(id);
  }
};

export const attachStyles = (root: ShadowRoot) => {
  const elements = new Map<string, HTMLStyleElement>();

  roots.set(root, elements);

  if (import.meta.env.DEV) {
    for (const [id, css] of styles) {
      setStyle(root, elements, id, css);
    }
  } else {
    setStyle(root, elements, "widget", bundledCss);
  }

  return () => {
    for (const element of elements.values()) {
      element.remove();
    }

    roots.delete(root);
  };
};
