const request = require("node-fetch");
const { exec, gravaErro } = require("../../controller");
const url = "https://ing.care-br.com/ing_api.php";

erro = false;

const query = (idStatus, recebido) =>
  `
set dateformat dmY;

select
*
from
(
select
*
from
dbo.fn_getDadosIntegracaoCare(${idStatus}) a
where
a.os_reparo is not null
and
a.recebidoCare = ${recebido}
${and}
)x

`;

const setFlag = (osCare, field) =>
  `
update
xpc_cabecAtendimentoVD
set
xpc_cabecAtendimentoVD.${field} = 1
from
xpc_cabecAtendimentoVD
where
xpc_cabecAtendimentoVD.osCare = '${osCare}'
and
xpc_cabecAtendimentoVD.ativo = 1
`;

const executar = async () => {
  and = "";

  console.log("* Iniciando atualização - Status 6 *");

  await atualizar("6");

  console.log("* Iniciando atualização - Status 7 *");

  and = "and a.nf4 is not null and a.enviadoPostado = 0";

  await atualizar("7");

  if (erro == true) {
    console.log("Falha ao atualizar pedidos. Consulte os erros!");
  } else {
    console.log("API OK - OSs atualizadas c/ sucesso!");
  }
};
const atualizar = async (idStatus) => {
  let recebido = "";
  let campo = "";

  if (idStatus == 6) {
    recebido = 0;
    campo = "recebidoCare";
  } else {
    recebido = 1;
    campo = "enviadoPostado";
  }

  let dds = await exec(query(idStatus, recebido));

  if (dds.rowsAffected > 0) {
    console.log(
      "Total de chamados para enviar no STATUS " +
        idStatus +
        ": " +
        dds.rowsAffected
    );

    var listaOS = dds.recordset;
  } else {
    console.log(
      "- Não existe(m) pedido(s) para atualizar no STATUS: " + idStatus + "!"
    );
    return false;
  }

  var json = {
    user: "centercell",
    key: "$2a$98$MyY3MTk2NzIzNzU3MjIwM.vDy.uGKbTBZzauoWKFS0dvdi6YVA8AG",
    method: "Atualiza_Pedido",
    request: {
      Status: idStatus,
      Pedido: listaOS,
    },
  };

  const resposta = await request(url, {
    method: "post",
    body: JSON.stringify(json),
    headers: { "Content-Type": "application/json" },
    json: true,
  });

  const dados = await resposta.json();

  for (const i of dados.pedidos) {
    if (i["retorno"] == "false") {
      await gravaErro(i["OSCARE"], i, i["mensagem"]);
      erro = true;
    } else {
      await exec(setFlag(i["OSCARE"], campo));
    }
  }
};

module.exports = { executar };
