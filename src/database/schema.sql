PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pontos_reciclagem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    endereco TEXT NOT NULL,
    numero TEXT,
    bairro TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT,
    telefone TEXT,
    horario_funcionamento TEXT,
    latitude REAL,
    longitude REAL,
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'aprovado' CHECK (status IN ('pendente', 'aprovado')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS materiais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ponto_materiais (
    ponto_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,

    PRIMARY KEY (ponto_id, material_id),

    FOREIGN KEY (ponto_id)
        REFERENCES pontos_reciclagem(id)
        ON DELETE CASCADE,

    FOREIGN KEY (material_id)
        REFERENCES materiais(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ponto_materiais_material_id
    ON ponto_materiais(material_id);
