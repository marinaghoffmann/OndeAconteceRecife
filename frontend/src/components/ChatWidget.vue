<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

// ── estado do chat ────────────────────────────────────────────────────────────
const aberto     = ref(false)
const mensagens  = ref([
  { role: 'assistant', content: 'Oi! Sou o assistente cultural do Onde Acontece Recife 🎭\nMe pergunte sobre eventos, categorias, preços ou bairros!' }
])
const input      = ref('')
const carregando = ref(false)
const corpo      = ref(null)

// ── posição do FAB (arrastável) ───────────────────────────────────────────────
const fabPos     = ref({ x: window.innerWidth - 80, y: window.innerHeight - 80 })
const fabArast   = ref(false)
let   fabOffset  = { x: 0, y: 0 }
let   fabMoveu   = false   // distingue clique de arraste

function fabMouseDown(e) {
  if (aberto.value) return
  fabArast.value = true
  fabMoveu = false
  fabOffset = { x: e.clientX - fabPos.value.x, y: e.clientY - fabPos.value.y }
  e.preventDefault()
}
function fabTouchStart(e) {
  if (aberto.value) return
  fabArast.value = true
  fabMoveu = false
  const t = e.touches[0]
  fabOffset = { x: t.clientX - fabPos.value.x, y: t.clientY - fabPos.value.y }
}

// ── posição do painel (arrastável pelo header) ────────────────────────────────
const painelPos  = ref({ x: window.innerWidth - 360, y: window.innerHeight - 560 })
const painelArast = ref(false)
let   painelOffset = { x: 0, y: 0 }
const painel     = ref(null)

function painelHeaderMouseDown(e) {
  painelArast.value = true
  painelOffset = { x: e.clientX - painelPos.value.x, y: e.clientY - painelPos.value.y }
  e.preventDefault()
}
function painelHeaderTouchStart(e) {
  painelArast.value = true
  const t = e.touches[0]
  painelOffset = { x: t.clientX - painelPos.value.x, y: t.clientY - painelPos.value.y }
}

// ── listeners globais ─────────────────────────────────────────────────────────
function onMouseMove(e) {
  if (fabArast.value) {
    fabMoveu = true
    clampFab(e.clientX - fabOffset.x, e.clientY - fabOffset.y)
  }
  if (painelArast.value) {
    clampPainel(e.clientX - painelOffset.x, e.clientY - painelOffset.y)
  }
}
function onTouchMove(e) {
  const t = e.touches[0]
  if (fabArast.value) {
    fabMoveu = true
    clampFab(t.clientX - fabOffset.x, t.clientY - fabOffset.y)
    e.preventDefault()
  }
  if (painelArast.value) {
    clampPainel(t.clientX - painelOffset.x, t.clientY - painelOffset.y)
    e.preventDefault()
  }
}
function onMouseUp()  { fabArast.value = false; painelArast.value = false }
function onTouchEnd() { fabArast.value = false; painelArast.value = false }
function onResize() {
  clampFab(fabPos.value.x, fabPos.value.y)
  clampPainel(painelPos.value.x, painelPos.value.y)
}

function clampFab(x, y) {
  fabPos.value = {
    x: Math.max(0, Math.min(window.innerWidth  - 56, x)),
    y: Math.max(0, Math.min(window.innerHeight - 56, y)),
  }
}
function clampPainel(x, y) {
  const w = painel.value?.offsetWidth  || 340
  const h = painel.value?.offsetHeight || 520
  painelPos.value = {
    x: Math.max(0, Math.min(window.innerWidth  - w, x)),
    y: Math.max(0, Math.min(window.innerHeight - h, y)),
  }
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',   onMouseUp)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend',  onTouchEnd)
  window.addEventListener('resize',    onResize)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',   onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend',  onTouchEnd)
  window.removeEventListener('resize',    onResize)
})

// ── abrir / fechar ────────────────────────────────────────────────────────────
function abrirChat() {
  if (fabMoveu) return   // soltou após arraste, não abre
  // reposiciona painel perto do FAB
  const px = Math.max(0, Math.min(window.innerWidth  - 340, fabPos.value.x - 284))
  const py = Math.max(0, Math.min(window.innerHeight - 520, fabPos.value.y - 480))
  painelPos.value = { x: px, y: py }
  aberto.value = true
  nextTick(scrollFim)
}
function fecharChat() { aberto.value = false }

function scrollFim() {
  if (corpo.value) corpo.value.scrollTop = corpo.value.scrollHeight
}

