const request = require("node-fetch");
const { exec } = require("../../controller");
const moment = require("moment");

// const urlws =
//   "https://ecommerce-homolog.ingenico.com.br:8449/SalesRepairCenter/Services/SalesOrder.asmx?wsdl";

const urlws =
  "https://ecommerce.ingenico.com.br/EcommerceService.InvoiceImport/api/Invoice ";

const xml2js = require("xml2js");

const queryPendencia = () =>
  `
  select
  *
  from
  vw_pendenciaEnvioNF3 a
`;

const queryEnviado = (id) =>
  `
    update
        xpc_cabecAtendimentoVD
    set
        nf3Enviado = 1
    where
        idCadastro = ${id}
`;

const iniciar = async () => {
  let res = await exec(queryPendencia());

  for (const el of res.recordset) {
    await enviar(el);
  }
};
const enviar = async (obj) => {
  try {
    let url = `https://api.tiny.com.br/api2/nota.fiscal.obter.xml.php?token=${process.env.TOKEN_TINY}&id=${obj.idNotaTiny}`;
    const respostaTiny = await request(url, {
      method: "post",
    });
    let numeroProtocolo = "";
    const bufferTiny = await respostaTiny.buffer();
    const buffer = Buffer.from(bufferTiny).toString("base64");
    var parser = new xml2js.Parser();
    parser.parseString(bufferTiny, function (err, result) {
      numeroProtocolo =
        result.retorno.xml_nfe[0].nfeProc[0].protNFe[0].infProt[0].nProt[0];
    });
    var json = {
      user: "techcenter",
      password: "Zs_@Q72a_3zZk",
      invoiceNumber: obj.invoiceNumber,
      invoiceTypeID: obj.invoiceTypeid,
      businessCustomerID: obj.businessCustomerId,
      requestNumber: obj.requestNumber,
      invoiceSeries: obj.invoiceSeries,
      issueType: obj.issueType,
      randomInvoiceNumber: obj.randomInvoiceNumber,
      invoiceVerifyingDigit: obj.invoiceVerifyingDigit,
      invoiceKey: obj.invoiceKey,
      invoiceDate: moment(obj.invoiceDate).format("DD/MM/YYYY HH:mm:ss"),
      serialNumber: obj.serialNumber,
      partNumber: obj.partnumber,
      reportFile: obj.tipo === "GOOD" ? "" : obj.reporFile,
      invoiceXmlFile: buffer,
      statusID: obj.idStatus,
      protocolNumber: numeroProtocolo,
    };

    // console.log(json);

    let jsonString = JSON.stringify(json);
    const resposta = await request(urlws, {
      method: "post",
      body: jsonString,
      headers: { "Content-Type": "application/json" },
      json: true,
    });
    const dados = await resposta.json();
    // console.log(dados);
    if (dados.respCode === "00") {
      await exec(queryEnviado(obj.idCadastro));
    }
    return true;
  } catch (error) {
    // console.log(error);
    return false;
  }
};

module.exports = { iniciar };
