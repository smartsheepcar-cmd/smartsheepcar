// ------------------------------------------------------------------
// dom.ts - עוזר קטן ליצירת אלמנטים ללא ספריות חיצוניות (בטוח מ-XSS:
// טקסט מוזרק כ-textContent, לא כ-HTML).
// ------------------------------------------------------------------

type Child = Node | string | number | null | undefined | false | Child[];

interface Props {
  [key: string]: unknown;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function applyProps(node: Element, props: Props): void {
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class" || key === "className") {
      node.setAttribute("class", String(value));
    } else if (key === "style" && typeof value === "object") {
      Object.assign((node as HTMLElement).style, value as object);
    } else if (key === "dataset" && typeof value === "object") {
      Object.assign((node as HTMLElement).dataset, value as object);
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === "html") {
      // שימוש מבוקר בלבד (SVG paths שאנו מייצרים) - לא לקלט משתמש
      node.innerHTML = String(value);
    } else {
      node.setAttribute(key, String(value));
    }
  }
}

function appendChildren(node: Element, children: Child[]): void {
  for (const child of children.flat(Infinity as 1)) {
    if (child == null || child === false) continue;
    node.appendChild(
      child instanceof Node ? child : document.createTextNode(String(child))
    );
  }
}

export function el(tag: string, props: Props = {}, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node as HTMLElement;
}

export function svg(tag: string, props: Props = {}, ...children: Child[]): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  applyProps(node, props);
  appendChildren(node, children);
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(root: Element, ...children: Child[]): void {
  clear(root);
  appendChildren(root, children);
}
