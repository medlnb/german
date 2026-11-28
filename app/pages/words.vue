<template>
  <div class="content">
    <h1 class="page-title">
      Wörter <span class="gender-tag">{{ genderLabel(category) }}</span>
    </h1>

    <div class="buttons top">
      <button
        class="btn small"
        @click="showTranslations = !showTranslations"
        v-if="!memorizeMode"
      >
        {{ showTranslations ? "Hide Translations" : "Show Translations" }}
      </button>
      <button
        class="btn small"
        @click="hideWord = !hideWord"
        v-if="!memorizeMode"
      >
        {{ hideWord ? "Show Word" : "Hide Word" }}
      </button>
      <button
        class="btn small"
        @click="nextPageSize"
        v-if="!memorizeMode"
      >
        Per page: {{ pageSize }}
      </button>
      <button class="btn small" @click="nextSort" v-if="!memorizeMode">
        Sort: {{ sortLabel }}
      </button>
      <button class="btn small" @click="toggleMode">
        Mode: {{ memorizeMode ? "Test" : "View" }}
      </button>
    </div>

    <div class="buttons top">
      <button
        v-for="g in genderOptions"
        :key="g"
        class="btn small"
        :class="{ active: category === g }"
        @click="setCategory(g)"
      >
        {{ genderLabel(g) }}
      </button>
    </div>

    <div class="buttons top" v-if="!memorizeMode && !loading && !error">
      <span class="selection-info">Selected: {{ selectedInViewCount }}</span>
      <button class="btn small" @click="selectAllInView">Select all</button>
      <button
        class="btn small"
        :disabled="selectedInViewCount === 0"
        @click="deselectAllInView"
      >
        Deselect all
      </button>
    </div>

    <p v-if="loading" class="hint">Loading words…</p>
    <p v-else-if="error" class="hint error">{{ error }}</p>

    <!-- VIEW MODE -->
    <template v-if="!memorizeMode">
      <p v-if="pagedWords.length === 0" class="hint">
        No words in this category.
      </p>
      <div v-else class="word-list">
        <div
          v-for="item in pagedWords"
          :key="item.key"
          class="word-row"
          :class="['gender-' + item.gender, { selected: isSelected(item.key) }]"
        >
          <button
            type="button"
            class="select-toggle"
            :class="{ active: isSelected(item.key) }"
            :aria-pressed="isSelected(item.key)"
            :aria-label="
              (isSelected(item.key) ? 'Deselect ' : 'Select ') +
              displaySingular(item.raw)
            "
            :title="
              isSelected(item.key)
                ? 'Remove from test selection'
                : 'Add to test selection'
            "
            @click="toggleSelected(item.key)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
            </svg>
          </button>
          <span class="gender-badge">{{ item.gender }}</span>
          <span class="word-text" :class="{ dots: hideWord }">
            <template v-if="!hideWord">
              {{ displaySingular(item.raw) }}
              <span class="plural-badge" v-if="hasPlural(item.raw)">{{
                pluralBadge(item.raw)
              }}</span>
            </template>
            <template v-else>••••</template>
          </span>
          <span
            class="translation"
            :class="{ dots: !showTranslations }"
            :dir="
              showTranslations && isArabic(item.translation) ? 'rtl' : 'ltr'
            "
          >
            {{ showTranslations ? item.translation : "••••" }}
          </span>
        </div>
      </div>

      <div class="pagination" v-if="totalPages > 1">
        <button class="btn small" :disabled="page === 1" @click="page--">
          ‹
        </button>
        <span class="page-indicator">{{ page }} / {{ totalPages }}</span>
        <button
          class="btn small"
          :disabled="page === totalPages"
          @click="page++"
        >
          ›
        </button>
      </div>
    </template>

    <!-- TEST MODE -->
    <template v-else>
      <p v-if="hasActiveSelection && testPool.length" class="hint test-scope">
        🎯 Testing selected words only ({{ testPool.length }})
      </p>

      <div v-if="testWords.length === 0" class="hint">
        {{
          hasActiveSelection
            ? "No selected words in this category. Switch to All or select words here."
            : "No words in this category."
        }}
      </div>

      <div v-else-if="testIndex >= testWords.length" class="test-done">
        <p class="hint">
          🎉 Done! {{ testedCount }} word{{ testedCount === 1 ? "" : "s" }}
          tested.
        </p>
        <p class="hint">
          Correct: {{ correctCount }} / {{ testedCount }}
        </p>
        <p class="hint" v-if="skippedCount">
          Skipped: {{ skippedCount }}
        </p>
        <button class="btn small" @click="restartTest">Restart</button>
      </div>

      <div v-else class="test-panel">
        <div class="test-counter">
          {{ remainingCount }} left · Shift+Enter to skip
        </div>

        <div
          class="test-translation"
          :dir="isArabic(currentTestWord.translation) ? 'rtl' : 'ltr'"
        >
          {{ currentTestWord.translation }}
        </div>

        <div class="test-input-row" v-if="!lastResult">
          <input
            ref="answerInput"
            v-model="testInput"
            class="answer-input"
            placeholder="der/die/das + word"
          />
          <button
            class="btn small"
            @click="submitTest"
            :disabled="!testInput.trim()"
          >
            Check
          </button>
        </div>

        <div class="test-feedback" v-else>
          <span :class="lastResult.correct ? 'correct' : 'wrong'">
            {{ lastResult.correct ? "Correct!" : "Wrong" }}
          </span>
          <span class="reveal-word">
            {{ currentTestWord.gender }}
            {{ displaySingular(currentTestWord.raw) }}
            <span class="plural-badge" v-if="hasPlural(currentTestWord.raw)">{{
              pluralBadge(currentTestWord.raw)
            }}</span>
          </span>
          <span class="your-answer" v-if="!lastResult.correct">
            You wrote: “{{ lastResult.answer }}”
          </span>
          <button class="btn small" @click="nextTestWord">Next ›</button>
        </div>
      </div>

      <div class="test-history" v-if="testResults.length">
        <div
          v-for="(r, i) in [...testResults].reverse()"
          :key="i"
          class="history-row"
          :class="r.skipped ? 'skipped-row' : r.correct ? 'correct-row' : 'wrong-row'"
        >
          <span class="gender-badge">{{ r.gender }}</span>
          <div class="history-body">
            <span class="word-text">{{ displaySingular(r.raw) }}</span>
            <span class="history-skip" v-if="r.skipped">Skipped</span>
            <span class="history-answer" v-else-if="!r.correct">
              You wrote: “{{ r.answer }}”
            </span>
          </div>
          <span class="history-mark">{{
            r.skipped ? "–" : r.correct ? "✓" : "✗"
          }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { usePageSize } from "~/composables/usePageSize";

const hideWord = ref(false);

type WordEntry = { word: string; translation: string; added?: string };
type WordData = Record<"das" | "die" | "der", WordEntry[]>;
type Gender = "das" | "die" | "der";

const rawData = ref<WordData | null>(null);
const loading = ref(true);
const error = ref("");

const category = ref<Gender | "all">("all");
const genderOptions: (Gender | "all")[] = ["all", "der", "die", "das"];

const showTranslations = ref(true);
const memorizeMode = ref(false);

// --- Words selected for test mode (remembered in the browser) ---
// Keys are stable ("gender:raw word"), not positions, so editing words.json
// can never make an old selection point at a different word.
const SELECTION_KEY = "german:selectedWords:words";
const selectedKeys = ref<Set<string>>(new Set());

// --- Added-time ordering ---
// `added` comes from words.json. For words added without that field, the app
// remembers when it first saw them so they still sort as newly added.
const FIRST_SEEN_KEY = "german:firstSeen:words";
const firstSeen = ref<Record<string, number>>({});

const sortModes = ["default", "newest", "oldest"] as const;
type SortMode = (typeof sortModes)[number];
const SORT_KEY = "german:sort:words";
const sortMode = ref<SortMode>("default");
const sortLabels: Record<SortMode, string> = {
  default: "Default",
  newest: "Newest added",
  oldest: "Oldest added",
};
const sortLabel = computed(() => sortLabels[sortMode.value]);

const page = ref(1);
const { pageSize, nextPageSize } = usePageSize(
  "german:pageSize:words",
  10,
  [10, 20, 50, 100],
);

watch(pageSize, () => {
  page.value = 1;
});

function loadStoredState() {
  try {
    const savedSelection = localStorage.getItem(SELECTION_KEY);
    if (savedSelection) {
      const parsed = JSON.parse(savedSelection);
      if (Array.isArray(parsed)) {
        selectedKeys.value = new Set(
          parsed.filter((key): key is string => typeof key === "string"),
        );
      }
    }
  } catch {
    // localStorage unavailable — start with no selection
  }

  try {
    const savedFirstSeen = localStorage.getItem(FIRST_SEEN_KEY);
    if (savedFirstSeen) {
      const parsed = JSON.parse(savedFirstSeen);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        firstSeen.value = parsed;
      }
    }
  } catch {
    // localStorage unavailable — fall back to treating undated words as newest
  }

  try {
    const savedSort = localStorage.getItem(SORT_KEY);
    if (savedSort && (sortModes as readonly string[]).includes(savedSort)) {
      sortMode.value = savedSort as SortMode;
    }
  } catch {
    // localStorage unavailable — keep the default order
  }
}

