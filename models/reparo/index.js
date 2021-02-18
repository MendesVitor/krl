const sql = require("mssql");
const conexao = require("../../config/connDB");
const request = require("node-fetch");
const { exec, bulk, gravaErro, bulkOsCare } = require("../../controller");
const url = "https://ing.care-br.com/ing_api.php";
//const url = "https://deving.care-br.com/ing_api.php";

const json = {
  user: "centercell",
  key: "$2a$98$MyY3MTk2NzIzNzU3MjIwM.vDy.uGKbTBZzauoWKFS0dvdi6YVA8AG",
  method: "Consulta_Pedido",
  request: {
    Status: "5",
  },
};

const limpar = () =>
  `
truncate table xpc_osIntegracaoCare
`;

const getOs = (os) =>
  `
select top 1
xpc_cabecAtendimentoVD.osCare
from
xpc_cabecAtendimentoVD (nolock)
where
xpc_cabecAtendimentoVD.osCare = '${os}'
and
xpc_cabecAtendimentoVD.ativo = 1
order by xpc_cabecAtendimentoVD.idCadastro desc
`;

const getOss = () =>
  `

select
a.osCare
from
xpc_osIntegracaoCare a
left join xpc_cabecAtendimentoVD b on a.osCare = b.osCare
where
b.osCare is null

`;

const getOssRecebidas = () =>
  `
select distinct
a.osCare
from
xpc_osIntegracaoCare a
left join xpc_ControleRecebimentoIngCabec b on a.osCare = b.numNF
and b.idTipoProcesso in (47,48) and b.ativo = 1
where
b.numNF is not null

`;

const updateOS = () =>
  `
update
xpc_cabecAtendimentoVD
set
xpc_cabecAtendimentoVD.idStatus = 5
from
xpc_cabecAtendimentoVD
where
xpc_cabecAtendimentoVD.idStatus = 1
and
xpc_cabecAtendimentoVD.ativo = 1
`;

const insertSinalizacao = (serial, osCare, idOpv) =>
  `
INSERT INTO 
dbo.xpc_PreRecebimentoCIELO
(
    idUser,
    NumeroSerie,
    NotaFiscal,
    Defeitos,
    idTipoAtendimento,
    idParceiro,
    userHp
) 
VALUES (
    '199',
    '${serial}',
    '${osCare}',
    'N/A',
    '10',
    ${idOpv},
    'Integração'
)
`;

const insertCabec = (osCare, idOpv, objeto, dtNf, idProcesso) =>
  `
set dateformat dmY

INSERT INTO xpc_ControleRecebimentoIngCabec
(
	idTipoStatus,
	numNF,
	idClienteOPV,
	qtdTotal,
	idTipoProcesso,
	Objeto,
	dtNF1
) VALUES (
	1,
	'${osCare}',
	${idOpv},
	'1',
	${idProcesso},
	'${objeto}',
	'${dtNf}'
)

select scope_identity() as idCabec

`;

const insertItens = (idCabec, idModelo) =>
  `
INSERT INTO 
dbo.xpc_ControleRecebimentoIngItens
(
    idCabec,
    idModelo,
    qtdNFIng
) 
VALUES (
    ${idCabec},
    ${idModelo},
    '1'
)
`;
const insertLog = (idCabec, idStatus, obs) =>
  `
INSERT INTO xpc_ControleRecebimentoIngStatusLog
(
	idCabec,
	idTipoStatus,
	[user],
	obsStatus
) VALUES (
	${idCabec},
	${idStatus},
	'Integração TI',
	'${obs}'
)
`;

erro = false;

const iniciar = async () => {
  console.log("* Consultando pedidos abertos e postados *");

  await getPedidos(json);

  if (erro == true) {
    console.log("Falha ao receber pedidos. Consulte os erros!");
  } else {
    console.log("API OK");
  }
};

const valida = (ped) => osS.includes(ped.OS);

// const validaPostado = (ped) => ossPostadas.includes(ped.OS);

