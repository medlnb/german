<template>
  <div class="app" @click="handleContainerClick">
    <div class="content">
      <h1 class="number" v-if="currentCategory === 'numbers'">
        <span v-if="mode==='pick'">{{ germanNumbers[target] }}</span>
        <span v-else>{{ target }}</span>
      </h1>
      <h1 class="number" v-else-if="currentCategory === 'days'">
        {{ germanDays[target] }}
      </h1>
      <h1 class="number" v-else-if="currentCategory === 'months'">
        {{ germanMonths[target] }}
      </h1>

      <div class="buttons top">
        <button class="btn" @click="toggleCategory">
          {{ categoryDisplay }}
        </button>
        <button class="btn" @click="toggleLimit" v-if="currentCategory === 'numbers'">
          Limit: {{ limit }}
        </button>
        <button class="btn" @click="toggleMode" v-if="currentCategory === 'numbers'">
          Mode: {{ mode==='pick' ? 'Pick' : 'Type' }}
        </button>
      </div>

      <div v-if="mode==='pick' || currentCategory !== 'numbers'" class="choices">
        <button
          v-for="c in choices"
          :key="c"
          class="choice"
          :class="choiceClass(c)"
          @click="handleChoice(c, $event)"
        >
          {{ getChoiceDisplay(c) }}
        </button>
      </div>

      <div v-else class="type-mode">
        <input
          v-model="userAnswer"
          class="answer-input"
          @keyup.enter="handleEnter"
          placeholder="Type German word"
        />
        <button class="btn" @click="submitAnswer" :disabled="answered || userAnswer.trim()===''">Submit</button>
        <div class="feedback" v-if="answered">
          <span :class="typedClass">{{ typedFeedback }}</span>
        </div>
      </div>

      <p class="hint" v-if="currentCategory === 'numbers' && mode==='pick'">Pick the number matching the German word. After result, click anywhere to regenerate.</p>
      <p class="hint" v-else-if="currentCategory === 'numbers'">Type the German word for the shown number. After result, click anywhere to regenerate.</p>
      <p class="hint" v-else>Pick the {{ currentCategory === 'days' ? 'day' : 'month' }} matching the German word. After result, click anywhere to regenerate.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const germanNumbers: Record<number, string> = {
  0: "null",
  1: "eins",
  2: "zwei",
  3: "drei",
  4: "vier",
  5: "fünf",
  6: "sechs",
  7: "sieben",
  8: "acht",
  9: "neun",
  10: "zehn",
  11: "elf",
  12: "zwölf",
  13: "dreizehn",
  14: "vierzehn",
  15: "fünfzehn",
  16: "sechzehn",
  17: "siebzehn",
  18: "achtzehn",
  19: "neunzehn",
  20: "zwanzig",
  21: "einundzwanzig",
  22: "zweiundzwanzig",
  23: "dreiundzwanzig",
  24: "vierundzwanzig",
  25: "fünfundzwanzig",
  26: "sechsundzwanzig",
  27: "siebenundzwanzig",
  28: "achtundzwanzig",
  29: "neunundzwanzig",
  30: "dreißig",
  31: "einunddreißig",
  32: "zweiunddreißig",
  33: "dreiunddreißig",
  34: "vierunddreißig",
  35: "fünfunddreißig",
  36: "sechsunddreißig",
  37: "siebenunddreißig",
  38: "achtunddreißig",
  39: "neununddreißig",
  40: "vierzig",
  41: "einundvierzig",
  42: "zweiundvierzig",
  43: "dreiundvierzig",
  44: "vierundvierzig",
  45: "fünfundvierzig",
  46: "sechsundvierzig",
  47: "siebenundvierzig",
  48: "achtundvierzig",
  49: "neunundvierzig",
  50: "fünfzig",
  51: "einundfünfzig",
  52: "zweiundfünfzig",
  53: "dreiundfünfzig",
  54: "vierundfünfzig",
  55: "fünfundfünfzig",
  56: "sechsundfünfzig",
  57: "siebenundfünfzig",
  58: "achtundfünfzig",
  59: "neunundfünfzig",
  60: "sechzig",
  61: "einundsechzig",
  62: "zweiundsechzig",
  63: "dreiundsechzig",
  64: "vierundsechzig",
  65: "fünfundsechzig",
  66: "sechsundsechzig",
  67: "siebenundsechzig",
  68: "achtundsechzig",
  69: "neunundsechzig",
  70: "siebzig",
  71: "einundsiebzig",
  72: "zweiundsiebzig",
  73: "dreiundsiebzig",
  74: "vierundsiebzig",
  75: "fünfundsiebzig",
  76: "sechsundsiebzig",
  77: "siebenundsiebzig",
  78: "achtundsiebzig",
  79: "neunundsiebzig",
  80: "achtzig",
  81: "einundachtzig",
  82: "zweiundachtzig",
  83: "dreiundachtzig",
  84: "vierundachtzig",
  85: "fünfundachtzig",
  86: "sechsundachtzig",
  87: "siebenundachtzig",
  88: "achtundachtzig",
  89: "neunundachtzig",
  90: "neunzig",
  91: "einundneunzig",
  92: "zweiundneunzig",
  93: "dreiundneunzig",
  94: "vierundneunzig",
  95: "fünfundneunzig",
  96: "sechsundneunzig",
  97: "siebenundneunzig",
  98: "achtundneunzig",
  99: "neunundneunzig",
  100: "einhundert"
};