function persistSelection() {
  try {
    localStorage.setItem(
      SELECTION_KEY,
      JSON.stringify([...selectedKeys.value]),
    );
  } catch {
    // ignore write failures (private mode, blocked storage, …)
  }
}

function persistFirstSeen() {
  try {
    localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(firstSeen.value));
  } catch {
    // ignore write failures
  }
}

function persistSort() {
  try {
    localStorage.setItem(SORT_KEY, sortMode.value);
  } catch {
    // ignore write failures
  }
}

// Stamp entries that have no "added" date the first time the app sees them,
// so words appended to words.json later still count as the newest words.
function stampNewWords(data: WordData) {
  const now = Date.now();
  let changed = false;
  for (const g of ["der", "die", "das"] as Gender[]) {
    for (const entry of data[g] || []) {
      if (entry.added) continue;
      const key = `${g}:${entry.word}`;
      if (!(key in firstSeen.value)) {
        firstSeen.value[key] = now;
        changed = true;
      }
    }
  }
  if (changed) persistFirstSeen();
}

onMounted(async () => {
  loadStoredState();
  try {
    const res = await fetch("/data/words.json");
    if (!res.ok) throw new Error("Failed to load words");
    const data: WordData = await res.json();
    stampNewWords(data);
    rawData.value = data;
  } catch (e) {
    error.value = "Could not load words.json";
  } finally {
    loading.value = false;
  }
});

