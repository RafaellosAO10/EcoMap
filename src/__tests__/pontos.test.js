const request = require('supertest');
const app = require('../app');
const db = require('../database/connection');
const config = require('../config/env');

afterAll(async () => {
  if (db && typeof db.close === 'function') {
    await db.close();
  }
});

describe('API de Pontos - /api/pontos', () => {
  let createdPontoId;

  it('deve listar todos os pontos (GET /api/pontos)', async () => {
    const response = await request(app).get('/api/pontos');
    
    expect(response.status).toBe(200);
    // Ajuste conforme o formato real do seu JSON (ex: response.body.data ou response.body.pontos)
    const dados = Array.isArray(response.body) ? response.body : (response.body.data || response.body.pontos || []);
    expect(Array.isArray(dados)).toBe(true);
  });

it('deve criar um novo ponto com sucesso (POST /api/pontos)', async () => {
    const novoPonto = {
      nome: 'Ponto de Coleta Teste',
      descricao: 'Local para descarte de plásticos e papéis',
      cep: '06700-000',
      endereco: 'Rua Exemplo',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Taboão da Serra',
      estado: 'SP',
      telefone: '(11) 99999-9999',
      horario_funcionamento: 'Segunda a Sexta, das 08h às 18h', // Adicionado campo faltante
      latitude: -23.6221,
      longitude: -46.7997,
      categoria: 'Reciclável'
    };

    const response = await request(app)
      .post('/api/pontos')
      .set('X-API-Key', config.apiKey)
      .send(novoPonto);

    expect(response.status).toBe(201);
    const pontoCriado = response.body.data || response.body;
    expect(pontoCriado).toHaveProperty('id');
    expect(pontoCriado.nome).toBe(novoPonto.nome);

    createdPontoId = pontoCriado.id;
  });

  it('deve retornar erro de validação ao enviar dados incompletos (POST /api/pontos)', async () => {
    const pontoInvalido = {
      nome: 'Ponto Incompleto'
    };

    const response = await request(app)
      .post('/api/pontos')
      .set('X-API-Key', config.apiKey)
      .send(pontoInvalido);

    expect(response.status).toBe(400);
    // Valida com base na estrutura real retornada pelo validator
    expect(response.body).toHaveProperty('errors');
  });

  it('deve buscar um ponto específico por ID (GET /api/pontos/:id)', async () => {
    if (!createdPontoId) return;

    const response = await request(app).get(`/api/pontos/${createdPontoId}`);

    expect(response.status).toBe(200);
  });

  it('deve retornar 404 para um ponto inexistente (GET /api/pontos/:id)', async () => {
    const response = await request(app).get('/api/pontos/999999');

    expect(response.status).toBe(404);
  });

  it('deve atualizar um ponto com sucesso (PUT /api/pontos/:id)', async () => {
    if (!createdPontoId) return;

    const dadosAtualizados = {
      nome: 'Ponto de Coleta Atualizado',
      endereco: 'Rua Atualizada',
      numero: '456',
      bairro: 'Centro',
      cidade: 'Taboão da Serra',
      estado: 'SP',
      cep: '06700-000',
      telefone: '(11) 98888-8888',
      horario_funcionamento: 'Segunda a Sexta, das 08h às 18h',
      latitude: -23.6221,
      longitude: -46.7997,
      descricao: 'Ponto atualizado para teste'
    };

    const response = await request(app)
      .put(`/api/pontos/${createdPontoId}`)
      .set('X-API-Key', config.apiKey)
      .send(dadosAtualizados);

    expect(response.status).toBe(200);

    const pontoAtualizado = response.body.data || response.body;
    expect(pontoAtualizado.nome).toBe(dadosAtualizados.nome);
  });

  it('deve retornar 404 ao tentar atualizar um ponto inexistente (PUT /api/pontos/:id)', async () => {
    const dadosAtualizados = {
      nome: 'Ponto Inexistente',
      endereco: 'Rua Teste',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Taboão da Serra',
      estado: 'SP',
      cep: '06700-000',
      telefone: '(11) 99999-9999',
      horario_funcionamento: 'Segunda a Sexta',
      latitude: -23.6221,
      longitude: -46.7997,
      descricao: 'Teste'
    };

    const response = await request(app)
      .put('/api/pontos/999999')
      .set('X-API-Key', config.apiKey)
      .send(dadosAtualizados);

    expect(response.status).toBe(404);
  });

  it('deve excluir um ponto com sucesso (DELETE /api/pontos/:id)', async () => {
    if (!createdPontoId) return;

    const response = await request(app)
      .delete(`/api/pontos/${createdPontoId}`)
      .set('X-API-Key', config.apiKey);

    expect(response.status).toBe(200);
  });

  it('deve retornar 404 ao tentar excluir um ponto inexistente (DELETE /api/pontos/:id)', async () => {
    const response = await request(app)
      .delete('/api/pontos/999999')
      .set('X-API-Key', config.apiKey);

    expect(response.status).toBe(404);
  });
});