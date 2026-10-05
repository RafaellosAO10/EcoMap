const request = require('supertest');
const app = require('../app');
const db = require('../database/connection');
const config = require('../config/env');

const MATERIAL = { nome: 'Material Correcao', slug: 'material-correcao' };
const CIDADE = 'Cidade Correcao';

const idsCriados = [];

const dadosBase = {
  nome: 'Ponto Correcao',
  endereco: 'Rua das Correcoes',
  estado: 'SP',
  cidade: CIDADE,
};

beforeAll(() => {
  db.prepare('INSERT OR IGNORE INTO materiais (nome, slug) VALUES (?, ?)').run(
    MATERIAL.nome,
    MATERIAL.slug
  );
});

afterAll(() => {
  const remover = db.prepare('DELETE FROM pontos_reciclagem WHERE id = ?');

  for (const id of idsCriados) {
    remover.run(id);
  }

  db.prepare('DELETE FROM materiais WHERE slug = ?').run(MATERIAL.slug);
  db.close();
});

async function criarPonto(dados) {
  const response = await request(app)
    .post('/api/pontos')
    .set('X-API-Key', config.apiKey)
    .send({ ...dadosBase, ...dados });

  expect(response.status).toBe(201);
  idsCriados.push(response.body.data.id);

  return response.body.data;
}

