# ♻️ EcoMap

> Sistema web colaborativo para localização de pontos de reciclagem.

O **EcoMap** é um projeto desenvolvido para a disciplina **Open Source Contribution & Collaboration**, com foco em sustentabilidade e na aplicação de práticas de desenvolvimento colaborativo com Git e GitHub.

## 🌱 Sobre o projeto

Encontrar locais adequados para descarte de materiais recicláveis nem sempre é simples. O **EcoMap** facilita essa localização: qualquer pessoa consulta os pontos cadastrados, e novos pontos enviados pelo público passam por aprovação antes de aparecer na listagem.

## 🎯 Objetivos

- Facilitar a localização de pontos de reciclagem.
- Permitir a consulta de pontos por cidade, material e texto livre.
- Permitir o envio de novos pontos, com moderação antes da publicação.
- Informar os materiais aceitos em cada local.
- Apresentar os pontos em um mapa (planejado).
- Desenvolver o projeto com práticas de colaboração com Git e GitHub.

## ✨ Funcionalidades

### ✅ Implementado

- Servidor HTTP com Express e banco SQLite.
- API REST para pontos de reciclagem e materiais.
- Validação dos dados recebidos, com respostas de erro em JSON.
- Chave de API para alterações e aprovação de pontos.
- Moderação: pontos enviados sem chave ficam pendentes até aprovação.
- Listagem na página inicial com nome, endereço, materiais, horário e distância.
- Filtros por cidade e por material, com busca por nome ou material sem diferenciar maiúsculas, minúsculas e acentos.
- Localização do usuário (opcional) para ordenar os pontos do mais próximo ao mais distante.
- Contagem de pontos por material no filtro.
- Testes automatizados da API e da lógica de geolocalização.

### 🚧 Em desenvolvimento

- Cadastro de pontos pela interface web.
- Edição e exclusão de pontos pela interface.
- Mapa interativo.
- Melhorias de acessibilidade e responsividade.
- Testes com banco separado do banco de desenvolvimento.

## 🛠️ Tecnologias

| Tecnologia | Descrição |
| --- | --- |
| **Node.js** | Ambiente de execução JavaScript. |
| **Express** | Framework para o servidor e a API. |
| **SQLite** | Banco de dados da aplicação. |
| **better-sqlite3** | Integração entre Node.js e SQLite. |
| **express-validator** | Validação das requisições. |
| **Helmet** | Cabeçalhos de segurança HTTP. |
| **CORS** | Controle de acesso entre origens. |
| **Jest e Supertest** | Testes automatizados. |
| **Nodemon** | Reinicialização automática durante o desenvolvimento. |
| **Git e GitHub** | Controle de versão e colaboração. |

## 📋 Pré-requisitos

- Node.js
- npm
- Git

Para verificar as versões instaladas:

```
node -v
npm -v
git --version
```

## 🚀 Instalação

### 1. Clone o repositório

```
git clone https://github.com/GustavoTalgatti/EcoMap.git
```

Para contribuir, faça um fork do repositório e clone o seu fork.

### 2. Entre na pasta do projeto

```
cd EcoMap
```

### 3. Instale as dependências

```
npm install
```

## ⚙️ Configuração do ambiente

Crie o arquivo `.env` a partir do exemplo:

```
copy .env.example .env      # Windows
cp .env.example .env        # Linux/macOS
```

As variáveis são:

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `PORT` | Porta do servidor. | `3000` |
| `NODE_ENV` | Ambiente de execução. | `development` |
| `DATABASE_PATH` | Caminho do arquivo SQLite. | `src/database/ecomap.db` |
| `ECOMAP_API_KEY` | Chave usada para alterações e aprovação de pontos. | vazio |

> **Importante:** o `.env` contém configurações locais e **não deve ser enviado ao GitHub**. Sem `ECOMAP_API_KEY` definida, nenhuma alteração protegida é aceita.

## ▶️ Executando o projeto

Para iniciar em modo de desenvolvimento:

