function errorHandler(error, req, res, next) {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "O corpo da requisição não é um JSON válido.",
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Ocorreu um erro interno no servidor.",
  });
}

module.exports = errorHandler;
