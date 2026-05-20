# Onde Acontece Recife

Plataforma web progressiva (PWA) para descoberta de eventos culturais em Recife. Agrega eventos da Prefeitura, produtores independentes e plataformas como TicketPE e Sympla em um feed centralizado com filtros inteligentes e mapa interativo.

Projeto acadêmico — CESAR School, 2026.

---

## Tecnologias

- **Frontend:** Vue.js 3 + Vite + Pinia + Vue Router
- **Backend:** FastAPI + Python 3.11+
- **ML/Pipeline:** scikit-learn, pandas, joblib
- **Mapa:** Mapbox GL JS v3 (carregado via CDN, token obrigatório)

---

## Como rodar

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m ml.train_free_paid
uvicorn main:app --reload
```

API disponível em `http://localhost:8000` — documentação automática em `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponível em `http://localhost:5173`.

### Variáveis de ambiente

Crie o arquivo `frontend/.env` com as seguintes variáveis:

```env
# URL da API (opcional — padrão: http://localhost:8000)
VITE_API_BASE_URL=http://127.0.0.1:8000

# Token público do Mapbox (obrigatório para a view /mapa)
# Crie sua conta em https://mapbox.com e copie o token que começa com pk.eyJ1...
VITE_MAPBOX_TOKEN=pk.eyJ1IIseuTokenAqui
```

Sem o `VITE_MAPBOX_TOKEN`, a rota `/mapa` exibe uma mensagem de erro amigável — o restante do app funciona normalmente.

---

## Funcionalidades implementadas

### Feed e filtros
- Feed de eventos com filtros combinados por categoria, preço, bairro e data
- Modo "O que tá rolando agora?" com auto-refresh a cada 5 minutos
- Skeleton loading, estado vazio e mensagem de erro

### Mapa interativo
- Rota `/mapa` com mapa Mapbox GL JS em dark mode centrado em Recife
- Marcadores coloridos por categoria com popup de detalhes
- Botão "Usar minha localização" com fly-to animado
- Link direto do popup para a página de detalhe do evento
- Legenda de categorias

### Detalhe do evento
- Página dedicada por slug com todas as informações do evento
- Botão "Comprar ingresso" (aparece automaticamente quando o evento tem `link_compra`)
- Badge de fonte ("via TicketPE", "via Sympla", "via Prefeitura do Recife")
- Botão "Como chegar" abre Google Maps com endereço pré-preenchido
- Compartilhamento via Web Share API ou cópia de link

### Dados e ML
- 22 eventos no seed com coordenadas geográficas reais, `source` e `link_compra`
- Classificador automático gratuito/pago por texto (heurística + modelo treinado)
- Pipeline de normalização de bairros, categorias e variáveis derivadas
- Badge de confiança da classificação por IA na página de detalhe

### Produtores e favoritos
- Formulário de cadastro autônomo de eventos por produtores culturais
- Favoritos persistidos em localStorage com contador no nav

---

## Estrutura de um evento (modelo completo)

| Campo | Tipo | Descrição |
|---|---|---|
| `titulo` | string | Nome do evento |
| `descricao` | string | Descrição completa |
| `categoria` | string | Ex: "Música ao vivo", "Teatro", "Exposição" |
| `bairro` | string | Bairro normalizado pelo pipeline |
| `local` | string | Nome do espaço ou endereço |
| `lat` / `lng` | float | Coordenadas geográficas (usadas pelo mapa) |
| `inicio_iso` | string | Data e hora no formato ISO 8601 |
| `preco` | float | Valor em reais (0 = gratuito) |
| `gratuito` | bool | Flag explícita de gratuidade |
| `organizador` | string | Nome do organizador ou produtora |
| `email_contato` | string | E-mail de contato |
| `source` | string | Origem: `ticketpe`, `sympla`, `prefeitura`, `manual` |
| `link_compra` | string \| null | URL externa de compra de ingressos |

---

## Rotas do frontend