const germanDays: Record<number, string> = {
  0: "Montag",
  1: "Dienstag",
  2: "Mittwoch",
  3: "Donnerstag",
  4: "Freitag",
  5: "Samstag",
  6: "Sonntag"
};

const germanMonths: Record<number, string> = {
  0: "Januar",
  1: "Februar",
  2: "März",
  3: "April",
  4: "Mai",
  5: "Juni",
  6: "Juli",
  7: "August",
  8: "September",
  9: "Oktober",
  10: "November",
  11: "Dezember"
};

const arabicDays: Record<number, string> = {
  0: "الاثنين",
  1: "الثلاثاء",
  2: "الأربعاء",
  3: "الخميس",
  4: "الجمعة",
  5: "السبت",
  6: "الأحد"
};

const arabicMonths: Record<number, string> = {
  0: "جانفي",
  1: "فيفري",
  2: "مارس",
  3: "أفريل",
  4: "ماي",
  5: "جوان",
  6: "جويلية",
  7: "أوت",
  8: "سبتمبر",
  9: "أكتوبر",
  10: "نوفمبر",
  11: "ديسمبر"
};


// Reactive state
const limit = ref(12)
const mode = ref<'pick' | 'type'>('pick')
const currentCategory = ref<'numbers' | 'days' | 'months'>('numbers')
const target = ref(0)
const choices = ref<number[]>([])
const answered = ref(false)
const selected = ref<number | null>(null)
const userAnswer = ref('')
const typedFeedback = ref('')
const typedClass = ref('')

const categoryDisplay = computed(() => {
  switch (currentCategory.value) {
    case 'numbers': return 'Numbers'
    case 'days': return 'Days'
    case 'months': return 'Months'
    default: return 'Numbers'
  }
})

function getMaxForCategory() {
  switch (currentCategory.value) {
    case 'numbers': return limit.value
    case 'days': return 6
    case 'months': return 11
    default: return limit.value
  }
}

function random(max: number) {
  return Math.floor(Math.random() * (max + 1))
}

function generateRound() {
  const max = getMaxForCategory()
  target.value = random(max)
  
  const set = new Set<number>()
  set.add(target.value)
  
  // Generate choices - fewer choices for days/months
  const choiceCount = currentCategory.value === 'numbers' ? 8 : 4
  
  while (set.size < choiceCount) {
    set.add(random(max))
  }

  choices.value = Array.from(set).sort(() => Math.random() - 0.5)
  answered.value = false
  selected.value = null
  userAnswer.value = ''
  typedFeedback.value = ''
  typedClass.value = ''
}

function getChoiceDisplay(choice: number): string {
  if (currentCategory.value === 'numbers') {
    return choice.toString()
  } else if (currentCategory.value === 'days') {
    return arabicDays[choice] as any
  } else if (currentCategory.value === 'months') {
    return arabicMonths[choice] as any
  }
  return choice.toString()
}

const justAnswered = ref(false)

function handleChoice(val: number, evt: MouseEvent) {
  if (!answered.value) {
    selected.value = val
    answered.value = true
    justAnswered.value = true
    // prevent bubbling so container doesn't immediately regenerate
    evt.stopPropagation()
    setTimeout(() => { justAnswered.value = false }, 0)
  }
  // second click handled globally
}

function handleContainerClick() {
  if (answered.value && !justAnswered.value) {
    generateRound()
  }
}

function choiceClass(val: number) {
  if (!answered.value) return ''
  if (val === selected.value) {
    return val === target.value ? 'correct' : 'wrong'
  }
  return ''
}