watch(selectedKeys, persistSelection);
watch(sortMode, persistSort);

function genderLabel(g: string) {
  if (g === "all") return "All";
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function setCategory(g: Gender | "all") {
  category.value = g;
  page.value = 1;
  restartTest();
}

function toggleMode() {
  memorizeMode.value = !memorizeMode.value;
  page.value = 1;
  restartTest();
}

// --- Flatten JSON into a list with gender + unique key ---
type FlatWord = {
  gender: Gender;
  raw: string;
  translation: string;
  key: string;
  added?: string;
  index: number;
};

const flatWords = computed<FlatWord[]>(() => {
  if (!rawData.value) return [];
  const cats: Gender[] =
    category.value === "all" ? ["der", "die", "das"] : [category.value];
  const list: FlatWord[] = [];
  for (const g of cats) {
    (rawData.value[g] || []).forEach((entry) => {
      list.push({
        gender: g,
        raw: entry.word,
        translation: entry.translation,
        added: entry.added,
        index: list.length,
        key: `${g}:${entry.word}`,
      });
    });
  }
  return list;
});

// --- Selection for test mode ---
const allWordKeys = computed(() => {
  const keys = new Set<string>();
  if (!rawData.value) return keys;
  for (const g of ["der", "die", "das"] as Gender[]) {
    for (const entry of rawData.value[g] || []) {
      keys.add(`${g}:${entry.word}`);
    }
  }
  return keys;
});

// True when at least one saved key still exists in words.json. Stale keys are
// kept in storage (a word that is removed and re-added stays selected) but do
// not count as a selection.
const hasActiveSelection = computed(() => {
  for (const key of selectedKeys.value) {
    if (allWordKeys.value.has(key)) return true;
  }
  return false;
});

const selectedInViewCount = computed(
  () =>
    flatWords.value.filter((word) => selectedKeys.value.has(word.key)).length,
);

function isSelected(key: string) {
  return selectedKeys.value.has(key);
}

function toggleSelected(key: string) {
  const next = new Set(selectedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedKeys.value = next;
}

function selectAllInView() {
  const next = new Set(selectedKeys.value);
  for (const word of flatWords.value) next.add(word.key);
  selectedKeys.value = next;
}

function deselectAllInView() {
  const next = new Set(selectedKeys.value);
  for (const word of flatWords.value) next.delete(word.key);
  selectedKeys.value = next;
}

// Test only the words selected in the current view. If nothing is selected,
// fall back to testing every word in the current category.
const testPool = computed<FlatWord[]>(() => {
  if (!hasActiveSelection.value) return flatWords.value;
  return flatWords.value.filter((word) => selectedKeys.value.has(word.key));
});

// --- Sort by time added ---
const addedTime = (word: FlatWord): number => {
  if (word.added) {
    const time = Date.parse(word.added);
    if (!Number.isNaN(time)) return time;
  }
  const seenAt = firstSeen.value[word.key];
  return typeof seenAt === "number" ? seenAt : Number.MAX_SAFE_INTEGER;
};

const sortedWords = computed<FlatWord[]>(() => {
  if (sortMode.value === "default") return flatWords.value;
  const newestFirst = sortMode.value === "newest";
  return [...flatWords.value].sort((a, b) => {
    const byDate = addedTime(a) - addedTime(b);
    if (byDate !== 0) return newestFirst ? -byDate : byDate;
    return a.index - b.index;
  });
});

function nextSort() {
  const index = sortModes.indexOf(sortMode.value);
  sortMode.value = sortModes[(index + 1) % sortModes.length];
  page.value = 1;
}

// --- View mode pagination ---
const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedWords.value.length / pageSize.value)),
);
const pagedWords = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return sortedWords.value.slice(start, start + pageSize.value);
});

