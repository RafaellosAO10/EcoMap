const crypto = require("crypto");

const config = require("../config/env");

function chaveCoincide(recebida) {
  const esperada = Buffer.from(config.apiKey);
  const informada = Buffer.from(recebida);

  return (
    esperada.length === informada.length &&
    crypto.timingSafeEqual(esperada, informada)
  );
}

// "ausente": sem cabeçalho. "valida" e "invalida" consideram o valor informado.
// Sem ECOMAP_API_KEY configurada, qualquer chave informada é inválida.
function situacaoChaveApi(req) {
  const recebida = req.get("X-API-Key");

  if (recebida === undefined) {
    return "ausente";
  }

  if (!config.apiKey || !chaveCoincide(recebida)) {
    return "invalida";
  }

  return "valida";
}

function naoAutorizado(res) {
  return res.status(401).json({
    success: false,
    message: "Chave de API ausente ou inválida.",
  });
}

function exigirChaveApi(req, res, next) {
  if (situacaoChaveApi(req) !== "valida") {
    return naoAutorizado(res);
  }

  next();
}

// Permite envio anônimo, mas rejeita uma chave informada que esteja errada.
function exigirChaveSeInformada(req, res, next) {
  if (situacaoChaveApi(req) === "invalida") {
    return naoAutorizado(res);
  }

  next();
}

module.exports = {
  situacaoChaveApi,
  exigirChaveApi,
  exigirChaveSeInformada,
};
