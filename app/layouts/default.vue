<template>
  <div class="layout">
    <nav class="navbar">
      <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' }">
        🧠 Quiz
      </NuxtLink>
      <NuxtLink
        to="/words"
        class="nav-link"
        :class="{ active: route.path === '/words' }"
      >
        📚 Wörter
      </NuxtLink>
      <NuxtLink
        to="/verbs"
        class="nav-link"
        :class="{ active: route.path === '/verbs' }"
      >
        🔤 Verben
      </NuxtLink>
    </nav>
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
</script>

<style>
html,
body,
#__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
}
.layout {
  height: 100svh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #05060a 0%, #0b1220 100%);
  color: #e6eef8;
  overflow: hidden;
}
.navbar {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: rgba(5, 6, 10, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.nav-link {
  color: #e6eef8;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 0.15s;
}
.nav-link.active {
  background: rgba(79, 140, 255, 0.25);
  border-color: rgba(79, 140, 255, 0.5);
}
main {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow-y: auto;
}
@media (hover: hover) {
  .nav-link:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}
</style>
