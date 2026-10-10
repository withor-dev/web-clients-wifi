# Painel Wi-Fi de visitantes — Desafio Técnico Grupo Boticário

Painel para o dono de uma loja O Boticário acompanhar os acessos ao Wi-Fi de visitantes e tomar decisões a partir deles.

| | Link |
|---|---|
| Painel (front) | `https://<preencher>.vercel.app` |
| API | `https://<preencher>.onrender.com` |
| Swagger | `https://<preencher>.onrender.com/docs` |

> A API roda no plano gratuito do Render, que hiberna após 15 min sem tráfego. Um workflow do GitHub Actions a mantém acordada; se ainda assim o primeiro acesso demorar (até ~1 min), o painel mostra "Conectando ao servidor…" e carrega sozinho quando a API responder.

---

## 1. O problema e a persona

**Persona:** dono(a) de loja, sem perfil técnico, que abre o painel para **decidir algo**, não para explorar dados.

Por isso o painel não mostra tudo o que dá para calcular: cada bloco responde a uma pergunta concreta do dia a dia da loja, em linguagem direta, no fuso horário da loja e sempre comparado com o período anterior.

## 2. Decisão → métrica

| Decisão do dono | Pergunta | Métrica no painel |
|---|---|---|
| Escala de equipe | Quantas pessoas coloco por turno? | Mapa de calor hora × dia da semana (média de chegadas) |
| Crescimento | Minha loja está crescendo? | Visitantes únicos + variação vs. período anterior |
| Fidelização | Os clientes voltam? | % de clientes que voltaram vs. novos |
| Engajamento | O cliente fica ou só passa? | Permanência **mediana** |

Definições usadas:

- **Visitante único:** dispositivo distinto com conexão iniciada no período.
- **Recorrente:** visitante do período que **já tinha se conectado nesta loja antes do início do período**. Novo = primeira visita à loja dentro do período. Assim a pergunta "os clientes voltam?" usa todo o histórico, e não só a janela selecionada.
- **Permanência mediana, e não média:** funcionários e acompanhantes ficam conectados por horas e puxariam a média para cima. A mediana responde "metade das visitas dura até X minutos" e não se deixa levar por esses casos. O seed inclui funcionários conectados o dia todo justamente para evidenciar isso.
- **Mapa de calor:** conexões iniciadas em cada faixa (dia da semana × hora local), divididas pelo número de vezes que aquele dia da semana aparece no período. O número na célula é "em média, quantas pessoas chegam numa segunda às 13h".
- **Período:** últimos 7, 30 ou 90 dias **completos** (terminando ontem). O dia de hoje fica de fora porque está pela metade e distorceria a tendência e a comparação. O período fica na URL (`?dias=30`) para o link poder ser compartilhado.
- **Comparação:** período de mesmo tamanho imediatamente anterior. Quando não há base (período anterior vazio), o painel diz isso em vez de mostrar "+∞%".

## 3. Arquitetura e stack

```
/api   NestJS + TypeORM + Swagger  → Render (Dockerfile, Blueprint em render.yaml)
/web   Vite + React + TypeScript + Tailwind + TanStack Query + Recharts → Vercel
       PostgreSQL → Neon
```

- **TypeScript** de ponta a ponta.
- **Por que relacional (Postgres):** os dados são naturalmente relacionais (loja → sessões ← dispositivo) e as métricas são agregações (`count distinct`, `percentile_cont`, `generate_series`, conversão de fuso com `AT TIME ZONE`) que o Postgres resolve em uma consulta, com índices adequados.
- **SQL explícito para métricas:** as consultas ficam isoladas em [`metrics.repository.ts`](api/src/metrics/metrics.repository.ts). O ORM é usado só para cadastro e consultas simples. Assim cada métrica é legível e auditável.
- **Schema só por migrations** (`synchronize: false`). A migration roda automaticamente ao subir o container.
- **Monorepo simples:** dois pacotes independentes, sem workspaces, para que cada plataforma faça o build só da sua pasta.

## 4. Modelagem e regras de fuso

```
stores   (id, name, timezone)                          timezone IANA, ex.: America/Sao_Paulo
devices  (id, identifier_hash UNIQUE, created_at)      só o hash do identificador
sessions (id, store_id → stores, device_id → devices,
          connected_at, disconnected_at NULL, created_at)
```

- Separar **dispositivo** de **sessão** é o que permite calcular recorrência (o mesmo dispositivo em várias sessões) e permanência (duração de cada sessão).
- O modelo suporta várias lojas. O seed cria duas, em fusos diferentes (Curitiba e Manaus), e o front exibe a loja configurada em `VITE_STORE_ID`.
- Índices: `(store_id, connected_at)`, usado por todas as métricas, e `(device_id, store_id)`, usado na verificação de recorrência.
- `CHECK (disconnected_at IS NULL OR disconnected_at >= connected_at)` no banco, além da validação na API.