// --- Plural parser ---
// Notation: "*" separates the stem from the plural suffix, "(:)" marks an
// umlaut before a suffix, and a trailing ":" marks an umlaut-only plural.
// An inline "(:)" can also sit inside the singular (gl(:)ück) — it is a
// marker, not part of the word, so strip it before comparing/displaying.
function stripMarkers(text: string) {
  return text.replace(/\(:\)/g, "").replace(/:/g, "");
}
function parseWord(raw: string) {
  if (!raw.includes("*")) {
    return {
      singular: stripMarkers(raw),
      plural: null as string | null,
      pluralMark: null as string | null,
    };
  }
  const [rawStem, rest] = raw.split("*");
  const stem = stripMarkers(rawStem);
  if (rest.startsWith("(:)")) {
    const suffix = rest.slice(3);
    return {
      singular: stem,
      plural: addUmlaut(stem) + suffix,
      pluralMark: `¨${suffix}`,
    };
  }
  return { singular: stem, plural: stem + rest, pluralMark: rest };
}
function addUmlaut(word: string) {
  const map: Record<string, string> = { a: "ä", o: "ö", u: "ü" };
  for (let i = word.length - 1; i >= 0; i--) {
    if (map[word[i]])
      return word.slice(0, i) + map[word[i]] + word.slice(i + 1);
  }
  return word;
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function displaySingular(raw: string) {
  return capitalize(parseWord(raw).singular);
}
function pluralBadge(raw: string) {
  const p = parseWord(raw);
  return p.pluralMark ? "+" + p.pluralMark : "";
}
function hasPlural(raw: string) {
  const [, rest = ""] = raw.split("*");
  return rest.length > 0;
}
function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}
function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[():]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/ß/g, "ss");
}

