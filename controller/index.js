const sql = require("mssql");

const conexao = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  connectionTimeout: 720000,
  requestTimeout: 720000,
  stream: true,
  pool: {
    max: 100,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const exec = (query) => {
  return new Promise((res, rej) => {
    new sql.ConnectionPool(conexao)
      .connect()

      .then((pool) => {
        res(pool.query(query));
      })
      .catch((er) => {
        console.log(er);
        rej(er);
      });
  });
};

const gravaErro = async (osCare = "", jsonErro, msgErro) => {
  const queryErro = `
      
      insert into xpc_logIntegracaoCare
      (
          osCare,
          enviado,
          erro
      )
      values
      (
          '${osCare}',
          '${JSON.stringify(jsonErro)}',
          '${JSON.stringify(msgErro)}'
      )
      `;

  await exec(queryErro);
};

const bulk = async (json) => {
  const tabela = new sql.Table("xpc_cabecAtendimentoVD");
  tabela.create = false;

  tabela.columns.add("osCare", sql.VarChar(30), { nullable: false });
  tabela.columns.add("pedidoVenda", sql.VarChar(30), { nullable: false });
  tabela.columns.add("businessCustomerId", sql.Int, { nullable: true });
  tabela.columns.add("requestTypeId", sql.Int, { nullable: true });
  tabela.columns.add("serial", sql.VarChar(30), { nullable: true });
  tabela.columns.add("produto", sql.VarChar(100), { nullable: false });
  tabela.columns.add("descProduto", sql.VarChar(500), { nullable: false });
  tabela.columns.add("dtChamado", sql.VarChar(20), { nullable: true });
  tabela.columns.add("clienteNome", sql.VarChar(1000), { nullable: false });
  tabela.columns.add("consumidorNome", sql.VarChar(1000), { nullable: false });
  tabela.columns.add("cgc", sql.VarChar(50), { nullable: false });
  tabela.columns.add("cep", sql.VarChar(10), { nullable: false });
  tabela.columns.add("endereco", sql.VarChar(500), { nullable: false });
  tabela.columns.add("numero", sql.VarChar(30), { nullable: false });
  tabela.columns.add("bairro", sql.VarChar(200), { nullable: false });
  tabela.columns.add("complemento", sql.VarChar(300), { nullable: true });
  tabela.columns.add("cidade", sql.VarChar(200), { nullable: false });
  tabela.columns.add("estado", sql.Char(2), { nullable: false });
  tabela.columns.add("clienteEmail", sql.VarChar(200), { nullable: true });
  tabela.columns.add("inscricaoEstadual", sql.VarChar(50), { nullable: true });
  tabela.columns.add("transporte", sql.VarChar(30), { nullable: true });
  tabela.columns.add("valor_nf1", sql.Numeric(19, 2), { nullable: true });
  tabela.columns.add("dtPostagem", sql.VarChar(20), { nullable: true });
  tabela.columns.add("objetoCorreio", sql.VarChar(13), { nullable: true });
  tabela.columns.add("idStatus", sql.Int, { nullable: false });
  tabela.columns.add("assetNumber", sql.VarChar(30), { nullable: true });
  tabela.columns.add("rnIdCode", sql.VarChar(50), { nullable: true });
  tabela.columns.add("establishmentCode", sql.VarChar(50), { nullable: true });
  tabela.columns.add("simCardOperatorId", sql.Int, { nullable: true });

  for (const dadosBulk of json.pedidos) {
    // if (
    //   dadosBulk["REQUEST_TYPE_ID"] == 13 ||
    //   dadosBulk["REQUEST_TYPE_ID"] == 15
    // ) {
    //   dadosBulk["STATUS"] = 1;
    // } else {
    //   dadosBulk["STATUS"];
    // }

    objetoPostagem = "";

    if (dadosBulk["ETICKET"] !== null) {
      objetoPostagem = dadosBulk["ETICKET"];
    } else {
      if (dadosBulk["POSTAL_TRACKING_NUMBER"] == "") {
        objetoPostagem = "";
      } else {
        objetoPostagem = dadosBulk["POSTAL_TRACKING_NUMBER"];
      }
    }

    // console.log(objetoPostagem);

    tabela.rows.add(
      dadosBulk["OS"] == null ? dadosBulk["OS_WS"] : dadosBulk["OS"],
      dadosBulk["PEDIDO"],
      dadosBulk["BUSINESS_CUSTOMER_ID"] == null
        ? null
        : dadosBulk["BUSINESS_CUSTOMER_ID"],
      dadosBulk["REQUEST_TYPE_ID"] == null
        ? null
        : dadosBulk["REQUEST_TYPE_ID"],
      dadosBulk["PRODUTO_SERIAL"] == "" ? null : dadosBulk["PRODUTO_SERIAL"],
      dadosBulk["PRODUTO_CODIGO"],
      dadosBulk["PRODUTO_DESC"],
      dadosBulk["DATA_OS"] == null
        ? dadosBulk["DATA_PEDIDO"]
        : dadosBulk["DATA_OS"],
      dadosBulk["CLIENTE"],
      dadosBulk["CONSUMIDOR_NOME"],
      dadosBulk["CONSUMIDOR_CPF"],
      dadosBulk["CONSUMIDOR_CEP"],
      dadosBulk["CONSUMIDOR_ENDERECO"],
      dadosBulk["CONSUMIDOR_NUMERO"],
      dadosBulk["CONSUMIDOR_BAIRRO"],
      dadosBulk["CONSUMIDOR_COMPLEMENTO"],
      dadosBulk["CONSUMIDOR_CIDADE"],
      dadosBulk["CONSUMIDOR_UF"],
      dadosBulk["CONSUMIDOR_EMAIL"],
      dadosBulk["STATE_REGISTRATION"] == null
        ? null
        : dadosBulk["STATE_REGISTRATION"],
      dadosBulk["TRANSPORTADORA"] == null ? null : dadosBulk["TRANSPORTADORA"],
      dadosBulk["VALOR_NF1"] == null ? null : dadosBulk["VALOR_NF1"],
      dadosBulk["DATA_POSTAGEM"] == null ? null : dadosBulk["DATA_POSTAGEM"],
      dadosBulk["ETICKET"] == null
        ? dadosBulk["POSTAL_TRACKING_NUMBER"]
        : dadosBulk["ETICKET"],
      dadosBulk["STATUS"],
      dadosBulk["ASSET_NUMBER"] == null ? null : dadosBulk["ASSET_NUMBER"],
      dadosBulk["RN_ID_CODE"] == null ? null : dadosBulk["RN_ID_CODE"],
      dadosBulk["ESTABLISHMENT_CODE"] == null
        ? null
        : dadosBulk["ESTABLISHMENT_CODE"],
      dadosBulk["SIM_CARD_OPERATOR_ID"] == null
        ? null
        : dadosBulk["SIM_CARD_OPERATOR_ID"]
    );
  }

  // console.log(tabela);

  await sql
    .connect(conexao)

    .then(async () => {
      const req = new sql.Request();
      await req
        .bulk(tabela)
        .then(() => console.log("* Pedidos recebidos!"))
        .catch((err) => {
          console.log("Erro ao processar BULK: " + err);
        });
    })
    .catch((err) => {
      console.log("Erro ao conectar no BD: " + err);
    });

  await sql.close();
};

const bulkOsCare = async (json) => {
  const tabela = new sql.Table("xpc_osIntegracaoCare");
  tabela.create = false;

  tabela.columns.add("osCare", sql.VarChar(30), { nullable: false });
  tabela.columns.add("idStatus", sql.Int, { nullable: true });

  for (const dadosBulk of json.pedidos) {
    tabela.rows.add(
      dadosBulk["OS"] == null ? dadosBulk["OS_WS"] : dadosBulk["OS"],
      dadosBulk["OS"] == null ? dadosBulk["STATUS"] : 1
    );
  }

  // console.log(tabela);

  // return false;

  await sql
    .connect(conexao)

    .then(async () => {
      const req = new sql.Request();
      await req
        .bulk(tabela)
        .then(() => console.log("* OS inseridas para análise! *"))
        .catch((err) => {
          console.log("Erro ao processar BULK: " + err);
        });
    })
    .catch((err) => {
      console.log("Erro ao conectar no BD: " + err);
    });

  await sql.close();
};

module.exports = {
  exec,
  gravaErro,
  bulk,
  bulkOsCare,
};
