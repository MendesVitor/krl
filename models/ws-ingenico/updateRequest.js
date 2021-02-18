const soap = require("soap");
const parser = require("xml2js");
const moment = require("moment");
const { exec, gravaErro } = require("../../controller");

// const url =
//   "https://ecommerce-homolog.ingenico.com.br:8449/SalesRepairCenter/Services/SalesOrder.asmx?wsdl";

const url = "http://10.8.108.228:8446/Sales/Services/SalesOrder.asmx?wsdl";

const getDadosEnvioWs = () =>
  `
select
cabec.idCadastro as idOsCare,
a.idCadastro,
a.osCare,
cabec.pedidoVenda,
a.serial,
cabec.businessCustomerId,
cabec.requestTypeId,
a.idStatusSend
from
xpc_controleEnvioWs a

outer apply (

select top 1
*
from
xpc_cabecAtendimentoVD
where
xpc_cabecAtendimentoVD.osCare = a.osCare
and
xpc_cabecAtendimentoVD.ativo = 1
order by xpc_cabecAtendimentoVD.idCadastro desc

)cabec

where
a.idStatusSend in (281,415,394,391,392,341)
and
a.enviado = 0
and
cabec.businessCustomerId is not null
and
a.ativo = 1
order by a.idCadastro
`;

const updatePendenciaWs = (id) =>
  `
update
xpc_controleEnvioWs
set
xpc_controleEnvioWs.enviado = 1,
xpc_controleEnvioWs.ativo = 0,
xpc_controleEnvioWs.dtEnviado = getdate()
from
xpc_controleEnvioWs
where
xpc_controleEnvioWs.idCadastro = ${id}
and
xpc_controleEnvioWs.enviado = 0
and
xpc_controleEnvioWs.ativo = 1

`;

const updateErro = (id, msg, xml, ativo) =>
  `
update
xpc_controleEnvioWs
set
xpc_controleEnvioWs.msgError = '${msg}',
xpc_controleEnvioWs.xmlEnvio = '${xml}',
xpc_controleEnvioWs.dtEnviado = getdate()
from
xpc_controleEnvioWs
where
xpc_controleEnvioWs.idCadastro = ${id}
and
xpc_controleEnvioWs.ativo = 1

`;

const iniciar = async () => {
  console.log("* Buscando updateRequest... *");

  let data = await exec(getDadosEnvioWs());

  if (data.recordset.length == 0) {
    console.log("* Não existem chamados para enviar ao webservice *");
  } else {
    console.log(`* Total de chamados pendentes: ${data.recordset.length}`);

    moment.locale();

    let now = moment().format("DD/MM/YYYY HH:mm:ss");

    await soap
      .createClientAsync(url)
      .then(async (client) => {
        for (const x of data.recordset) {
          await client
            .UpdateRequestAsync({
              auth: {
                user: "techcenter",
                password: "Zs_@Q72a_3zZk",
              },
              request: {
                is_lot: "0",
                request_number: x.pedidoVenda,
                status_id: x.idStatusSendddd,
                register_date: now,
                business_customer_id: x.businessCustomerId,
              },
            })
            .then(async (result) => {
              console.log(`dps do then xD`);
              if (result[0].UpdateRequestResult.success == true) {
                await exec(updatePendenciaWs(x.idCadastro));
              } else {
                res = result[0].UpdateRequestResult;
                if (res.code == 403) {
                  await exec(updateErro(x.idCadastro, res.code, null, 0));
                } else {
                  await exec(
                    updateErro(x.idCadastro, res.code, client.lastRequest, 1)
                  );
                }
              }
              return true;
            })
            .catch((err) => {
              console.log(`erro 1: ${err}`);
              return false;
            });
        }
      })
      .catch((err) => {
        console.log(`erro 2: ${err}`);
        return false;
      });
  }
};

module.exports = { iniciar };