const getPedidos = async (json) => {
  const data = JSON.stringify(json);

  const resposta = await request(url, {
    method: "post",
    rejectUnauthorized: false,
    body: data,
    headers: { "Content-Type": "application/json" },
  });

  const dados = await resposta.json();

  if (dados.retorno == "false") {
    erro = true;
    console.log("* Não existe(m) pedido(s) no STATUS 5.");
    await gravaErro("", data, dados.mensagem);
  } else {
    // console.log(dados.pedidos, { maxArrayLength: null });
    console.log("* Total de Chamados STATUS 5: " + dados.pedidos.length);

    // return false;

    await exec(limpar());

    await bulkOsCare(dados);

    console.log("* Analisando pedidos novos. Por favor, espere...");

    listaOS = await exec(getOss());

    osS = listaOS.recordset.map(({ osCare }) => osCare);

    dados.pedidos = dados.pedidos.filter(valida);

    console.log("* Total de Pedidos: " + dados.pedidos.length);

    if (dados.pedidos.length > 0) {
      await bulk(dados);

      await exec(updateOS());

      let dtNf = "";

      console.log(
        "* Analisando pedidos postados já recebidos. Por favor, espere..."
      );

      osOK = await exec(getOssRecebidas());

      ossPostadas = osOK.recordset.map(({ osCare }) => osCare);

      // dados.pedidos = dados.pedidos.filter(validaPostado)

      console.log("* Cadastrando pedidos postados *");

      for (const j of dados.pedidos) {
        console.log("OSCARE: " + j["OS"]);

        let objeto = j["ETICKET"].trim();

        let modelo = j["PRODUTO_CODIGO"].trim();

        if (objeto == "" || modelo == "") {
          console.log("MODELO OU OBJ VAZIO!");

          continue;
        } else {
          let osCare = j["OS"];
          let serial = j["PRODUTO_SERIAL"];

          let idOpv = "";
          let idModelo = "";
          let idProcesso = "48";

          if (j["CLIENTE"] == "GETNET") {
            idOpv = "706";
            // idProcesso = 48;
          } else if (j["CLIENTE"] == "STELO") {
            idOpv = "705";
            // idProcesso = 47;
          } else {
            await gravaErro(osCare, j, "Cliente OPV inválido!");
            continue;
          }

          const getModelo = `
                        select top 1
                        a.idModelo
                        from
                        xpc_modelosMulti a
                        where
                        a.modelo = '${modelo}'
                        and
                        a.ativo = 1
                        order by a.idModelo desc
                    `;

          let dds = await exec(getModelo);

          if (dds.rowsAffected > 0) {
            idModelo = dds.recordset[0]["idModelo"];
          } else {
            await gravaErro(osCare, j, "Modelo não encontrado no XPCELL!");
            continue;
          }

          await processar(
            osCare,
            objeto,
            serial,
            idOpv,
            dtNf,
            idModelo,
            idProcesso
          );
        }
      }
    } else {
      console.log("* Não existem pedidos novos para processar");
      erro = true;
      await gravaErro("", data, "Não existem novos chamados para recebermos!");
    }
  }
};

const processar = async (
  osCare,
  objeto,
  serial,
  idOpv,
  dtNf,
  idModelo,
  idProcesso
) => {
  return new Promise((res, rej) => {
    const pool = new sql.ConnectionPool(conexao.IngenicoProd);

    pool
      .connect()

      .then((a) => {
        const transacao = new sql.Transaction(pool);

        let idCabec = "";

        transacao.begin(async (e) => {
          if (e) {
            rej(e);
          }

          try {
            const request = new sql.Request(transacao);

            await request.query(insertSinalizacao(serial, osCare, idOpv));
            await request
              .query(insertCabec(osCare, idOpv, objeto, dtNf, idProcesso))
              .then((e) => {
                if (e.recordset != undefined) {
                  idCabec = e.recordset[0]["idCabec"];
                }
              });

            await request.query(insertItens(idCabec, idModelo));
            await request.query(
              insertLog(idCabec, "8", "NF Recebida por integração")
            );

            await transacao.commit(() => {
              res("Pedido Recebido com sucesso!");
            });
          } catch (er) {
            transacao.rollback((erro2) => {
              console.log(erro2 + er);
            });
          }
        });
      })

      .catch((erro) => {
        rej(erro);
      });
  });
};

module.exports = { iniciar };
