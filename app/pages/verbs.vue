<template>
  <div class="content">
    <h1 class="page-title">
      Verben <span class="gender-tag">{{ categoryLabel(category) }}</span>
    </h1>

    <div class="buttons top">
      <button
        v-for="c in categoryOptions"
        :key="c"
        class="btn small"
        :class="{ active: category === c }"
        @click="setCategory(c)"
      >
        {{ categoryLabel(c) }}
      </button>
    </div>

    <p
      class="category-desc"
      v-if="category !== 'all' && categoriesMeta[category]"
    >
      {{ categoriesMeta[category] }}
    </p>

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

    <p v-if="loading" class="hint">Loading verbs…</p>
    <p v-else-if="error" class="hint error">{{ error }}</p>

    <!-- VIEW MODE -->
    <template v-if="!memorizeMode">
      <p v-if="pagedVerbs.length === 0" class="hint">
        No verbs in this category.
      </p>

      <div v-else class="word-list">
        <div
          v-for="item in pagedVerbs"
          :key="item.infinitive"
          class="verb-block"
        >
          <div
            class="word-row clickable"
            @click="toggleExpand(item.infinitive)"
          >
            <span
              class="gender-badge"
              :class="'cat-' + endingLetter(item.infinitive)"
            >
              {{ endingLetter(item.infinitive) }}
            </span>
            <span class="word-text" :class="{ dots: hideWord }">
              {{ hideWord ? "••••" : capitalize(item.infinitive) }}
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
            <span
              class="expand-arrow"
              :class="{ open: expanded.has(item.infinitive) }"
              >▾</span
            >
          </div>

          <div class="conj-table" v-if="expanded.has(item.infinitive)">
            <div class="conj-col">
              <div
                class="conj-row"
                v-for="pronoun in leftPronouns"
                :key="pronoun"
              >
                <span class="conj-pronoun">{{ pronoun }}</span>
                <span class="conj-form">{{ item.conjugation[pronoun] }}</span>
              </div>
            </div>
            <div class="conj-col">
              <div
                class="conj-row"
                v-for="pronoun in rightPronouns"
                :key="pronoun"
              >
                <span class="conj-pronoun">{{ pronoun }}</span>
                <span class="conj-form">{{ item.conjugation[pronoun] }}</span>
              </div>
            </div>
          </div>
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
      <div v-if="testVerbs.length === 0" class="hint">
        No verbs in this category.
      </div>

      <div v-else-if="testIndex >= testVerbs.length" class="test-done">
        <p class="hint">
          🎉 Done! {{ testResults.length }} verb{{
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
          :dir="isArabic(currentTestVerb.translation) ? 'rtl' : 'ltr'"
        >
          {{ currentTestVerb.translation }}
        </div>
        <div class="test-cat-hint">
          ending: {{ endingLetter(currentTestVerb.infinitive) }}
        </div>

        <div class="test-input-row" v-if="!lastResult">
          <input
            v-model="testInput"
            class="answer-input"
            placeholder="Type the infinitive"
            @keyup.enter="submitTest"
            autofocus
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
          <span class="reveal-word">{{
            capitalize(currentTestVerb.infinitive)
          }}</span>
          <button class="btn small" @click="nextTestVerb">Next ›</button>
        </div>
      </div>

      <div class="test-history" v-if="testResults.length">
        <div
          v-for="(r, i) in [...testResults].reverse()"
          :key="i"
          class="history-row"
          :class="r.correct ? 'correct-row' : 'wrong-row'"
        >
          <span
            class="gender-badge"
            :class="'cat-' + endingLetter(r.infinitive)"
          >
            {{ endingLetter(r.infinitive) }}
          </span>
          <span class="word-text">{{ capitalize(r.infinitive) }}</span>
          <span class="history-mark">{{ r.correct ? "✓" : "✗" }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

type Conjugation = Record<string, string>;
type VerbEntry = {
  infinitive: string;
  category: string;
  translation: string;
  conjugation: Conjugation;
};
type VerbData = {
  categories: Record<string, string>;
  verbs: VerbEntry[];
};

const rawData = ref<VerbData | null>(null);
const loading = ref(true);
const error = ref("");

const category = ref<string>("all");
const showTranslations = ref(true);
const hideWord = ref(false);
const memorizeMode = ref(false);

const page = ref(1);
const pageSize = 8;
const expanded = ref<Set<string>>(new Set());

const leftPronouns = ["ich", "du", "er/sie/es"];
const rightPronouns = ["wir", "ihr", "sie/Sie"];

onMounted(async () => {
  try {
    const res = await fetch("/data/verbs.json");
    if (!res.ok) throw new Error("Failed to load verbs");
    rawData.value = await res.json();
  } catch (e) {
    error.value = "Could not load verbs.json";
  } finally {
    loading.value = false;
  }
});

const categoriesMeta = computed(() => rawData.value?.categories || {});
const categoryOptions = computed(() => [
  "all",
  ...Object.keys(categoriesMeta.value),
]);

function categoryLabel(c: string) {
  return c === "all" ? "All" : c;
}

function setCategory(c: string) {
  category.value = c;
  page.value = 1;
  restartTest();
}

function toggleMode() {
  memorizeMode.value = !memorizeMode.value;
  page.value = 1;
  restartTest();
}

function toggleExpand(infinitive: string) {
  const s = new Set(expanded.value);
  if (s.has(infinitive)) s.delete(infinitive);
  else s.add(infinitive);
  expanded.value = s;
}

const flatVerbs = computed(() => {
  if (!rawData.value) return [];
  const all = rawData.value.verbs;
  return category.value === "all"
    ? all
    : all.filter((v) => v.category === category.value);
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(flatVerbs.value.length / pageSize)),
);
const pagedVerbs = computed(() => {
  const start = (page.value - 1) * pageSize;
  return flatVerbs.value.slice(start, start + pageSize);
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

// strip the infinitive "-en"/"-n" ending, then take the last stem letter (m/n/t/d etc.)
function endingLetter(infinitive: string): string {
  const stem = infinitive.endsWith("en")
    ? infinitive.slice(0, -2)
    : infinitive.slice(0, -1);
  return stem.slice(-1).toLowerCase();
}

// --- Test mode ---
const testVerbs = computed(() => flatVerbs.value);
const testIndex = ref(0);
const testInput = ref("");
const testResults = ref<{ infinitive: string; correct: boolean }[]>([]);
const lastResult = ref<{ correct: boolean } | null>(null);

const currentTestVerb = computed(() => testVerbs.value[testIndex.value]);
const remainingCount = computed(() => testVerbs.value.length - testIndex.value);
const correctCount = computed(
  () => testResults.value.filter((r) => r.correct).length,
);

function submitTest() {
  if (!testInput.value.trim() || !currentTestVerb.value) return;
  const isRight =
    normalize(testInput.value) === normalize(currentTestVerb.value.infinitive);
  lastResult.value = { correct: isRight };
  testResults.value.push({
    infinitive: currentTestVerb.value.infinitive,
    correct: isRight,
  });
}

function nextTestVerb() {
  testIndex.value++;
  testInput.value = "";
  lastResult.value = null;
}

function restartTest() {
  testIndex.value = 0;
  testInput.value = "";
  testResults.value = [];
  lastResult.value = null;
}

watch(flatVerbs, restartTest);
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
.gender-tag {
  font-size: 0.55em;
  opacity: 0.6;
  font-weight: 500;
}
.category-desc {
  text-align: center;
  font-size: 0.8rem;
  color: rgba(230, 238, 248, 0.55);
  margin: -0.25rem 0 0.6rem;
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

.word-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.5rem;
}
.verb-block {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  overflow: hidden;
}
.word-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-left: 3px solid rgba(255, 255, 255, 0.2);
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  color: #e6eef8;
}
.word-row.clickable {
  cursor: pointer;
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
.gender-badge.cat-m {
  color: #4f8cff;
}
.gender-badge.cat-n {
  color: #ff6b9d;
}
.gender-badge.cat-t {
  color: #f4c95d;
}
.gender-badge.cat-d {
  color: #7ce0c3;
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
  max-width: 40%;
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
.expand-arrow {
  flex: 0 0 auto;
  font-size: 0.75rem;
  color: rgba(230, 238, 248, 0.5);
  transition: transform 0.15s;
}
.expand-arrow.open {
  transform: rotate(180deg);
}

.conj-table {
  display: flex;
  gap: 1rem;
  padding: 0.3rem 0.6rem 0.6rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.conj-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.conj-row {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.85rem;
  padding: 0.1rem 0;
}
.conj-pronoun {
  color: rgba(230, 238, 248, 0.55);
}
.conj-form {
  font-weight: 600;
  color: #e6eef8;
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
}
.test-translation {
  font-size: 1.6rem;
  font-weight: 700;
  color: #e6eef8;
}
.test-cat-hint {
  font-size: 0.75rem;
  color: rgba(230, 238, 248, 0.45);
  margin-bottom: 0.3rem;
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
