const soap = require("soap");
const moment = require("moment");
const fs = require("fs");
const req = require("node-fetch");
const { exec } = require("../../controller");

// const url =
//   "https://ecommerce-homolog.ingenico.com.br:8449/SalesRepairCenter/Services/SalesOrder.asmx?wsdl";

const url = "http://10.8.108.228:8446/Sales/Services/SalesOrder.asmx?wsdl";

const atualizaDadosAtivacao = (
  pedido,
  asset,
  rnId,
  establishmentCode,
  simCardOperatorId
) =>
  `
update
xpc_cabecAtendimentoVD
set
xpc_cabecAtendimentoVD.assetNumber = '${asset}',
xpc_cabecAtendimentoVD.rnIdCode = '${rnId}',
xpc_cabecAtendimentoVD.establishmentCode = '${establishmentCode}',
xpc_cabecAtendimentoVD.simCardOperatorId = '${simCardOperatorId}'
from
xpc_cabecAtendimentoVD
where
xpc_cabecAtendimentoVD.pedidoVenda = '${pedido}'
and
xpc_cabecAtendimentoVD.ativo = 1
`;

const vincNf = (pedido, nf, serie, dtNf, chave) =>
  `
set dateformat dmY

update
xpc_cabecAtendimentoVD
set
xpc_cabecAtendimentoVD.nf4 = ${nf},
xpc_cabecAtendimentoVD.serieNf4 = '${serie}',
xpc_cabecAtendimentoVD.dtNf4 = '${dtNf}',
xpc_cabecAtendimentoVD.chaveNF4 = '${chave}'
from
xpc_cabecAtendimentoVD
where
xpc_cabecAtendimentoVD.pedidoVenda = '${pedido}'
and
xpc_cabecAtendimentoVD.ativo = 1
`;
const getPendenciaNf = () =>
  `
  select
  a.osCare,
  a.pedidoVenda,
  a.businessCustomerId,
  a.assetNumber,
  nf1.idNf1,
  a.idstatus
  from
  xpc_cabecAtendimentoVD a
      
  outer apply (
      
    select top 1
    xpc_ControleRecebimentoIngCabec.idCadastro as idNf1,
    nf2.idCadastro as idNF2
    from
    xpc_ControleRecebimentoIngCabec 
    outer apply (
    
    select top 1
    xpc_ControleRecebimentoIngStatusLog.idCadastro
    from
    xpc_ControleRecebimentoIngStatusLog
    where
    xpc_ControleRecebimentoIngStatusLog.idCabec = xpc_ControleRecebimentoIngCabec.idCadastro
    and
    xpc_ControleRecebimentoIngStatusLog.idTipoStatus = 10
    order by xpc_ControleRecebimentoIngStatusLog.idCadastro desc
    
    )nf2

    where
    xpc_ControleRecebimentoIngCabec.numNF = a.osCare
    and
    xpc_ControleRecebimentoIngCabec.ativo = 1
    and
    xpc_ControleRecebimentoIngCabec.idTipoStatus not in (7,11)
    and
    xpc_ControleRecebimentoIngCabec.idTipoProcesso in (47)
    order by xpc_ControleRecebimentoIngCabec.idCadastro desc
        
    )nf1
      
  where
  a.ativo = 1
  and
  a.businessCustomerId is not null
  and
  nf1.idNF2 is null
  and
  a.nf4 is null

  order by a.dtChamado asc
`;

const vincNfEntrada = (pedido, nf, serie, dtNf) =>
  `
set dateformat dmY

update
xpc_cabecAtendimentoVD
set
xpc_cabecAtendimentoVD.nf1 = ${nf},
xpc_cabecAtendimentoVD.serieNf1 = '${serie}',
xpc_cabecAtendimentoVD.dtNf1 = '${dtNf}'
from
xpc_cabecAtendimentoVD
where
xpc_cabecAtendimentoVD.pedidoVenda = '${pedido}'
and
xpc_cabecAtendimentoVD.ativo = 1
`;

const vincNfIng = (idCabec, nota) =>
  `
INSERT INTO xpc_ControleRecebimentoIngStatusLog
(
idCabec,
idTipoStatus,
[user],
obsStatus,
obs
) VALUES (
${idCabec},
'10',
'Integração TI',
'NF: ${nota}',
'NF2 recebida via integração'
)
`;

const atualizaStatus = (idCabec) =>
  `
update
xpc_ControleRecebimentoIngCabec
set
xpc_ControleRecebimentoIngCabec.idTipoStatus = 5
from
xpc_ControleRecebimentoIngCabec
where
xpc_ControleRecebimentoIngCabec.idCadastro = ${idCabec}
`;