describe('JSON inválido', () => {
  it('deve responder 400 quando o corpo não é um JSON válido', async () => {
    const response = await request(app)
      .post('/api/pontos')
      .set('X-API-Key', config.apiKey)
      .set('Content-Type', 'application/json')
      .send('{invalido');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('Materiais inexistentes', () => {
  it('deve rejeitar um slug de material que não existe', async () => {
    const response = await request(app)
      .post('/api/pontos')
      .set('X-API-Key', config.apiKey)
      .send({ ...dadosBase, materiais: ['slug-que-nao-existe'] });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].campo).toBe('materiais[0]');
  });

  it('não deve criar o ponto quando um material é inválido', async () => {
    const antes = db.prepare('SELECT COUNT(*) AS total FROM pontos_reciclagem WHERE cidade = ?').get(CIDADE);

    await request(app)
      .post('/api/pontos')
      .set('X-API-Key', config.apiKey)
      .send({ ...dadosBase, materiais: ['slug-que-nao-existe'] });

    const depois = db.prepare('SELECT COUNT(*) AS total FROM pontos_reciclagem WHERE cidade = ?').get(CIDADE);

    expect(depois.total).toBe(antes.total);
  });

  it('deve rejeitar material inexistente também na atualização', async () => {
    const ponto = await criarPonto({ materiais: [MATERIAL.slug] });

    const response = await request(app)
      .put(`/api/pontos/${ponto.id}`)
      .set('X-API-Key', config.apiKey)
      .send({ ...dadosBase, materiais: ['slug-que-nao-existe'] });

    expect(response.status).toBe(400);
  });
});

describe('Chave de API nas escritas', () => {
  it('deve recusar criação com chave incorreta', async () => {
    const response = await request(app)
      .post('/api/pontos')
      .set('X-API-Key', 'chave-errada')
      .send(dadosBase);

    expect(response.status).toBe(401);
  });

  it('deve recusar qualquer escrita quando a chave não está configurada', async () => {
    const chaveOriginal = config.apiKey;

    config.apiKey = '';

    try {
      const response = await request(app)
        .post('/api/pontos')
        .set('X-API-Key', '')
        .send(dadosBase);

      expect(response.status).toBe(401);
    } finally {
      config.apiKey = chaveOriginal;
    }
  });

  it('deve recusar alteração e exclusão sem a chave, mantendo o ponto', async () => {
    const ponto = await criarPonto({});

    const alteracao = await request(app)
      .put(`/api/pontos/${ponto.id}`)
      .send({ ...dadosBase, nome: 'Tentativa sem chave' });

    const exclusao = await request(app).delete(`/api/pontos/${ponto.id}`);
    const consulta = await request(app).get(`/api/pontos/${ponto.id}`);

    expect(alteracao.status).toBe(401);
    expect(exclusao.status).toBe(401);
    expect(consulta.status).toBe(200);
    expect(consulta.body.data.nome).toBe(dadosBase.nome);
  });

  it('deve manter a leitura pública sem a chave', async () => {
    const response = await request(app).get('/api/pontos');

    expect(response.status).toBe(200);
  });
});

describe('Moderação de pontos', () => {
  it('deve criar como pendente quando o envio não tem chave', async () => {
    const response = await request(app).post('/api/pontos').send({ ...dadosBase, nome: 'Sugestao Publica' });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('pendente');
    idsCriados.push(response.body.data.id);
  });

  it('deve ocultar pontos pendentes da listagem e do GET por ID públicos', async () => {
    const response = await request(app).post('/api/pontos').send({ ...dadosBase, cidade: CIDADE, nome: 'Oculto' });
    const id = response.body.data.id;
    idsCriados.push(id);

    const lista = await request(app).get('/api/pontos').query({ cidade: CIDADE });
    const porId = await request(app).get(`/api/pontos/${id}`);

    expect(lista.body.data.find((p) => p.id === id)).toBeUndefined();
    expect(porId.status).toBe(404);
  });

  it('não deve aceitar status definido pelo cliente', async () => {
    const response = await request(app)
      .post('/api/pontos')
      .send({ ...dadosBase, status: 'aprovado' });

    idsCriados.push(response.body.data.id);

    expect(response.body.data.status).toBe('pendente');
  });

  it('deve listar pendentes somente com chave', async () => {
    const pendente = await request(app).post('/api/pontos').send({ ...dadosBase, nome: 'Para Revisao' });
    idsCriados.push(pendente.body.data.id);

    const semChave = await request(app).get('/api/pontos/pendentes');
    const comChave = await request(app).get('/api/pontos/pendentes').set('X-API-Key', config.apiKey);

    expect(semChave.status).toBe(401);
    expect(comChave.status).toBe(200);
    expect(comChave.body.data.some((p) => p.id === pendente.body.data.id)).toBe(true);
  });

  it('deve aprovar um ponto pendente com chave, tornando-o público', async () => {
    const pendente = await request(app).post('/api/pontos').send({ ...dadosBase, cidade: CIDADE, nome: 'Vai Ser Aprovado' });
    const id = pendente.body.data.id;
    idsCriados.push(id);

    const semChave = await request(app).patch(`/api/pontos/${id}/aprovar`);
    const aprovacao = await request(app).patch(`/api/pontos/${id}/aprovar`).set('X-API-Key', config.apiKey);
    const lista = await request(app).get('/api/pontos').query({ cidade: CIDADE });

    expect(semChave.status).toBe(401);
    expect(aprovacao.status).toBe(200);
    expect(aprovacao.body.data.status).toBe('aprovado');
    expect(lista.body.data.some((p) => p.id === id)).toBe(true);
  });

  it('deve recusar aprovação de ponto inexistente', async () => {
    const response = await request(app).patch('/api/pontos/999999/aprovar').set('X-API-Key', config.apiKey);

    expect(response.status).toBe(404);
  });

  it('deve recusar qualquer escrita quando a chave não está configurada', async () => {
    const chaveOriginal = config.apiKey;

    config.apiKey = '';

    try {
      const response = await request(app)
        .post('/api/pontos')
        .set('X-API-Key', '')
        .send(dadosBase);

      expect(response.status).toBe(401);
    } finally {
      config.apiKey = chaveOriginal;
    }
  });
});

describe('Formato de materiais na API', () => {
  it('deve listar materiais como array de objetos, igual ao endpoint por ID', async () => {
    const ponto = await criarPonto({ materiais: [MATERIAL.slug] });

    const lista = await request(app).get('/api/pontos').query({ cidade: CIDADE });
    const doLista = lista.body.data.find((p) => p.id === ponto.id);

    const porId = await request(app).get(`/api/pontos/${ponto.id}`);

    expect(doLista.materiais).toEqual([{ id: expect.any(Number), nome: MATERIAL.nome, slug: MATERIAL.slug }]);
    expect(doLista.materiais).toEqual(porId.body.data.materiais);
  });

  it('deve listar pontos sem materiais com array vazio', async () => {
    const ponto = await criarPonto({});

    const lista = await request(app).get('/api/pontos').query({ cidade: CIDADE });

    expect(lista.body.data.find((p) => p.id === ponto.id).materiais).toEqual([]);
  });
});

describe('Atualização de materiais', () => {
  it('deve manter os materiais quando o PUT não envia o campo materiais', async () => {
    const ponto = await criarPonto({ materiais: [MATERIAL.slug] });

    const response = await request(app)
      .put(`/api/pontos/${ponto.id}`)
      .set('X-API-Key', config.apiKey)
      .send({ ...dadosBase, nome: 'Ponto Correcao Editado' });

    expect(response.status).toBe(200);
    expect(response.body.data.materiais.map((m) => m.slug)).toEqual([MATERIAL.slug]);
  });

  it('deve substituir os materiais quando o PUT envia o campo materiais', async () => {
    const ponto = await criarPonto({ materiais: [MATERIAL.slug] });

    const response = await request(app)
      .put(`/api/pontos/${ponto.id}`)
      .set('X-API-Key', config.apiKey)
      .send({ ...dadosBase, materiais: [] });

    expect(response.status).toBe(200);
    expect(response.body.data.materiais).toEqual([]);
  });
});
