const pontoModel = require("../models/pontoModel");

function listarPontos(filtros) {
  return pontoModel.listarTodos(filtros);
}

function listarPendentes() {
  return pontoModel.listarPendentes();
}

function buscarPonto(id) {
  return pontoModel.buscarPorId(id);
}

function criarPonto(dados, status) {
  return pontoModel.criar(dados, status);
}

function atualizarPonto(id, dados) {
  return pontoModel.atualizar(id, dados);
}

function excluirPonto(id) {
  return pontoModel.excluir(id);
}

function aprovarPonto(id) {
  return pontoModel.aprovar(id);
}

module.exports = {
  listarPontos,
  listarPendentes,
  buscarPonto,
  criarPonto,
  atualizarPonto,
  excluirPonto,
  aprovarPonto,
};
