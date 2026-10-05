const express = require("express");

const pontosController = require("../controllers/pontosController");
const {
  exigirChaveApi,
  exigirChaveSeInformada,
} = require("../middlewares/exigirChaveApi");

const {
  criarPontoValidation,
  idValidation,
  validarResultado,
} = require("../validators/pontoValidator");

const router = express.Router();

router.get("/", pontosController.listar);

router.get("/pendentes", exigirChaveApi, pontosController.listarPendentes);

router.get(
  "/:id",
  idValidation,
  validarResultado,
  pontosController.buscarPorId
);

router.post(
  "/",
  exigirChaveSeInformada,
  criarPontoValidation,
  validarResultado,
  pontosController.criar
);

router.patch(
  "/:id/aprovar",
  exigirChaveApi,
  idValidation,
  validarResultado,
  pontosController.aprovar
);

router.put(
  "/:id",
  exigirChaveApi,
  [...idValidation, ...criarPontoValidation],
  validarResultado,
  pontosController.atualizar
);

router.delete(
  "/:id",
  exigirChaveApi,
  idValidation,
  validarResultado,
  pontosController.excluir
);

module.exports = router;