**Fuso horário:**

1. Todos os horários são `timestamptz` e gravados em UTC.
2. As agregações convertem para o fuso da loja **antes** de agrupar: `extract(hour FROM connected_at AT TIME ZONE timezone)`.
3. A API recebe datas simples (`2026-10-01`) e calcula a meia-noite local da loja no SQL: `('2026-10-01'::date)::timestamp AT TIME ZONE timezone`. Como a comparação é feita contra constantes, o índice continua sendo usado.
4. **Sessões abertas** (`disconnected_at` nulo) ficam fora da permanência, mas contam em visitantes, recorrência e mapa de calor.

## 5. API

| Método | Rota | Função |
|---|---|---|
| `POST` | `/sessions` | Simula uma conexão (loja, identificador do dispositivo, horários) |
| `PATCH` | `/sessions/:id/disconnect` | Encerra uma sessão aberta |
| `GET` | `/stores/:id/metrics/summary?from&to` | Totais e variação vs. período anterior |
| `GET` | `/stores/:id/metrics/heatmap?from&to` | Conexões por hora × dia da semana |
| `GET` | `/stores/:id/metrics/traffic?from&to` | Série diária de visitantes |
| `GET` | `/health` | Verifica API e banco (health check do Render) |

Documentação interativa em `/docs` (Swagger gerado a partir dos DTOs).

Exemplo de cadastro:

```bash
curl -X POST https://<api>/sessions \
  -H 'Content-Type: application/json' \
  -d '{"storeId":"6f1c2a3e-8b4d-4c5e-9f60-1a2b3c4d5e01","deviceIdentifier":"a4:83:e7:12:9b:3c","connectedAt":"2026-10-10T15:30:00Z"}'
```

## 6. Tratamento de erros

**API:** um filtro global ([`http-exception.filter.ts`](api/src/common/http-exception.filter.ts)) devolve sempre o mesmo formato:

```json
{ "statusCode": 400, "error": "Bad Request", "message": "A data inicial não pode ser posterior à data final.", "details": { "from": "2026-10-08", "to": "2026-10-01" } }
```

| Situação | Status |
|---|---|
| Campos inválidos/ausentes, propriedades desconhecidas (lista por campo em `details`) | 400 |
| Data inexistente (ex.: `2026-02-30`), `from` posterior a `to`, período maior que 366 dias | 400 |
| `disconnectedAt` anterior a `connectedAt`, horários no futuro | 400 |
| UUID malformado | 400 |
| Loja ou sessão inexistente | 404 |
| Desconectar sessão já encerrada (inclusive em corrida, via `UPDATE … WHERE disconnected_at IS NULL`) | 409 |
| Banco fora do ar no `/health` | 503 |
| Erros inesperados (logados no servidor, sem vazar detalhes) | 500 |

O cadastro de dispositivo é um upsert atômico (`INSERT … ON CONFLICT DO NOTHING`): dois cadastros simultâneos do mesmo aparelho não criam duplicatas.

**Front:** cada bloco tem seus próprios estados, então uma falha em um não derruba os outros:

- **Carregando:** skeleton.
- **Cold start:** se a resposta demora mais de 4s, ou se há falha de rede, aparece "Conectando ao servidor…" enquanto o React Query tenta de novo com backoff por cerca de 1 minuto.
- **Erro:** mensagem em linguagem simples e botão "Tentar de novo". Erros 4xx não são repetidos automaticamente.
- **Vazio:** mensagem explicando que não há dados no período.
- **Troca de período:** os dados anteriores ficam esmaecidos até os novos chegarem, sem "piscar".
- **Configuração ausente** (`VITE_API_URL`/`VITE_STORE_ID`): tela explicando o que falta.

## 7. Privacidade (LGPD)

- O identificador do dispositivo (ex.: MAC) **nunca é gravado**. A API guarda só o `HMAC-SHA256(identificador, HASH_SECRET)`.
- Usa-se HMAC com segredo, e não um SHA puro, porque o espaço de MACs é pequeno: um hash sem segredo poderia ser revertido por força bruta.
- O identificador é normalizado (caixa e espaços) antes do hash, para que o mesmo aparelho seja sempre reconhecido.
- As respostas da API não expõem o hash.

## 8. Como rodar localmente

Pré-requisitos: Node 22+ e PostgreSQL 16 (ou Docker).

```bash
# Banco (opcional, se não tiver Postgres local)
docker compose up -d

# API
cd api
cp .env.example .env          # ajuste DATABASE_URL se necessário
npm install
npm run migration:run
npm run seed                  # ATENÇÃO: apaga e recria os dados de demonstração
npm run start:dev             # http://localhost:3000/docs
npm test

# Front (outro terminal)
cd web
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:5173
```

