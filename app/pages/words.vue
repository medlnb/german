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
          :class="'gender-' + item.gender"
        >
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
      <div v-if="testWords.length === 0" class="hint">
        No words in this category.
      </div>

      <div v-else-if="testIndex >= testWords.length" class="test-done">
        <p class="hint">
          🎉 Done! {{ testResults.length }} word{{
            testResults.length === 1 ? "" : "s"
          }}
          tested.
        </p>
        <p class="hint">
          Correct: {{ correctCount }} / {{ testResults.length }}
        </p>
        <button class="btn small" @click="restartTest">Restart</button>
      </div>

      <div v-else class="test-panel">
        <div class="test-counter">{{ remainingCount }} left</div>

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
            placeholder="Type the German word"
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
            {{ displaySingular(currentTestWord.raw) }}
            <span class="plural-badge" v-if="hasPlural(currentTestWord.raw)">{{
              pluralBadge(currentTestWord.raw)
            }}</span>
          </span>
          <button class="btn small" @click="nextTestWord">Next ›</button>
        </div>
      </div>

      <div class="test-history" v-if="testResults.length">
        <div
          v-for="(r, i) in [...testResults].reverse()"
          :key="i"
          class="history-row"
          :class="r.correct ? 'correct-row' : 'wrong-row'"
        >
          <span class="gender-badge">{{ r.gender }}</span>
          <span class="word-text">{{ displaySingular(r.raw) }}</span>
          <span class="history-mark">{{ r.correct ? "✓" : "✗" }}</span>
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

const hideWord = ref(false);

type WordEntry = { word: string; translation: string };
type WordData = Record<"das" | "die" | "der", WordEntry[]>;
type Gender = "das" | "die" | "der";

const rawData = ref<WordData | null>(null);
const loading = ref(true);
const error = ref("");

const category = ref<Gender | "all">("all");
const genderOptions: (Gender | "all")[] = ["all", "der", "die", "das"];

const showTranslations = ref(true);
const memorizeMode = ref(false);

const page = ref(1);
const pageSize = 10;

onMounted(async () => {
  try {
    const res = await fetch("/data/words.json");
    if (!res.ok) throw new Error("Failed to load words");
    rawData.value = await res.json();
  } catch (e) {
    error.value = "Could not load words.json";
  } finally {
    loading.value = false;
  }
});

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
const flatWords = computed(() => {
  if (!rawData.value) return [];
  const cats: Gender[] =
    category.value === "all" ? ["der", "die", "das"] : [category.value];
  const list: {
    gender: Gender;
    raw: string;
    translation: string;
    key: string;
  }[] = [];
  for (const g of cats) {
    (rawData.value[g] || []).forEach((entry) => {
      list.push({
        gender: g,
        raw: entry.word,
        translation: entry.translation,
        key: `${g}:${entry.word}`,
      });
    });
  }
  return list;
});

// --- View mode pagination ---
const totalPages = computed(() =>
  Math.max(1, Math.ceil(flatWords.value.length / pageSize)),
);
const pagedWords = computed(() => {
  const start = (page.value - 1) * pageSize;
  return flatWords.value.slice(start, start + pageSize);
});

// --- Plural parser ---
function parseWord(raw: string) {
  if (!raw.includes("*")) {
    return {
      singular: raw,
      plural: null as string | null,
      pluralMark: null as string | null,
    };
  }
  const [stem, rest] = raw.split("*");
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
  return raw.includes("*");
}
function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}
function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

// --- Test mode: one word at a time ---
const testWords = computed(() => flatWords.value);
const testIndex = ref(0);
const testInput = ref("");
const testResults = ref<
  { key: string; raw: string; gender: Gender; correct: boolean }[]
>([]);
const lastResult = ref<{ correct: boolean } | null>(null);

const currentTestWord = computed(() => testWords.value[testIndex.value]);
const remainingCount = computed(() => testWords.value.length - testIndex.value);
const correctCount = computed(
  () => testResults.value.filter((r) => r.correct).length,
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

  let attempt = testInput.value.trim();
  const lower = attempt.toLowerCase();
  for (const a of ["der ", "die ", "das "]) {
    if (lower.startsWith(a)) {
      attempt = attempt.slice(a.length);
      break;
    }
  }

  const target = parseWord(currentTestWord.value.raw).singular;
  const isRight = normalize(attempt) === normalize(target);

  lastResult.value = { correct: isRight };
  testResults.value.push({
    key: currentTestWord.value.key,
    raw: currentTestWord.value.raw,
    gender: currentTestWord.value.gender,
    correct: isRight,
  });
}

function nextTestWord() {
  testIndex.value++;
  testInput.value = "";
  lastResult.value = null;
  focusInput();
}

function restartTest() {
  testIndex.value = 0;
  testInput.value = "";
  testResults.value = [];
  lastResult.value = null;
  focusInput();
}

watch(flatWords, restartTest);
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
  border-left-color: #4f8cff;
}
.word-row.gender-die {
  border-left-color: #ff6b9d;
}
.word-row.gender-das {
  border-left-color: #f4c95d;
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