function toggleLimit() {
  limit.value = limit.value === 12 ? 100 : 12
  generateRound()
}

function toggleMode() {
  mode.value = mode.value === 'pick' ? 'type' : 'pick'
  generateRound()
}

function toggleCategory() {
  const categories: ('numbers' | 'days' | 'months')[] = ['numbers', 'days', 'months']
  const currentIndex = categories.indexOf(currentCategory.value)
  const nextIndex = (currentIndex + 1) % categories.length
  currentCategory.value = categories[nextIndex] as any
  generateRound()
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function submitAnswer() {
  if (mode.value !== 'type' || answered.value || currentCategory.value !== 'numbers') return
  const correct = germanNumbers[target.value] as string
  const normCorrect = normalize(correct)
  const attempt = normalize(userAnswer.value)
  const isRight = attempt === normCorrect || attempt === correct.toLowerCase().trim()
  answered.value = true
  typedFeedback.value = isRight ? 'Correct!' : `Wrong (${correct})`
  typedClass.value = isRight ? 'correct' : 'wrong'
  justAnswered.value = true
  setTimeout(() => { justAnswered.value = false }, 0)
}

function handleEnter() {
  if (!answered.value && currentCategory.value === 'numbers' && mode.value === 'type') {
    submitAnswer()
  } else if (answered.value && !justAnswered.value) {
    generateRound()
  }
}

// init
generateRound()
</script>

<style>
body, html {
  margin: 0;
  padding: 0;
}
.app {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #05060a 0%, #0b1220 100%);
  color: #e6eef8;
  padding: 0 10px;
}
.content {
  text-align: center;
  width: 100%;
  padding: 0 1rem 2rem;
  box-sizing: border-box;
}
.buttons.top {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
  gap: 0.75rem;
  max-width: 600px;
  margin: 0 auto 1rem;
}
.choice {
  background: rgba(255,255,255,0.06);
  color: #e6eef8;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 0.75rem 0.5rem;
  min-height: 56px;
  border-radius: 10px;
  cursor: pointer;
  font-size: clamp(0.95rem, 2.6vw, 1.15rem);
  font-weight: 600;
  line-height: 1.1;
  transition: background .15s, transform .15s;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.choice:hover { background: rgba(255,255,255,0.12); }
.choice.correct { background: #1f7d3b; border-color: #25a54c; }
.choice.wrong { background: #952a2a; border-color: #c73636; }
.type-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.answer-input {
  background: rgba(255,255,255,0.06);
  color: #e6eef8;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 1.05rem;
  width: 260px;
}
.answer-input:focus { outline: 2px solid rgba(255,255,255,0.3); }
.feedback {
  font-size: 1.1rem;
  font-weight: 600;
}
.feedback .correct { color: #25a54c; }
.feedback .wrong { color: #c73636; }
.number {
  font-size: clamp(3.2rem, 12vw, 6rem);
  margin: 0 0 0.75rem 0;
  font-weight: 700;
  letter-spacing: 0.02em;
  word-break: break-word;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn {
  background: rgba(255,255,255,0.06);
  color: #e6eef8;
  border: 1px solid rgba(255,255,255,0.12);
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: clamp(0.9rem, 2.8vw, 1.05rem);
  font-weight: 600;
  line-height: 1.1;
  touch-action: manipulation;
}
.btn:hover { background: rgba(255,255,255,0.09); }
.hint {
  margin-top: 0.5rem;
  color: rgba(230,238,248,0.7);
  font-size: 0.9rem;
}

/* Mobile-first refinements */
@media (max-width: 600px) {
  .buttons.top { flex-wrap: wrap; gap: 0.5rem; }
  .choices { 
    grid-template-columns: repeat(2, 1fr); 
    gap: 0.6rem; 
    max-width: 300px;
  }
  .choice { 
    padding: 0.85rem 0.4rem; 
    min-height: 70px;
    font-size: 1rem;
  }
  .number { 
    font-size: clamp(2.6rem, 15vw, 3.8rem); 
    min-height: 100px;
  }
  .answer-input { width: 100%; font-size: 1rem; }
  .content { padding: 0.5rem 0.9rem 2rem; }
  .btn { flex: 1 1 auto; padding: 0.6rem 0.9rem; }
}

@media (hover: hover) {
  .choice:hover { background: rgba(255,255,255,0.15); }
  .btn:hover { background: rgba(255,255,255,0.12); }
}

/* Larger screens */
@media (min-width: 1000px) {
  .choices { max-width: 720px; }
}
</style>