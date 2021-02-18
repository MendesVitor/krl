const request = require("node-fetch");
const { bulk, exec, bulkOsCare, gravaErro } = require("../../controller");
const sql = require("mssql");
const conexao = require("../../config/connDB");
const url = "https://ing.care-br.com/ing_api.php";
// const url = "https://deving.care-br.com/ing_api.php";

const json = {
  user: "centercell",
  key: "$2a$98$MyY3MTk2NzIzNzU3MjIwM.vDy.uGKbTBZzauoWKFS0dvdi6YVA8AG",
  method: "Consulta_Pedido_Reenvio_Troca",
  request: {
    periodo: {
      data_inicio: "",
      data_final: "",
    },
  },
};

const limpar = () =>
  `
truncate table xpc_osIntegracaoCare
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
and
a.idStatus in
(
429,
434,
247,
395
)

`;

const insertControleWs = (osCare, idStatusSend) =>
  `
INSERT INTO 
xpc_controleEnvioWs
(
  osCare,
  idStatusSend
) 
VALUES (
  '${osCare}',
  ${idStatusSend}
)
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

const insertCabec = (osCare, idOpv, objeto, idProcesso) =>
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
	getdate()
)

select scope_identity() as idCabec

`;

const insertItens = (idCabec, idModelo) =>
  `
INSERT INTO 
xpc_ControleRecebimentoIngItens
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

const valida = (ped) => osS.includes(ped.OS_WS);

const iniciar = async () => {
  console.log("* Consultando pedidos de Troca e Devolução *");

  await getPedidos(json);

  if (erro == true) {
    console.log("Falha ao receber extravio. Consulte os erros!");
    return false;
  }

  return true;
};

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
    console.log("* Não existe(m) pedido(s) para recebermos *");
    await gravaErro("", data, dados.mensagem);
    return false;
  } else {
    console.log("* Total de Pedidos: " + dados.pedidos.length);

    await exec(limpar());

    await bulkOsCare(dados);

    // return false;

    console.log("* Analisando novos Pedidos. Por favor, aguarde...");

    listaOS = await exec(getOss());

    osS = listaOS.recordset.map(({ osCare }) => osCare);

    dados.pedidos = dados.pedidos.filter(valida);

    if (osS.length > 0) {
      console.log("* Total Real de Pedidos: " + dados.pedidos.length);
      await bulk(dados);

      for (const j of dados.pedidos) {
        // idStatus = "";

        // if (
        //   j["REQUEST_TYPE_ID"] == "5" ||
        //   j["REQUEST_TYPE_ID"] == "6" ||
        //   j["REQUEST_TYPE_ID"] == "7" ||
        //   j["REQUEST_TYPE_ID"] == "8" ||
        //   j["REQUEST_TYPE_ID"] == "14"
        // ) {
        //   // idStatus = 281;
        //   await exec(insertControleWs(j["OS_WS"], 281));
        // } else if (j["REQUEST_TYPE_ID"] == "14") {
        //   // idStatus = 394;
        //   await exec(insertControleWs(j["OS_WS"], 394));
        // }

        // if (j["REQUEST_TYPE_ID"] !== "15" && j["REQUEST_TYPE_ID"] !== "13") {
        //   // console.log(j["REQUEST_TYPE_ID"]);
        //   await exec(insertControleWs(j["OS_WS"], idStatus));
        // }

        let objeto = j["POSTAL_TRACKING_NUMBER"];

        // objeto = "teste";

        if (j["REQUEST_TYPE_ID"] == "15" || j["REQUEST_TYPE_ID"] == "13") {
          // console.log(`Devolução: ${j["REQUEST_TYPE_ID"]}`);
          let modelo = j["PRODUTO_CODIGO"].trim();

          if (modelo == "") {
            console.log("MODELO VAZIO!");
            continue;
          } else {
            let osCare = j["OS_WS"];
            let serial = j["PRODUTO_SERIAL"];

            let idOpv = "";
            let idModelo = "";
            // let dtNf = "";
            let idProcesso = "47";

            const getIdOpv = `
            select top 1
            *
            from
            xpc_deParaClienteVd
            where
            xpc_deParaClienteVd.businessCostumerId = ${j["BUSINESS_CUSTOMER_ID"]}
            and
            xpc_deParaClienteVd.ativo = 1
            order by xpc_deParaClienteVd.idCadastro desc
          `;

            let dt = await exec(getIdOpv);

            if (dt.rowsAffected > 0) {
              idOpv = dt.recordset[0]["idClienteOpv"];
            } else {
              console.log("Cliente não encontrado!");
              await gravaErro(osCare, j, "Cliente não encontrado no XPCELL!");
              continue;
            }

            // const getModelo = `
            //             select top 1
            //             a.idModelo
            //             from
            //             xpc_modelosMulti a
            //             where
            //             a.modelo = '${modelo}'
            //             and
            //             a.ativo = 1
            //             order by a.idModelo desc
            //         `;

            const getModelo = `
            select
            b.modelo as modeloIntegracao,
            c.modelo as modeloXpcell,
            c.idModelo
            from
            xpc_vincModeloDexParaIng a
            join xpc_cadModelosIngenico b on a.idModeloIng = b.idCadastro
            join xpc_modelosMulti c on a.idModelo = c.idModelo
            where
            b.modelo = '${modelo}'
            and
            a.ativo = 1
            `;

            let dds = await exec(getModelo);

            if (dds.rowsAffected > 0) {
              idModelo = dds.recordset[0]["idModelo"];
            } else {
              console.log("Modelo não encontrado!");
              await gravaErro(osCare, j, "Modelo não encontrado no XPCELL!");
              continue;
            }

            await processar(
              osCare,
              objeto,
              serial,
              idOpv,
              idModelo,
              idProcesso
            );

            // return true;
          }
        } else {
          continue;
        }
      }
    } else {
      console.log("* Não existe(m) pedido(s) para recebermos *");
      return false;
    }
  }
};

const processar = async (
  osCare,
  objeto,
  serial,
  idOpv,
  idModelo,
  idProcesso
) => {
  // console.log(`OsCare: ${osCare}`);
  console.log(`Objeto: ${objeto}`);
  // console.log(`Serial: ${serial}`);
  // console.log(`idOpv: ${idOpv}`);
  // console.log(`idModelo: ${idModelo}`);
  // console.log(`idProcesso: ${idProcesso}`);
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
              .query(insertCabec(osCare, idOpv, objeto, idProcesso))
              .then((e) => {
                if (e.recordset != undefined) {
                  idCabec = e.recordset[0]["idCabec"];
                }
              });
            await request.query(insertItens(idCabec, idModelo));
            await request.query(
              insertLog(idCabec, "8", "NF Recebida por integração")
            );

            transacao.commit(() => {
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
