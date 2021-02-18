const soap = require("soap");
const moment = require("moment");
const { exec, gravaErro } = require("../../controller");

// const url =
//   "https://ecommerce-homolog.ingenico.com.br:8449/SalesRepairCenter/Services/SalesOrder.asmx?wsdl";

const url = "http://10.8.108.228:8446/Sales/Services/SalesOrder.asmx?wsdl";

const getDadosEnvioWs = () =>
  `
  select
  *
  from
  vw_pendenciaSendSerialNumber a
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
xpc_controleEnvioWs.dtEnviado = getDate()
from
xpc_controleEnvioWs
where
xpc_controleEnvioWs.idCadastro = ${id}
and
xpc_controleEnvioWs.ativo = 1

`;

const iniciar = async () => {
  console.log("* Buscando sendSerialNumbers... *");

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
        //console.log(client.SendSerialNumberAsync);
        for (const x of data.recordset) {
          await client
            .SendSerialNumberAsync({
              auth: {
                user: "techcenter",
                password: "Zs_@Q72a_3zZk",
              },
              request: {
                request_number: x.pedidoVenda,
                business_customer_id: x.businessCustomerId,
                itens: {
                  part_number: x.produto,
                  serial_number: x.serial,
                  asset_number: x.assetNumber,
                  serial_chip: x.ccidOut,
                  serial_chip2: "",
                  register_date: now,
                  rn_id: x.rnIdCode,
                  establishment_code: x.establishmentCode,
                  sim_operator_id: x.simCardOperatorId,
                },
              },
            })
            .then(async (result) => {
              // console.log(result[0]);
              if (result[0].SendSerialNumberResult.success == true) {
                await exec(updatePendenciaWs(x.idCadastro));
              } else {
                res = result[0].SendSerialNumberResult;
                if (res.code == 403) {
                  await exec(updateErro(x.idCadastro, res.code, null, 1));
                } else {
                  await exec(
                    updateErro(x.idCadastro, res.code, client.lastRequest, 1)
                  );
                }
              }
              return true;
            })
            .catch((err) => {
              console.log(`erro 3: ${err}`);
              return false;
            });
        }
      })
      .catch((err) => {
        console.log(`erro 4: ${err}`);
        return false;
      });
  }
};

module.exports = { iniciar };
