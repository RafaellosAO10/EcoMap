const request = require('supertest');
const app = require('../app');
const db = require('../database/connection');
const config = require('../config/env');
const { normalizarTexto, escaparLike } = require('../utils/texto');

// "zzbusca" torna os nomes exclusivos deste arquivo, sem depender do seed.
const MATERIAL = { nome: 'Óleo Zzbusca', slug: 'oleo-zzbusca' };
const CIDADE = 'Cidade Zzbusca';

const idsCriados = [];

async function criarPonto(dados) {
  const response = await request(app)
    .post('/api/pontos')
    .set('X-API-Key', config.apiKey)
    .send({ endereco: 'Rua dos Testes', estado: 'SP', cidade: CIDADE, ...dados });

  expect(response.status).toBe(201);
  idsCriados.push(response.body.data.id);
}

async function buscar(query) {
  const response = await request(app).get('/api/pontos').query(query);

  expect(response.status).toBe(200);
  return response.body.data.map((ponto) => ponto.nome).sort();
}

beforeAll(async () => {
  db.prepare('INSERT OR IGNORE INTO materiais (nome, slug) VALUES (?, ?)').run(
    MATERIAL.nome,
    MATERIAL.slug
  );

  await criarPonto({ nome: 'Cooperativa São João Zzbusca' });
  await criarPonto({ nome: 'Coleta Verde Zzbusca', materiais: [MATERIAL.slug] });
  await criarPonto({ nome: 'Ponto 100% Zzbusca', cidade: 'Outra Cidade Zzbusca' });
});

afterAll(() => {
  const remover = db.prepare('DELETE FROM pontos_reciclagem WHERE id = ?');

  for (const id of idsCriados) {
    remover.run(id);
  }

  db.prepare('DELETE FROM materiais WHERE slug = ?').run(MATERIAL.slug);
  db.close();
});

describe('Busca (GET /api/pontos?busca=)', () => {
  it('deve buscar pelo nome, ignorando maiúsculas e acentos', async () => {
    expect(await buscar({ busca: 'sao joao zzbusca' })).toEqual(['Cooperativa São João Zzbusca']);
    expect(await buscar({ busca: 'SÃO JOÃO' })).toContain('Cooperativa São João Zzbusca');
  });

  it('deve buscar por parte do nome', async () => {
    expect(await buscar({ busca: 'zzbusca', cidade: CIDADE })).toEqual([
      'Coleta Verde Zzbusca',
      'Cooperativa São João Zzbusca',
    ]);
  });

  it('deve buscar pelo nome de um material aceito, ignorando maiúsculas e acentos', async () => {
    expect(await buscar({ busca: 'oleo zzbusca' })).toEqual(['Coleta Verde Zzbusca']);
    expect(await buscar({ busca: 'ÓLEO ZZBUSCA' })).toEqual(['Coleta Verde Zzbusca']);
  });

  it('deve ignorar espaços nas pontas', async () => {
    expect(await buscar({ busca: '   oleo zzbusca   ' })).toEqual(['Coleta Verde Zzbusca']);
  });

  it('deve combinar a busca com os filtros de cidade e material', async () => {
    expect(await buscar({ busca: 'zzbusca', cidade: 'Outra Cidade Zzbusca' })).toEqual([
      'Ponto 100% Zzbusca',
    ]);
    expect(await buscar({ busca: 'coleta', material: MATERIAL.slug })).toEqual([
      'Coleta Verde Zzbusca',
    ]);
    expect(await buscar({ busca: 'cooperativa zzbusca', material: MATERIAL.slug })).toEqual([]);
  });

  it('deve tratar % e _ como texto comum, e não como curingas', async () => {
    expect(await buscar({ busca: '%' })).toEqual(['Ponto 100% Zzbusca']);
    expect(await buscar({ busca: '_' })).toEqual([]);
  });

  it('deve retornar lista vazia (200) quando nada corresponde', async () => {
    expect(await buscar({ busca: 'nada-corresponde-a-isto' })).toEqual([]);
  });

  it('deve ignorar a busca vazia e listar tudo', async () => {
    const semBusca = await buscar({ cidade: CIDADE });
    const buscaVazia = await buscar({ cidade: CIDADE, busca: '' });

    expect(buscaVazia).toEqual(semBusca);
  });

  it('não deve quebrar com parâmetros repetidos (?busca=a&busca=b)', async () => {
    const response = await request(app).get('/api/pontos?busca=a&busca=b&cidade=x&cidade=y');

    expect(response.status).toBe(200);
  });
});

describe('utils/texto', () => {
  it('normalizarTexto remove acentos, espaços das pontas e caixa alta', () => {
    expect(normalizarTexto('  São JOÃO Ç ')).toBe('sao joao c');
    expect(normalizarTexto(null)).toBe('');
    expect(normalizarTexto(undefined)).toBe('');
  });

  it('escaparLike escapa %, _ e a barra invertida', () => {
    expect(escaparLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });
});
