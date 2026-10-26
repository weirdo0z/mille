import { Plus } from "../icons";
import { toast } from "../lib/toast";
import type { Story as StoryData } from "../data";

export function Story({ name, image, active }: StoryData) {
  return (
    <div
      onClick={() => toast("ストーリーは準備中です")}
      class="flex min-w-[66px] cursor-pointer flex-col items-center gap-1.5"
    >
      <div
        class={`rounded-full p-[2px] ${
          active
            ? "bg-gradient-to-tr from-[#f4a261] via-[#ef7194] to-[#8d78dd]"
            : "bg-transparent"
        }`}
      >
        <div class="rounded-full bg-[#fffaf6] p-[2px]">
          {image ? (
            <img
              src={image}
              alt={`${name}のストーリー`}
              class="size-[54px] rounded-full object-cover"
            />
          ) : (
            <div class="flex size-[54px] items-center justify-center rounded-full border border-dashed border-[#c8bbd9] bg-[#f3eefb] text-[#8d78dd]">
              <Plus />
            </div>
          )}
        </div>
      </div>
      <span class="text-[11px] font-medium text-[#5f5871]">{name}</span>
    </div>
  );
}
