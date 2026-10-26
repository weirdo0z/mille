// 轻量全局 toast:任何组件调 toast("...") 即弹出提示
type ToastListener = (text: string) => void;

let listener: ToastListener | null = null;

export function toast(text: string) {
  listener?.(text);
}

export function setToastListener(fn: ToastListener | null) {
  listener = fn;
}