```
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

O banco começa vazio. Para popular com materiais e pontos de exemplo, execute uma vez:

```
npm run db:seed
```

## 🔎 Verificando a aplicação

```
GET /health
```

Deve retornar uma resposta indicando que a API está funcionando.

## 🔌 API

A API usa o prefixo `/api`. Respostas de sucesso trazem `success: true` e, quando há dados, o campo `data`.

### Formato dos pontos

Cada ponto retorna seus campos e a lista de materiais aceitos em `materiais`, como array de objetos:

```json
{
  "id": 1,
  "nome": "Ponto de Reciclagem Central",
  "cidade": "São Paulo",
  "estado": "SP",
  "status": "aprovado",
  "materiais": [
    { "id": 1, "nome": "Papel", "slug": "papel" }
  ]
}
```

### Autenticação

Consultas são públicas. Alterações exigem o cabeçalho `X-API-Key` com o valor de `ECOMAP_API_KEY`:

```
X-API-Key: sua-chave
```

- Chave válida: a operação é aceita.
- Chave ausente em operações protegidas: resposta 401.
- Chave informada, mas incorreta: resposta 401, inclusive no envio público.

A chave protege contra alterações de desconhecidos, mas não identifica quem fez cada alteração.

### Moderação

Pontos enviados **sem chave** são criados com `status: "pendente"`. Eles não aparecem na listagem pública nem em `GET /api/pontos/:id`. Quem tem a chave aprova o ponto, e ele passa a ser público. Pontos enviados **com chave válida** já são criados como `aprovado`.

O campo `status` não pode ser definido pelo cliente: o servidor decide o valor.

### Endpoints

| Método | Rota | Chave | Descrição |
| --- | --- | --- | --- |
| `GET` | `/api/pontos` | não | Lista os pontos aprovados. Aceita os filtros abaixo. |
| `GET` | `/api/pontos/:id` | não | Retorna um ponto aprovado. Pendentes respondem 404 ao público. |
| `GET` | `/api/pontos/pendentes` | sim | Lista os pontos aguardando aprovação. |
| `POST` | `/api/pontos` | opcional | Cria um ponto. Sem chave, fica pendente. |
| `PATCH` | `/api/pontos/:id/aprovar` | sim | Aprova um ponto pendente. |
| `PUT` | `/api/pontos/:id` | sim | Atualiza um ponto. Sem `materiais` no corpo, os materiais atuais são mantidos. |
| `DELETE` | `/api/pontos/:id` | sim | Exclui um ponto. |
| `GET` | `/api/materiais` | não | Lista os materiais com `total_pontos`. |

### Filtros da listagem

Combináveis entre si:

```
GET /api/pontos?cidade=Campinas
GET /api/pontos?material=plastico
GET /api/pontos?busca=vidro
GET /api/pontos?cidade=Campinas&material=vidro
```

- `material` usa o **slug** do material (ex.: `plastico`, `oleo-de-cozinha`), disponível em `GET /api/materiais`.
- `busca` procura no nome do ponto ou no nome de um material aceito, sem diferenciar maiúsculas e acentos (`sao joao` encontra `São João`).

### Exemplo de criação

```
POST /api/pontos
Content-Type: application/json

{
  "nome": "Ponto Exemplo",
  "endereco": "Rua das Flores",
  "numero": "75",
  "cidade": "Campinas",
  "estado": "SP",
  "materiais": ["papel", "vidro"]
}
```

Os slugs de `materiais` precisam existir em `GET /api/materiais`; slugs desconhecidos retornam 400.

## 📍 Localização do usuário

O botão **Usar minha localização** usa a geolocalização do navegador para calcular a distância em linha reta até os pontos com latitude e longitude.

- A posição é usada apenas no navegador e **nunca é enviada ao servidor**.
- O navegador só libera a geolocalização em `localhost` ou em páginas HTTPS.
- Pontos sem coordenadas continuam na lista, no final, sem distância.

## 🗄️ Banco de dados

O banco SQLite tem três estruturas:

- `pontos_reciclagem`: dados dos pontos, incluindo `status` (`pendente` ou `aprovado`).
- `materiais`: materiais recicláveis, com `nome` e `slug` únicos.
- `ponto_materiais`: relação entre pontos e materiais.

A estrutura está em `src/database/schema.sql`. Bancos criados antes da moderação recebem a coluna `status` automaticamente ao iniciar, com todos os pontos existentes marcados como `aprovado`.

Os dados de exemplo ficam em `src/database/seed/seed.js`.

## 🧪 Testes

```
npm test
```

O script define uma chave de teste (`ECOMAP_API_KEY=chave-de-teste`) e roda as suítes em `src/__tests__/`. Os testes criam dados com nomes exclusivos e os removem ao final.

Os testes usam o mesmo banco do desenvolvimento por enquanto. Separar esse banco está na lista de melhorias.

## 📁 Estrutura do projeto

```
EcoMap/
├── public/                 # Página estática: HTML, CSS e JavaScript do navegador
│   ├── css/
│   └── js/                 # app.js (listagem) e geo.js (distância)
├── src/
│   ├── config/             # Variáveis de ambiente
│   ├── controllers/        # Recebem as requisições e montam as respostas
│   ├── database/           # Conexão, schema.sql e seed
│   ├── middlewares/        # Chave de API, erros e logs
│   ├── models/             # Consultas ao banco
│   ├── routes/             # Rotas da API
│   ├── services/           # Regras de negócio
│   ├── utils/              # Funções utilitárias
│   ├── validators/         # Validação das requisições
│   ├── __tests__/          # Testes automatizados
│   ├── app.js              # Configuração da aplicação Express
│   └── server.js           # Inicialização do servidor
├── views/                  # index.html
├── .env.example            # Modelo de configuração
├── CONTRIBUTING.md         # Guia de contribuição
└── README.md
```

## 🔀 Fluxo de desenvolvimento

O projeto usa GitHub para controle de versão e colaboração:

```
Issue → Branch → Desenvolvimento → Commit → Push → Pull Request → Code Review → Merge
```

> **Importante:** não faça alterações diretamente na branch `main`. Cada alteração deve estar em uma branch ligada a uma Issue.

O guia completo, com convenções de branches e commits, está em [CONTRIBUTING.md](CONTRIBUTING.md).

## 👥 Equipe

Projeto desenvolvido pelos integrantes do grupo para a disciplina **Open Source Contribution & Collaboration**.

- **Instituição:** UniFecaf
- **Professor:** Robson Cardoso

### Integrantes

- Cláudio José Rodrigues de Oliveira Junior
- Felipe Pardinho Belarmino
- Gabriela Camarço
- Igor Ferreira Alves
- Luis Gustavo dos Santos Talgatti
- Matheus Silva Dantas
- Rickelmy Augusto Souza Pacheco

## 📄 Licença

O `package.json` declara a licença MIT, mas o arquivo `LICENSE` ainda não existe. A licença final deve ser confirmada pelo grupo antes de qualquer uso fora da disciplina.