| Rota | View | Descrição |
|---|---|---|
| `/` | `HomeView` | Feed com filtros e hero |
| `/mapa` | `MapaView` | Mapa interativo Mapbox |
| `/evento/:slug` | `EventoDetalheView` | Detalhe do evento |
| `/cadastro` | `CadastroProdutorView` | Formulário para produtores |
| `/favoritos` | `FavoritosView` | Eventos salvos |

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/events` | Feed com filtros e paginação |
| `GET` | `/events/{slug}` | Detalhe de um evento |
| `POST` | `/events` | Cadastro de novo evento |
| `GET` | `/meta/bairros` | Lista de bairros disponíveis |
| `GET` | `/meta/categorias` | Lista de categorias disponíveis |
| `POST` | `/ml/classificar` | Classifica texto como gratuito/pago |
| `POST` | `/pipeline/preview` | Pré-visualiza normalização sem persistir |

Parâmetros de `/events`: `categoria`, `preco` (gratuito | ate50 | 50a100 | acima100), `bairro`, `data` (hoje | amanha | fds | semana), `agora`, `page`, `per_page`.

---

## Backlog coberto no código

| Ticket | Épico | Arquivo principal |
|---|---|---|
| E1-US01 | Setup & Infraestrutura | `backend/main.py`, `frontend/src/` |
| E2-US04 / E2-US05 | Feed + filtros | `HomeView.vue`, `FilterBar.vue`, `events.js` |
| E2-US06 | Mapa interativo | `frontend/src/views/MapaView.vue` |
| E2-US07 | Modo "Agora" | `HomeView.vue`, `events.js` |
| E2-US08 | Detalhe do evento | `EventoDetalheView.vue`, `GET /events/{slug}` |
| E2-US10 | Favoritos | `FavoritosView.vue`, `events.js` |
| E3-US12 | Cadastro por produtores | `CadastroProdutorView.vue`, `POST /events` |
| E3-US13 | Pipeline de limpeza | `backend/pipeline/` |
| E4-US17 | Classificador gratuito/pago | `backend/ml/` |

### Próximas entregas planejadas

- `E3-US11` — Scraper TicketPE + Sympla + Prefeitura (integração API TicketPE em andamento)
- `E2-US09` — Autenticação via Supabase Auth
- `E6-US27` — Dashboard com gráficos de distribuição de eventos

# Agent — Onde Acontece Recife

Servidor proxy Node.js que expõe um endpoint de chat conectado ao **Google Gemini 1.5 Flash**.  
Busca os eventos do backend FastAPI em tempo real e os injeta como contexto em cada conversa.

---

## Estrutura

```
agent/
├── server.js        # servidor Express — proxy Gemini + contexto de eventos
├── package.json
├── .env.example     # variáveis necessárias
└── README.md
```

---

## Como rodar

### 1. Instalar dependências

```bash
cd agent
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com sua chave:

```env
GEMINI_API_KEY=sua_chave_aqui
OAR_API_BASE=http://localhost:8000
PORT=3001
```

Obtenha a chave gratuitamente em [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### 3. Iniciar o agente

```bash
npm run dev
```

Agente disponível em `http://localhost:3001`.  
Confirme com: `http://localhost:3001/health`

---

## Ordem de inicialização

O projeto tem três processos separados. Suba nessa ordem:

```bash
# terminal 1 — backend
cd backend && uvicorn main:app --reload

# terminal 2 — agente
cd agent && npm run dev

# terminal 3 — frontend
cd frontend && npm run dev
```

---

## Variável no frontend

Adicione ao `frontend/.env`:

```env
VITE_AGENT_URL=http://localhost:3001
```

Se omitida, o `ChatWidget.vue` usa `http://localhost:3001` como padrão.

---

## Endpoint

### `POST /chat`

```json
{
  "messages": [
    { "role": "user", "content": "O que tem de gratuito hoje em Boa Viagem?" }
  ]
}
```

Resposta:

```json
{
  "reply": "Encontrei dois eventos gratuitos em Boa Viagem hoje:\n\n• **Feira de Artesanato Pernambucano** ..."
}
```

O histórico completo da conversa é enviado em cada requisição — o agente é stateless e o estado fica no frontend.

---

## Como funciona

1. Recebe o histórico de mensagens do frontend
2. Faz `GET /events?per_page=100` no backend FastAPI
3. Serializa os eventos como texto estruturado
4. Monta o prompt com system instruction + contexto + histórico
5. Chama `gemini-1.5-flash` via REST
6. Retorna a resposta para o frontend