const iniciar = async () => {
  console.log("* Buscando NFs... *");

  const data = await exec(getPendenciaNf());

  if (data.recordset.length == 0) {
    console.log("* Não existem pendências de NF2/NF4 *");
  } else {
    console.log(`* Total de chamados pendentes: ${data.recordset.length}`);

    moment.locale();

    await soap
      .createClientAsync(url)
      .then(async (client) => {
        for (const x of data.recordset) {
          await client
            .ListRequestAsync({
              auth: {
                user: "techcenter",
                password: "Zs_@Q72a_3zZk",
              },
              parametro: {
                request_number: x.pedidoVenda,
                business_customer_id: x.businessCustomerId,
                StatusId: "",
                start_request_date: "",
                end_request_date: "",
              },
            })
            .then(async (result) => {
              // console.log(result[0].ListRequestResult.RequestList[0]);
              // console.dir(
              //   result[0].ListRequestResult.RequestList[0].Request[0]
              //     .activation_list[0]
              // );

              // console.log(
              //   result[0].ListRequestResult.RequestList[0].Request[0]
              //     .request_number
              // );

              // console.dir(result[0].ListRequestResult.RequestList[0]);

              // console.log(client.lastRequest);

              // return false;

              let success = false;

              success = result[0].ListRequestResult.RequestList[0]["success"];

              // console.log(object);

              if (success !== false) {
                // if (
                //   result[0].ListRequestResult.RequestList[0].Request[0]
                //     .RequestInvoices.RequestInvoice[0] !== null
                // ) {
                // console.log(
                //   result[0].ListRequestResult.RequestList[0].Request[0]
                //     .request_number
                // );
                // console.dir(
                //   result[0].ListRequestResult.RequestList[0].Request[0]
                //     .RequestInvoices.RequestInvoice
                // );

                // return false;
                let dadosNf =
                  result[0].ListRequestResult.RequestList[0].Request[0]
                    .RequestInvoices.RequestInvoice;

                let assetNumber =
                  result[0].ListRequestResult.RequestList[0].Request[0]
                    .activation_list[0].asset_number;
                let rnIdCode =
                  result[0].ListRequestResult.RequestList[0].Request[0]
                    .activation_list[0].rn_id;
                let establishmentCode =
                  result[0].ListRequestResult.RequestList[0].Request[0]
                    .activation_list[0].establishment_code;
                let simCardOperatorId =
                  result[0].ListRequestResult.RequestList[0].Request[0]
                    .activation_list[0].sim_operator_id;

                for (const el of dadosNf) {
                  // console.log(el);

                  // continue;

                  // return false

                  // dadosNf.map(async (el) => {
                  let tipoNf = "";

                  let pedido = "";

                  let nota = 0;

                  let dtNota = "";

                  nota = el.InvoiceNumber;

                  if (nota <= 23) {
                    continue;
                  }

                  tipoNf = el.InvoiceType;

                  if (tipoNf == 1 || tipoNf == 4 || tipoNf == 6) {
                    let pasta = "\\\\192.168.0.12\\CenterCell\\Ingenico\\NF4\\";

                    pedido =
                      result[0].ListRequestResult.RequestList[0].Request[0]
                        .request_number;

                    dtNota = el.InvoiceDate;

                    let dtFormatada = moment(dtNota).format("DD/MM/YYYY");

                    let ano = dtFormatada.substring(6, 10);
                    let mes = dtFormatada.substring(3, 5);
                    let dia = dtFormatada.substring(0, 2);

                    pasta += ano + "\\";
                    let pastaMes = pasta + mes + "\\";
                    let pastaDia = pastaMes + dia;

                    if (tipoNf == 4 || tipoNf == 6) {
                      if (nota == 0) {
                        console.log("NF4 zerada!");
                        continue;
                      }

                      if (fs.existsSync(pasta)) {
                        if (fs.existsSync(pastaMes)) {
                          if (fs.existsSync(pastaDia)) {
                          } else {
                            fs.mkdirSync(pastaDia);
                          }
                        } else {
                          fs.mkdirSync(pastaMes);
                        }
                      } else {
                        fs.mkdirSync(pasta);
                      }

                      //NF4 e Romaneio
                      let linkPdf = el.InvoiceLink;

                      let serie = 0;

                      let chaveNf = "";

                      let arquivo = "";

                      if (tipoNf == 4) {
                        chaveNf = el.Invoicekey;
                        serie = el.Invoicekey.substring(22, 25);
                        arquivo = `${pastaMes}\\${dia}\\${chaveNf}.pdf`;
                      } else {
                        arquivo = `${pastaMes}\\${dia}\\${nota}.pdf`;
                      }

                      const file = await req(linkPdf, { method: "get" });
                      let buffer = await file.buffer();
                      fs.writeFileSync(arquivo, buffer);

                      if (tipoNf == 4) {
                        await exec(
                          vincNf(pedido, nota, serie, dtFormatada, chaveNf)
                        );
                      } else if (tipoNf == 6) {
                        await exec(
                          vincNf(pedido, nota, serie, dtFormatada, nota)
                        );
                      }
                    } else if (tipoNf == 1) {
                      let serie = 0;
                      serie = el.Invoicekey.substring(22, 25);
                      await exec(
                        vincNfEntrada(pedido, nota, serie, dtFormatada)
                      );
                    }
                  } else if (tipoNf == 2) {
                    if (x.idNf1 !== null) {
                      await exec(vincNfIng(x.idNf1, nota));
                      await exec(atualizaStatus(x.idNf1));
                    }
                  }
                }

                if (x.assetNumber == "") {
                  if (
                    assetNumber !== undefined &&
                    rnIdCode !== undefined &&
                    establishmentCode !== undefined
                  ) {
                    await exec(
                      atualizaDadosAtivacao(
                        x.pedidoVenda,
                        assetNumber,
                        rnIdCode,
                        establishmentCode,
                        simCardOperatorId
                      )
                    );
                  }
                }
                // }
              }
              return true;
            })
            .catch((err) => {
              console.log(err);
              console.log("krl");
              return false;
            });
        }
      })
      .catch((err) => {
        console.log(err);
        console.log("cu");
        return false;
      });
  }
};

module.exports = { iniciar };
