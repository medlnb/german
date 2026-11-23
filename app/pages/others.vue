<template>
  <div class="content">
    <h1 class="page-title">Andere Wörter</h1>

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
      <button class="btn small" @click="toggleMode">
        Mode: {{ memorizeMode ? "Test" : "View" }}
      </button>
    </div>

    <p v-if="loading" class="hint">Loading words…</p>
    <p v-else-if="error" class="hint error">{{ error }}</p>

    <!-- VIEW MODE -->
    <template v-if="!memorizeMode">
      <p v-if="pagedWords.length === 0" class="hint">No words.</p>

      <div v-else class="word-list">
        <div v-for="item in pagedWords" :key="item.word" class="word-row">
          <span class="word-text" :class="{ dots: hideWord }">
            {{ hideWord ? "••••" : item.word }}
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
      <div v-if="testWords.length === 0" class="hint">No words.</div>

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
          <span class="reveal-word">{{ currentTestWord.word }}</span>
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
          <div class="history-body">
            <span class="word-text">{{ r.word }}</span>
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

type OtherEntry = {
  word: string;
  translation: string;
};
type OtherData = {
  words: OtherEntry[];
};

const rawData = ref<OtherData | null>(null);
const loading = ref(true);
const error = ref("");

const showTranslations = ref(true);
const hideWord = ref(false);
const memorizeMode = ref(false);

const page = ref(1);
const { pageSize, nextPageSize } = usePageSize(
  "german:pageSize:others",
  12,
  [12, 24, 50, 100],
);

watch(pageSize, () => {
  page.value = 1;
});

onMounted(async () => {
  try {
    const res = await fetch("/data/others.json");
    if (!res.ok) throw new Error("Failed to load words");
    rawData.value = await res.json();
  } catch (e) {
    error.value = "Could not load others.json";
  } finally {
    loading.value = false;
  }
});

function toggleMode() {
  memorizeMode.value = !memorizeMode.value;
  page.value = 1;
  restartTest();
}

// Drives BOTH view mode's list and test mode's quiz set
const allWords = computed<OtherEntry[]>(() => rawData.value?.words || []);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(allWords.value.length / pageSize.value)),
);
const pagedWords = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return allWords.value.slice(start, start + pageSize.value);
});

function isArabic(text: string) {
  return /[؀-ۿ]/.test(text);
}
function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
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

// --- Test mode: drawn from allWords, shuffled per run ---
const testWords = ref<OtherEntry[]>([]);
const testIndex = ref(0);
const testInput = ref("");
const testResults = ref<
  {
    word: string;
    translation: string;
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
  const target = currentTestWord.value;
  const attempt = normalize(typed);

  // Accept any word that carries exactly the same translation, so words
  // with a shared meaning (e.g. two words for "already") both count.
  const accepted = new Set<string>([normalize(target.word)]);
  for (const w of rawData.value?.words || []) {
    if (
      w.translation.trim().toLowerCase() ===
      target.translation.trim().toLowerCase()
    ) {
      accepted.add(normalize(w.word));
    }
  }

  const isRight = accepted.has(attempt);
  lastResult.value = { correct: isRight, answer: typed };
  testResults.value.push({
    word: target.word,
    translation: target.translation,
    correct: isRight,
    answer: typed,
  });
}

function skipTestWord() {
  if (!currentTestWord.value) return;
  testResults.value.push({
    word: currentTestWord.value.word,
    translation: currentTestWord.value.translation,
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
  testWords.value = shuffle(allWords.value);
  testIndex.value = 0;
  testInput.value = "";
  testResults.value = [];
  lastResult.value = null;
  focusInput();
}

// Whenever the word list changes (data load), reset the quiz
watch(allWords, restartTest);
</script>

<style>
.content {
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 0.75rem 0.9rem 1.5rem;
  box-sizing: border-box;
  overflow-y: auto;
  color: #e6eef8;
}
.page-title {
  font-size: clamp(1.4rem, 5vw, 2rem);
  margin: 0.5rem 0 0.5rem;
  font-weight: 700;
  text-align: center;
  color: #e6eef8;
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
  color: #e6eef8;
}

.word-text {
  flex: 1 1 auto;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #e6eef8;
}
.word-text.dots {
  opacity: 0.35;
  letter-spacing: 0.15em;
}
.translation {
  flex: 0 0 auto;
  max-width: 50%;
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

.test-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 0.5rem;
}
.test-counter {
  font-size: 0.8rem;
  color: rgba(230, 238, 248, 0.6);
  text-align: center;
}
.test-translation {
  font-size: 1.6rem;
  font-weight: 700;
  color: #e6eef8;
  text-align: center;
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
  color: #e6eef8;
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
  color: #e6eef8;
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
