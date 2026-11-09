import { ref, onMounted, watch } from "vue";

/**
 * Page-size control with a remembered choice.
 *
 * `storageKey` is per page so each list can remember its own preference.
 * The saved size is only applied if it is still one of the available options.
 */
export function usePageSize(
  storageKey: string,
  defaultSize: number,
  options: number[],
) {
  const pageSize = ref(defaultSize);

  onMounted(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (options.includes(saved)) pageSize.value = saved;
    } catch {
      // localStorage unavailable — keep the default
    }
  });

  function nextPageSize() {
    const index = options.indexOf(pageSize.value);
    pageSize.value = options[(index + 1) % options.length];
  }

  watch(pageSize, (value) => {
    try {
      localStorage.setItem(storageKey, String(value));
    } catch {
      // ignore write failures (private mode, blocked storage, …)
    }
  });

  return { pageSize, nextPageSize };
}