// Shuffle once per test run so the order is never the same twice.
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Test mode: one word at a time ---
const testWords = ref<FlatWord[]>([]);
const testIndex = ref(0);
const testInput = ref("");
const testResults = ref<
  {
    key: string;
    raw: string;
    gender: Gender;
    correct: boolean;
    answer: string;
    skipped?: boolean;
  }[]
>([]);
const lastResult = ref<{ correct: boolean; answer: string } | null>(null);

const currentTestWord = computed(() => testWords.value[testIndex.value]);
const remainingCount = computed(() => testWords.value.length - testIndex.value);
const correctCount = computed(
  () => testResults.value.filter((r) => r.correct).length,
);
const skippedCount = computed(
  () => testResults.value.filter((r) => r.skipped).length,
);
const testedCount = computed(
  () => testResults.value.length - skippedCount.value,
);

// --- Input focus + Enter key handling ---
const answerInput = ref<HTMLInputElement | null>(null);

function focusInput() {
  nextTick(() => answerInput.value?.focus());
}

// Enter: check the answer while typing, go to the next word once the
// result is showing. One keydown handler so the Enter that submits
// can't also trigger "next".
function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Enter" || e.repeat || e.isComposing) return;
  if (!memorizeMode.value || !currentTestWord.value) return;

  // Shift+Enter skips the current word; it is recorded as skipped.
  if (e.shiftKey) {
    e.preventDefault();
    if (lastResult.value) nextTestWord();
    else skipTestWord();
    return;
  }

  if (lastResult.value) {
    e.preventDefault();
    nextTestWord();
  } else if (e.target === answerInput.value) {
    submitTest();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

function submitTest() {
  if (!testInput.value.trim() || !currentTestWord.value) return;

  const typed = testInput.value.trim();
  // The answer must include the article: "der Hund", "die Katze", "das Haus".
  const parts = typed.split(/\s+/);
  const article = (parts[0] || "").toLowerCase();
  const answer = parts.slice(1).join(" ");

  const target = parseWord(currentTestWord.value.raw).singular;
  const isRight =
    article === currentTestWord.value.gender &&
    normalize(answer) === normalize(target);

  lastResult.value = { correct: isRight, answer: typed };
  testResults.value.push({
    key: currentTestWord.value.key,
    raw: currentTestWord.value.raw,
    gender: currentTestWord.value.gender,
    correct: isRight,
    answer: typed,
  });
}

function skipTestWord() {
  if (!currentTestWord.value) return;
  testResults.value.push({
    key: currentTestWord.value.key,
    raw: currentTestWord.value.raw,
    gender: currentTestWord.value.gender,
    correct: false,
    answer: "",
    skipped: true,
  });
  nextTestWord();
}

function nextTestWord() {
  testIndex.value++;
  testInput.value = "";
  lastResult.value = null;
  focusInput();
}

function restartTest() {
  testWords.value = shuffle(testPool.value);
  testIndex.value = 0;
  testInput.value = "";
  testResults.value = [];
  lastResult.value = null;
  focusInput();
}

watch(testPool, restartTest);
</script>

<style>
.content {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 0.75rem 0.9rem 1.5rem;
  box-sizing: border-box;
  overflow-y: auto;
}
.page-title {
  font-size: clamp(1.4rem, 5vw, 2rem);
  margin: 0.5rem 0 0.75rem;
  font-weight: 700;
  text-align: center;
}
.gender-tag {
  font-size: 0.55em;
  opacity: 0.6;
  font-weight: 500;
}
.buttons.top {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}
.btn.small {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #e6eef8;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  font-weight: 600;
}
.btn.active {
  background: rgba(79, 140, 255, 0.3);
  border-color: rgba(79, 140, 255, 0.6);
}
.btn.small:disabled {
  opacity: 0.4;
  cursor: default;
}
.selection-info {
  align-self: center;
  font-size: 0.8rem;
  color: rgba(230, 238, 248, 0.7);
}

/* Compact word rows */
.word-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.5rem;
}
.word-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}
.word-row.gender-der {
  --row-accent: #4f8cff;
  --row-accent-ink: #ffffff;
  border-left-color: var(--row-accent);
}
.word-row.gender-die {
  --row-accent: #ff6b9d;
  --row-accent-ink: #ffffff;
  border-left-color: var(--row-accent);
}
.word-row.gender-das {
  --row-accent: #f4c95d;
  --row-accent-ink: #221f14;
  border-left-color: var(--row-accent);
}
.word-row.selected {
  background: rgba(79, 140, 255, 0.14);
  background: color-mix(in srgb, var(--row-accent, #4f8cff) 14%, transparent);
}
.select-toggle {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.04);
  color: var(--row-accent-ink, #ffffff);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}
.select-toggle:hover {
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.08);
}
.select-toggle:active {
  transform: scale(0.88);
}
.select-toggle:focus-visible {
  outline: 2px solid rgba(79, 140, 255, 0.75);
  outline-offset: 2px;
}
.select-toggle svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transform: scale(0.4);
  transition:
    opacity 0.16s ease,
    transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.select-toggle.active {
  background: var(--row-accent, #4f8cff);
  border-color: var(--row-accent, #4f8cff);
}
.select-toggle.active:hover {
  filter: brightness(1.08);
}
.select-toggle.active svg {
  opacity: 1;
  transform: scale(1);
}

.gender-badge {
  flex: 0 0 auto;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.1rem 0.35rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(230, 238, 248, 0.75);
}
.word-text {
  color: rgba(230, 238, 248, 0.75);
  flex: 1 1 auto;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plural-badge {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(230, 238, 248, 0.5);
  margin-left: 0.25rem;
}
.translation {
  flex: 0 0 auto;
  max-width: 45%;
  font-size: 0.85rem;
  color: rgba(230, 238, 248, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}
.translation.dots {
  opacity: 0.35;
  letter-spacing: 0.15em;
}

.word-text.dots {
  opacity: 0.35;
  letter-spacing: 0.15em;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.page-indicator {
  font-size: 0.85rem;
  color: rgba(230, 238, 248, 0.7);
}

/* Test mode */
.test-scope {
  margin-bottom: 0.5rem;
}
.test-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 0.5rem;
}
.test-counter {
  font-size: 0.8rem;
  color: rgba(230, 238, 248, 0.6);
}
.test-translation {
  font-size: 1.6rem;
  font-weight: 700;
}
.test-input-row {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;
}
.answer-input {
  background: rgba(255, 255, 255, 0.06);
  color: #e6eef8;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  font-size: 1rem;
  width: 220px;
}
.test-feedback {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
}
.correct {
  color: #25a54c;
  font-weight: 700;
}
.wrong {
  color: #c73636;
  font-weight: 700;
}
.reveal-word {
  font-weight: 700;
}

.test-history {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 30vh;
  overflow-y: auto;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.03);
}
.history-row.correct-row {
  border-left: 3px solid #25a54c;
}
.history-row.wrong-row {
  border-left: 3px solid #c73636;
}
.history-mark {
  margin-left: auto;
  font-weight: 700;
}
.history-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.history-body .word-text {
  flex: 0 1 auto;
}
.history-answer,
.your-answer {
  font-size: 0.78rem;
  font-weight: 500;
  color: #ff8b8b;
}
.history-row.skipped-row {
  border-left: 3px solid #f4c95d;
}
.history-row.skipped-row .history-mark,
.history-skip {
  color: #f4c95d;
  font-weight: 500;
}
.history-skip {
  font-size: 0.78rem;
}
.test-done {
  text-align: center;
  margin-top: 1rem;
}
.hint {
  color: rgba(230, 238, 248, 0.7);
  font-size: 0.85rem;
  text-align: center;
}
.hint.error {
  color: #ff8b8b;
}
</style>
