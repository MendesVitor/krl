const request = require("node-fetch");
const { exec } = require("../../controller");
// const url = "https://deving.care-br.com/ing_api.php";
const url = "https://ing.care-br.com/ing_api.php";

const query = () =>
  `
select
a.idCadastro,
a.pedidoVenda,
a.objOut,
a.businessCustomerId,
a.transporte,
a.idstatus
from
xpc_cabecAtendimentoVD a
where
a.ativo = 1
and
a.nf4 is not null
and
a.objOut is not null
and
a.objEnviado = 0
and
upper(a.transporte) = 'CORREIOS'
and
a.businessCustomerId is not null

order by a.dtChamado asc
  
`;

const queryResposta = (id) =>
  `
update
    xpc_cabecAtendimentoVD
set
    objEnviado = 1
where 
    idCadastro = ${id}
`;

const iniciar = async () => {
  let res = await exec(query());

  for (const el of res.recordset) {
    await enviar(el);
  }
};
const enviar = async (obj) => {
  var json = {
    user: "centercell",
    key: "$2a$98$MyY3MTk2NzIzNzU3MjIwM.vDy.uGKbTBZzauoWKFS0dvdi6YVA8AG",
    method: "Atualiza_Eticket_Pedido",
    request: {
      Pedido: obj.pedidoVenda,
      Eticket: obj.objOut,
      BusinessCustomer: obj.businessCustomerId,
    },
  };

  //   console.log(json);

  const resposta = await request(url, {
    method: "post",
    body: JSON.stringify(json),
    headers: { "Content-Type": "application/json" },
    json: true,
  });

  const dados = await resposta.json();

  if (dados.retorno === "true") {
    await exec(queryResposta(obj.idCadastro));
  }
};

module.exports = { iniciar };
