const db = require("../database/connection");
const { normalizarTexto, escaparLike } = require("../utils/texto");

// Campos que o validador aceita omitir. O better-sqlite3 exige todas as
// chaves dos parâmetros nomeados, então os ausentes viram NULL.
const CAMPOS_OPCIONAIS = [
  "numero",
  "bairro",
  "cep",
  "telefone",
  "horario_funcionamento",
  "latitude",
  "longitude",
  "descricao",
];

function normalizarDados(dados) {
  const normalizados = { ...dados };

  for (const campo of CAMPOS_OPCIONAIS) {
    if (normalizados[campo] === undefined || normalizados[campo] === "") {
      normalizados[campo] = null;
    }
  }

  return normalizados;
}

function listarTodos(filtros = {}) {
  let query = `
    SELECT p.*
    FROM pontos_reciclagem p
  `;

  const conditions = ["p.status = 'aprovado'"];
  const params = {};

  if (filtros.cidade) {
    conditions.push("LOWER(p.cidade) = LOWER(@cidade)");
    params.cidade = filtros.cidade;
  }

  // Busca livre: nome do ponto ou nome de um material aceito,
  // sem diferenciar maiúsculas de minúsculas nem acentos.
  const busca = normalizarTexto(filtros.busca);

  if (busca) {
    conditions.push(`
      (
        normalizar(p.nome) LIKE @busca ESCAPE '\\'
        OR EXISTS (
          SELECT 1
          FROM ponto_materiais pm3
          INNER JOIN materiais m3
            ON m3.id = pm3.material_id
          WHERE pm3.ponto_id = p.id
          AND normalizar(m3.nome) LIKE @busca ESCAPE '\\'
        )
      )
    `);

    params.busca = `%${escaparLike(busca)}%`;
  }

  if (filtros.material) {
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM ponto_materiais pm2
        INNER JOIN materiais m2
          ON m2.id = pm2.material_id
        WHERE pm2.ponto_id = p.id
        AND m2.slug = @material
      )
    `);

    params.material = filtros.material;
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += `
    ORDER BY p.nome ASC
  `;

  const pontos = db.prepare(query).all(params);

  return anexarMateriais(pontos);
}

function anexarMateriais(pontos) {
  if (pontos.length === 0) {
    return pontos;
  }

  const ids = pontos.map((ponto) => ponto.id);
  const linhas = db
    .prepare(`
      SELECT
        pm.ponto_id,
        m.id,
        m.nome,
        m.slug
      FROM ponto_materiais pm
      INNER JOIN materiais m
        ON m.id = pm.material_id
      WHERE pm.ponto_id IN (${ids.map(() => "?").join(", ")})
    `)
    .all(...ids);

  const porPonto = new Map();

  for (const { ponto_id, id, nome, slug } of linhas) {
    if (!porPonto.has(ponto_id)) {
      porPonto.set(ponto_id, []);
    }

    porPonto.get(ponto_id).push({ id, nome, slug });
  }

  return pontos.map((ponto) => ({
    ...ponto,
    materiais: (porPonto.get(ponto.id) || []).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    ),
  }));
}

function listarPendentes() {
  const pontos = db
    .prepare(`
      SELECT p.*
      FROM pontos_reciclagem p
      WHERE p.status = 'pendente'
      ORDER BY p.created_at ASC
    `)
    .all();

  return anexarMateriais(pontos);
}

function aprovar(id) {
  const resultado = db
    .prepare(`
      UPDATE pontos_reciclagem
      SET status = 'aprovado', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(id);

  if (resultado.changes === 0) {
    return null;
  }

  return buscarPorId(id);
}

function materialExiste(slug) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM materiais WHERE slug = ?")
      .get(slug)
  );
}

function listarMateriais() {
  const materiais = db
    .prepare(`
      SELECT
        m.id,
        m.nome,
        m.slug,
        COUNT(pm.ponto_id) AS total_pontos
      FROM materiais m
      LEFT JOIN ponto_materiais pm
        ON pm.material_id = m.id
      GROUP BY m.id
    `)
    .all();

  // O SQLite ordena por byte, o que joga nomes acentuados
  // (ex.: "Óleo de cozinha") para o fim da lista.
  return materiais.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function buscarPorId(id) {
  const ponto = db
    .prepare(`
      SELECT *
      FROM pontos_reciclagem
      WHERE id = ?
    `)
    .get(id);

  if (!ponto) {
    return null;
  }

  const materiais = db
    .prepare(`
      SELECT
        m.id,
        m.nome,
        m.slug
      FROM materiais m
      INNER JOIN ponto_materiais pm
        ON pm.material_id = m.id
      WHERE pm.ponto_id = ?
      ORDER BY m.nome
    `)
    .all(id);

  return {
    ...ponto,
    materiais,
  };
}

function criar(dados, status) {
  const insert = db.prepare(`
    INSERT INTO pontos_reciclagem (
      nome,
      endereco,
      numero,
      bairro,
      cidade,
      estado,
      cep,
      telefone,
      horario_funcionamento,
      latitude,
      longitude,
      descricao,
      status
    )
    VALUES (
      @nome,
      @endereco,
      @numero,
      @bairro,
      @cidade,
      @estado,
      @cep,
      @telefone,
      @horario_funcionamento,
      @latitude,
      @longitude,
      @descricao,
      @status
    )
  `);

  return db.transaction(() => {
    const resultado = insert.run({ ...normalizarDados(dados), status });

    associarMateriais(resultado.lastInsertRowid, dados.materiais || []);

    return buscarPorId(resultado.lastInsertRowid);
  })();
}

function atualizar(id, dados) {
  const update = db.prepare(`
    UPDATE pontos_reciclagem
    SET
      nome = @nome,
      endereco = @endereco,
      numero = @numero,
      bairro = @bairro,
      cidade = @cidade,
      estado = @estado,
      cep = @cep,
      telefone = @telefone,
      horario_funcionamento = @horario_funcionamento,
      latitude = @latitude,
      longitude = @longitude,
      descricao = @descricao,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  return db.transaction(() => {
    const resultado = update.run({
      ...normalizarDados(dados),
      id,
    });

    if (resultado.changes === 0) {
      return null;
    }

    if (dados.materiais !== undefined) {
      db.prepare(`
        DELETE FROM ponto_materiais
        WHERE ponto_id = ?
      `).run(id);

      associarMateriais(id, dados.materiais);
    }

    return buscarPorId(id);
  })();
}

function excluir(id) {
  const resultado = db
    .prepare(`
      DELETE FROM pontos_reciclagem
      WHERE id = ?
    `)
    .run(id);

  return resultado.changes > 0;
}

function associarMateriais(pontoId, materiais) {
  const buscarMaterial = db.prepare(`
    SELECT id
    FROM materiais
    WHERE slug = ?
  `);

  const inserirRelacionamento = db.prepare(`
    INSERT OR IGNORE INTO ponto_materiais (
      ponto_id,
      material_id
    )
    VALUES (?, ?)
  `);

  for (const slug of materiais) {
    const material = buscarMaterial.get(slug);

    if (material) {
      inserirRelacionamento.run(pontoId, material.id);
    }
  }
}

module.exports = {
  listarTodos,
  listarPendentes,
  aprovar,
  materialExiste,
  listarMateriais,
  buscarPorId,
  criar,
  atualizar,
  excluir,
};