// ── enviar mensagem ───────────────────────────────────────────────────────────
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:3001'

async function enviar() {
  const texto = input.value.trim()
  if (!texto || carregando.value) return
  mensagens.value.push({ role: 'user', content: texto })
  input.value = ''
  carregando.value = true
  await nextTick(scrollFim)
  try {
    const res  = await fetch(`${AGENT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: mensagens.value }),
    })
    const data = await res.json()
    mensagens.value.push({
      role: 'assistant',
      content: data.reply || 'Não consegui responder agora. Tente novamente.',
    })
  } catch {
    mensagens.value.push({
      role: 'assistant',
      content: 'Agente offline. Rode: cd agent && npm run dev',
    })
  } finally {
    carregando.value = false
    await nextTick(scrollFim)
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
}

// ── markdown simples ──────────────────────────────────────────────────────────
function renderMd(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="msg-link">$1</a>')
    .replace(/\n/g, '<br>')
}
</script>

<template>
  <!-- ── painel arrastável ───────────────────────────────────────────────────── -->
  <Transition name="chat">
    <div
      v-if="aberto"
      ref="painel"
      class="chat-panel"
      :style="{ left: painelPos.x + 'px', top: painelPos.y + 'px' }"
      role="dialog"
      aria-label="Assistente cultural"
    >
      <!-- header — alça de arraste -->
      <header
        class="chat-header"
        @mousedown="painelHeaderMouseDown"
        @touchstart.passive="painelHeaderTouchStart"
      >
        <div class="chat-header__info">
          <span class="chat-avatar" aria-hidden="true">🎭</span>
          <div>
            <p class="chat-header__nome">Assistente cultural</p>
            <p class="chat-header__sub">Onde Acontece Recife · Gemini</p>
          </div>
        </div>
        <button class="chat-fechar" @click="fecharChat" @mousedown.stop aria-label="Fechar chat">✕</button>
      </header>

      <!-- corpo -->
      <div class="chat-corpo" ref="corpo" aria-live="polite">
        <div
          v-for="(msg, i) in mensagens"
          :key="i"
          class="msg"
          :class="msg.role === 'user' ? 'msg--user' : 'msg--bot'"
        >
          <span v-if="msg.role === 'assistant'" class="msg-avatar" aria-hidden="true">🎭</span>
          <div class="msg-balao" v-html="renderMd(msg.content)" />
        </div>

        <div v-if="carregando" class="msg msg--bot">
          <span class="msg-avatar" aria-hidden="true">🎭</span>
          <div class="msg-balao msg-balao--typing">
            <span /><span /><span />
          </div>
        </div>
      </div>

      <!-- footer -->
      <footer class="chat-footer">
        <textarea
          v-model="input"
          class="chat-input"
          placeholder="Pergunte sobre eventos em Recife…"
          rows="1"
          @keydown="onKeydown"
          :disabled="carregando"
          aria-label="Digite sua mensagem"
        />
        <button
          class="chat-enviar"
          @click="enviar"
          :disabled="!input.trim() || carregando"
          aria-label="Enviar mensagem"
        >↑</button>
      </footer>
    </div>
  </Transition>

  <!-- ── FAB arrastável ─────────────────────────────────────────────────────── -->
  <button
    v-show="!aberto"
    class="chat-fab"
    :class="{ 'chat-fab--arrastando': fabArast }"
    :style="{ left: fabPos.x + 'px', top: fabPos.y + 'px' }"
    @mousedown="fabMouseDown"
    @touchstart.passive="fabTouchStart"
    @click="abrirChat"
    aria-label="Abrir assistente cultural"
  >
    <span aria-hidden="true">🎭</span>
    <span class="chat-fab__pulse" aria-hidden="true" />
  </button>
</template>

<style scoped>
/* ── FAB ─────────────────────────────────────────────────────────────────────── */
.chat-fab {
  position: fixed;
  z-index: 1000;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #0f766e, #5eead4);
  color: #042f2e;
  font-size: 1.45rem;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(15, 118, 110, 0.55);
  transition: box-shadow 0.2s, transform 0.15s;
  user-select: none;
  touch-action: none;
}
.chat-fab:hover {
  box-shadow: 0 6px 28px rgba(15, 118, 110, 0.75);
  transform: scale(1.06);
}
.chat-fab--arrastando {
  cursor: grabbing;
  transform: scale(1.1);
  box-shadow: 0 8px 32px rgba(15, 118, 110, 0.8);
}
.chat-fab__pulse {
  position: absolute;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(94, 234, 212, 0.35);
  animation: pulsar 2s ease-out infinite;
  pointer-events: none;
}
@keyframes pulsar {
  0%   { transform: scale(1);   opacity: 0.7; }
  100% { transform: scale(1.7); opacity: 0;   }
}

/* ── painel ──────────────────────────────────────────────────────────────────── */
.chat-panel {
  position: fixed;
  z-index: 999;
  width: 340px;
  height: 520px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(10, 18, 35, 0.97);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}
@media (max-width: 400px) {
  .chat-panel { width: calc(100vw - 2rem); }
}

/* ── header (alça de arraste) ────────────────────────────────────────────────── */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  background: rgba(15, 118, 110, 0.18);
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}
.chat-header:active { cursor: grabbing; }

.chat-header__info { display: flex; align-items: center; gap: 0.6rem; }
.chat-avatar { font-size: 1.5rem; line-height: 1; }
.chat-header__nome { margin: 0; font-size: 0.9rem; font-weight: 700; color: #e2e8f0; }
.chat-header__sub  { margin: 0; font-size: 0.72rem; color: #5eead4; }

.chat-fechar {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.3rem 0.4rem;
  border-radius: 6px;
  line-height: 1;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.chat-fechar:hover { color: #e2e8f0; background: rgba(148, 163, 184, 0.12); }

/* ── corpo ───────────────────────────────────────────────────────────────────── */
.chat-corpo {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  scroll-behavior: smooth;
  min-height: 0;
}
.chat-corpo::-webkit-scrollbar { width: 4px; }
.chat-corpo::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 2px; }

/* ── mensagens ───────────────────────────────────────────────────────────────── */
.msg { display: flex; gap: 0.5rem; align-items: flex-end; }
.msg--user { flex-direction: row-reverse; }

.msg-avatar { font-size: 1.1rem; flex-shrink: 0; line-height: 1; margin-bottom: 2px; }

.msg-balao {
  max-width: 82%;
  padding: 0.55rem 0.8rem;
  border-radius: 14px;
  font-size: 0.88rem;
  line-height: 1.55;
}
.msg--bot  .msg-balao {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  border-bottom-left-radius: 4px;
}
.msg--user .msg-balao {
  background: rgba(15, 118, 110, 0.45);
  border: 1px solid rgba(94, 234, 212, 0.25);
  color: #e2e8f0;
  border-bottom-right-radius: 4px;
}

/* typing */
.msg-balao--typing { display: flex; gap: 4px; align-items: center; padding: 0.65rem 0.9rem; }
.msg-balao--typing span {
  width: 7px; height: 7px; border-radius: 50%; background: #5eead4;
  animation: bounce 1.2s infinite ease-in-out;
}
.msg-balao--typing span:nth-child(2) { animation-delay: 0.2s; }
.msg-balao--typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0);    opacity: 0.5; }
  40%           { transform: translateY(-6px); opacity: 1;   }
}

:deep(.msg-link) { color: #5eead4; text-decoration: underline; text-underline-offset: 2px; }

/* ── footer ──────────────────────────────────────────────────────────────────── */
.chat-footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.15);
  background: rgba(15, 23, 42, 0.6);
  align-items: flex-end;
  flex-shrink: 0;
}
.chat-input {
  flex: 1;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 0.88rem;
  padding: 0.55rem 0.75rem;
  resize: none;
  line-height: 1.4;
  font-family: inherit;
  transition: border-color 0.15s;
  max-height: 100px;
  overflow-y: auto;
}
.chat-input:focus { outline: none; border-color: rgba(94, 234, 212, 0.45); }
.chat-input::placeholder { color: #64748b; }
.chat-input:disabled { opacity: 0.5; }

.chat-enviar {
  width: 36px; height: 36px;
  border-radius: 10px; border: none;
  background: linear-gradient(135deg, #0f766e, #5eead4);
  color: #042f2e; font-size: 1.1rem; font-weight: 700;
  cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.15s, transform 0.1s;
}
.chat-enviar:disabled { opacity: 0.35; cursor: not-allowed; }
.chat-enviar:not(:disabled):hover { opacity: 0.88; transform: scale(1.05); }

/* ── transição ───────────────────────────────────────────────────────────────── */
.chat-enter-active, .chat-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.chat-enter-from,  .chat-leave-to      { opacity: 0; transform: translateY(12px) scale(0.97); }
</style>