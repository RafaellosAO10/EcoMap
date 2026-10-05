const { body, param, validationResult } = require("express-validator");

const { materialExiste } = require("../models/pontoModel");

const criarPontoValidation = [
  body("nome")
    .trim()
    .notEmpty()
    .withMessage("O nome é obrigatório."),

  body("endereco")
    .trim()
    .notEmpty()
    .withMessage("O endereço é obrigatório."),

  body("numero")
    .optional({ values: "falsy" })
    .trim(),

  body("bairro")
    .optional({ values: "falsy" })
    .trim(),

  body("cidade")
    .trim()
    .notEmpty()
    .withMessage("A cidade é obrigatória."),

  body("estado")
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 2 })
    .withMessage("O estado deve possuir 2 caracteres."),

  body("cep")
    .optional({ values: "falsy" })
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage("O CEP deve possuir um formato válido."),

  body("telefone")
    .optional({ values: "falsy" })
    .trim(),

  body("horario_funcionamento")
    .optional({ values: "falsy" })
    .trim(),

  body("latitude")
    .optional({ values: "falsy" })
    .isFloat({ min: -90, max: 90 })
    .withMessage("A latitude deve estar entre -90 e 90."),

  body("longitude")
    .optional({ values: "falsy" })
    .isFloat({ min: -180, max: 180 })
    .withMessage("A longitude deve estar entre -180 e 180."),

  body("descricao")
    .optional({ values: "falsy" })
    .trim(),

  body("materiais")
    .optional()
    .isArray()
    .withMessage("Materiais deve ser um array."),

  body("materiais.*")
    .isString()
    .custom(async (slug) => {
      if (!materialExiste(slug)) {
        throw new Error("Material não encontrado.");
      }
    }),
];

const idValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("O ID deve ser um número inteiro positivo."),
];

function validarResultado(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos.",
      errors: errors.array().map((error) => ({
        campo: error.path,
        mensagem: error.msg,
      })),
    });
  }

  next();
}

module.exports = {
  criarPontoValidation,
  idValidation,
  validarResultado,
};