O seed gera **270 dias** de histórico com padrões realistas: picos no almoço (12h–14h) e no fim da tarde (17h–19h), sábado mais cheio, cerca de 35% de visitantes recorrentes, permanência típica de ~10 min com caudas longas (acompanhantes) e funcionários conectados o dia todo, sessões em andamento e duas lojas em fusos diferentes (uma crescendo, outra estável). São 270 dias, e não 90, porque o filtro de 90 dias compara com os 90 anteriores, e ambos precisam de histórico prévio para a recorrência fazer sentido.

### Deploy

| Serviço | Configuração |
|---|---|
| **Neon** | Criar o banco e copiar a connection string. |
| **Render** | *New → Blueprint* apontando para este repositório: o [`render.yaml`](render.yaml) já define Docker (`api/Dockerfile`), plano free, região Virginia, health check `GET /health` e as variáveis. Só é preciso preencher os segredos `DATABASE_URL` e `HASH_SECRET`. A migration roda ao iniciar o container. |
| **Vercel** | *Root directory* `web` (preset Vite). Variáveis: `VITE_API_URL=https://<api>.onrender.com`, `VITE_STORE_ID=6f1c2a3e-8b4d-4c5e-9f60-1a2b3c4d5e01`. |
| **Seed em produção** | Na pasta `api`: `DATABASE_URL=<neon> DATABASE_SSL=true HASH_SECRET=<mesmo do Render> npm run migration:run && npm run seed` |
| **Manter acordada** | Variável do repositório `API_URL=https://<api>.onrender.com` (Settings → Secrets and variables → Actions → Variables) ativa o workflow [`keep-api-warm.yml`](.github/workflows/keep-api-warm.yml), que chama `GET /` a cada 10 min. |

**Por que Render e não Koyeb (como no plano original):** depois da compra do Koyeb pela Mistral (fev/2026), o plano gratuito deixou de aceitar contas novas. O Render mantém plano gratuito para web services com Docker, mas hiberna após 15 min (contra ~1h no Koyeb) e leva ~1 min para acordar. A mitigação é dupla: o ping agendado evita que a API durma, e o front trata a espera com o estado "Conectando ao servidor…" e novas tentativas automáticas.

## 9. Uso de IA

> ✏️ _Revisar e completar com a sua visão antes do envio._

- **Planejamento (humano):** o escopo, a escolha decisão → métrica, a stack, a modelagem e o cronograma foram definidos antes de abrir o editor, num plano escrito.
- **Implementação (Claude Code):** a partir do plano, a IA gerou o esqueleto da API e do front, as consultas SQL, o seed e este README. As decisões que o plano deixava em aberto foram perguntadas, não assumidas: como o front escolhe a loja e a definição de "recorrente".
- **Onde a IA ajudou:** velocidade no boilerplate (DTOs, Swagger, filtro de erros), nas consultas com fuso horário e no seed com padrões realistas. Também sugeriu usar HMAC em vez de SHA puro para o hash.
- **Onde errou ou precisou de correção, e como foi pego:**
  - A primeira versão do seed tinha 90 dias. No teste visual do filtro de 90 dias, o painel mostrou **0% de recorrência** e "sem base de comparação", porque não havia histórico anterior. O histórico subiu para 270 dias.
  - As entidades e a migration divergiam nos nomes das constraints. Isso foi detectado com `typeorm schema:log` e corrigido.
  - A taxa de recorrência do seed saiu abaixo do planejado (23%) e foi recalibrada após conferir os números reais da API.
- **Como foi validado:**
  - testes unitários (intervalos de datas, hash, cálculos de variação);
  - chamadas `curl` cobrindo cada caso de erro da tabela acima;
  - conferência de que entidades e migrations estão em sincronia;
  - teste no navegador de todos os estados do front (inclusive derrubando a API para simular o cold start) e da largura de celular.

## 10. Próximos passos

- **Hospedagem sem hibernação** (plano pago ou AWS), removendo a necessidade do ping agendado.
- **Deploy na AWS com IaC** (ex.: ECS Fargate + RDS via CDK/Terraform), com ambientes separados.
- **CI** (lint, testes e build em cada PR) e **testes de integração** das consultas de métricas contra um Postgres real (Testcontainers), cobrindo fuso e horário de verão.
- **Microsserviço de ingestão** recebendo eventos reais dos access points (fila + idempotência), em vez do endpoint de simulação.
- **Lista de dispositivos de funcionários** para excluí-los das métricas.
- Seletor de loja no front e visão comparativa entre lojas (o backend já suporta).
- Autenticação do dono da loja e autorização por loja.
- Período personalizado (datas livres) além de 7/30/90 dias.
