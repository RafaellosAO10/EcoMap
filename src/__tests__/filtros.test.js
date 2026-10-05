const request = require('supertest');
const app = require('../app');
const db = require('../database/connection');
const config = require('../config/env');

// Dados exclusivos deste arquivo: não dependem do seed e não interferem
// nos pontos existentes. Tudo é removido no afterAll.
const CIDADE_ALFA = 'Cidade Filtro Alfa';
const CIDADE_BETA = 'Cidade Filtro Beta';

const MATERIAL_A = { nome: 'Material Filtro A', slug: 'material-filtro-a' };
const MATERIAL_B = { nome: 'Material Filtro B', slug: 'material-filtro-b' };

const idsCriados = [];

function novoPonto(dados) {
  return {
    endereco: 'Rua dos Testes',
    numero: '10',
    bairro: 'Centro',
    estado: 'SP',
    ...dados,
  };
}

async function criarPonto(dados) {
  const response = await request(app)
    .post('/api/pontos')
    .set('X-API-Key', config.apiKey)
    .send(novoPonto(dados));

  expect(response.status).toBe(201);
  idsCriados.push(response.body.data.id);
}

async function listar(query) {
  const response = await request(app).get('/api/pontos').query(query);

  expect(response.status).toBe(200);
  return response.body.data;
}

const nomes = (pontos) => pontos.map((ponto) => ponto.nome).sort();

beforeAll(async () => {
  const inserir = db.prepare('INSERT OR IGNORE INTO materiais (nome, slug) VALUES (?, ?)');

  inserir.run(MATERIAL_A.nome, MATERIAL_A.slug);
  inserir.run(MATERIAL_B.nome, MATERIAL_B.slug);

  await criarPonto({
    nome: 'Ponto Filtro 1',
    cidade: CIDADE_ALFA,
    horario_funcionamento: 'Segunda a sexta, 08:00 às 17:00',
    materiais: [MATERIAL_A.slug],
  });

  await criarPonto({
    nome: 'Ponto Filtro 2',
    cidade: CIDADE_ALFA,
    materiais: [MATERIAL_A.slug, MATERIAL_B.slug],
  });

  await criarPonto({
    nome: 'Ponto Filtro 3',
    cidade: CIDADE_BETA,
    materiais: [MATERIAL_B.slug],
  });
});

afterAll(() => {
  const remover = db.prepare('DELETE FROM pontos_reciclagem WHERE id = ?');

  for (const id of idsCriados) {
    remover.run(id);
  }

  db.prepare('DELETE FROM materiais WHERE slug IN (?, ?)').run(MATERIAL_A.slug, MATERIAL_B.slug);
  db.close();
});

describe('GET /api/materiais', () => {
  it('deve listar os materiais com nome e slug', async () => {
    const response = await request(app).get('/api/materiais');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining(MATERIAL_A),
        expect.objectContaining(MATERIAL_B),
      ])
    );
  });

  it('deve informar em quantos pontos cada material é aceito', async () => {
    const response = await request(app).get('/api/materiais');
    const material = (slug) => response.body.data.find((m) => m.slug === slug);

    // A: pontos 1 e 2 | B: pontos 2 e 3
    expect(material(MATERIAL_A.slug).total_pontos).toBe(2);
    expect(material(MATERIAL_B.slug).total_pontos).toBe(2);
  });
});

describe('Filtros de GET /api/pontos', () => {
  it('deve filtrar por cidade', async () => {
    const pontos = await listar({ cidade: CIDADE_ALFA });

    expect(nomes(pontos)).toEqual(['Ponto Filtro 1', 'Ponto Filtro 2']);
  });

  it('deve filtrar por cidade sem diferenciar maiúsculas de minúsculas', async () => {
    const pontos = await listar({ cidade: CIDADE_ALFA.toLowerCase() });

    expect(nomes(pontos)).toEqual(['Ponto Filtro 1', 'Ponto Filtro 2']);
  });

  it('deve filtrar por material', async () => {
    const pontos = await listar({ material: MATERIAL_A.slug });

    expect(nomes(pontos)).toEqual(['Ponto Filtro 1', 'Ponto Filtro 2']);
  });

  it('deve combinar os filtros de cidade e material', async () => {
    const pontos = await listar({ cidade: CIDADE_ALFA, material: MATERIAL_B.slug });

    expect(nomes(pontos)).toEqual(['Ponto Filtro 2']);
  });

  it('deve retornar lista vazia (200) quando nenhum ponto atende aos filtros', async () => {
    const pontos = await listar({ cidade: CIDADE_BETA, material: MATERIAL_A.slug });

    expect(pontos).toEqual([]);
  });

  it('deve retornar lista vazia (200) para uma cidade inexistente', async () => {
    const pontos = await listar({ cidade: 'Cidade Que Nao Existe' });

    expect(pontos).toEqual([]);
  });

  it('deve expor os dados exibidos na listagem, incluindo todos os materiais do ponto', async () => {
    const pontos = await listar({ cidade: CIDADE_ALFA, material: MATERIAL_A.slug });
    const ponto = pontos.find((p) => p.nome === 'Ponto Filtro 2');

    expect(ponto).toMatchObject({
      endereco: 'Rua dos Testes',
      cidade: CIDADE_ALFA,
      horario_funcionamento: null,
    });

    // Filtrar por A não esconde que o ponto também aceita B.
    const nomesMateriais = ponto.materiais.map((m) => m.nome);

    expect(nomesMateriais).toContain(MATERIAL_A.nome);
    expect(nomesMateriais).toContain(MATERIAL_B.nome);
  });
});

describe('POST /api/pontos com campos opcionais', () => {
  it('deve criar um ponto apenas com os campos obrigatórios (horário é opcional)', async () => {
    const response = await request(app)
      .post('/api/pontos')
      .set('X-API-Key', config.apiKey)
      .send(novoPonto({ nome: 'Ponto Sem Horario', cidade: CIDADE_BETA }));

    expect(response.status).toBe(201);
    expect(response.body.data.horario_funcionamento).toBeNull();

    idsCriados.push(response.body.data.id);
  });
});

describe('Página inicial', () => {
  it('deve servir o HTML com os filtros e o script externo', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('id="filtro-cidade"');
    expect(response.text).toContain('id="filtro-material"');
    expect(response.text).toContain('id="busca"');
    expect(response.text).toContain('src="/js/app.js"');
  });

  it('não deve usar script inline (bloqueado pela CSP do Helmet)', async () => {
    const response = await request(app).get('/');

    const scriptsInline = response.text.match(/<script(?![^>]*\bsrc=)[^>]*>/gi);

    expect(scriptsInline).toBeNull();
    expect(response.headers['content-security-policy']).toMatch(/script-src 'self'/);
  });

  it('deve servir o JavaScript e o CSS da interface', async () => {
    const js = await request(app).get('/js/app.js');
    const geo = await request(app).get('/js/geo.js');
    const css = await request(app).get('/css/styles.css');

    expect(geo.status).toBe(200);
    expect(js.status).toBe(200);
    expect(js.headers['content-type']).toMatch(/javascript/);
    expect(css.status).toBe(200);
    expect(css.headers['content-type']).toMatch(/css/);
  });
});
