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
  isnull(a.serial,cabec.serial) as serial,
  cabec.businessCustomerId,
  nf.ChaveNF,
  cabec.requestTypeId,
  a.idStatusSend
  from
  xpc_controleEnvioWs a
  
  cross apply (
  
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
  
  outer apply (
  
  select top 1
  *
  from
  SCAR_IMAGENS.dbo.xpc_ChaveFotoNF nf
  where
  nf.idCabecAtendimentoVD = cabec.idCadastro
  order by nf.idCadastro desc
  
  )nf
  
  where
  a.idStatusSend in (387,389,511,514,504,515)
  and
  a.enviado = 0
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
  console.log("* Buscando Insert Equipment Received... *");

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
        // console.log(client.InsertEquipmentReceived);
        for (const x of data.recordset) {
          await client
            .InsertEquipmentReceivedAsync({
              auth: {
                user: "techcenter",
                password: "Zs_@Q72a_3zZk",
              },
              Equipment: {
                request_number: x.pedidoVenda,
                business_customer_id: x.businessCustomerId,
                serialNumber: x.serial,
                statusId: x.idStatusSend,
                registerDate: now,
                customerInvoicekey: x.ChaveNF,
                reportFile: "",
              },
            })
            .then(async (result) => {
              // console.log(result[0]);
              if (result[0].InsertEquipmentReceivedResult.success == true) {
                await exec(updatePendenciaWs(x.idCadastro));
              } else {
                res = result[0].InsertEquipmentReceivedResult;
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
              console.log(`erro 5: ${err}`);
              return false;
            });
        }
      })
      .catch((err) => {
        console.log(`erro 6: ${err}`);
        return false;
      });
  }
};

module.exports = { iniciar };
