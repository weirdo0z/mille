import { useEffect, useRef, useState } from "preact/hooks";
import { setToastListener } from "../lib/toast";

interface Item {
  id: number;
  text: string;
}

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    setToastListener((text) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev.slice(-2), { id, text }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    });
    return () => setToastListener(null);
  }, []);

  if (items.length === 0) return null;

  return (
    <div class="pointer-events-none fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 px-6">
      {items.map((t) => (
        <div
          key={t.id}
          class="whitespace-nowrap rounded-full bg-[#342c45]/90 px-5 py-2.5 text-[12px] font-bold text-white shadow-xl backdrop-blur-sm"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
