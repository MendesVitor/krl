const email = require("nodemailer");
// const { google } = require("googleapis");
const { exec } = require("../../controller");
const excel = require("exceljs");
// const OAuth2 = google.auth.OAuth2;

let dt = new Date();
let dia = new Date().getDate();
let mes = new Date().getUTCMonth() + 1;
let ano = new Date().getFullYear();
let hora = dt.getHours();
let min = new Date().getMinutes();
let seg = new Date().getSeconds();

let data = dia + "\\" + mes + "\\" + ano;

const caminhoxlsx = `D:\\nodejs\\api\\xlsx\\Relatorio_${dia}_${mes}_${ano}_${hora}_${min}_${seg}.xlsx`;

const arqName = `Relatorio_${dia}_${mes}_${ano}_${hora}_${min}_${seg}.xlsx`;

var osCare = [];

const query = () =>
  `
set dateformat dmY;

select
*
from
(
select
*
from
dbo.fn_getDadosNF3(7)
)x

`;

const qryDanfe = () =>
  `
set dateformat dmY;

select
x.nomeArqDanfe as filename,
x.caminhoDanfe as path
from
(
select
*
from
dbo.fn_getDadosNF3Email()
)x

`;

const getDestinatarios = () =>
  `
select
*
from
(
select
dbo.fn_getDestinatarios() as email
)x
`;

const setFlagEmail = (osCare) =>
  `

update
xpc_cabecAtendimentoVD
set
xpc_cabecAtendimentoVD.emailEnviado = 1
from
xpc_cabecAtendimentoVD
where
xpc_cabecAtendimentoVD.osCare = '${osCare}'
and
xpc_cabecAtendimentoVD.ativo = 1
and
xpc_cabecAtendimentoVD.expedido = 1
and
xpc_cabecAtendimentoVD.emailEnviado = 0


`;

const iniciar = async () => {
  console.time();

  console.log("* INICIANDO ENVIO DE E-MAIL NF3 *");

  console.log("* Buscando NF3 pendentes *");

  let dds = await exec(query());

  console.log("* Total de NF3: " + dds.rowsAffected);

  if (dds.rowsAffected > 0) {
    let linhas = "";

    console.log("* Montando linhas da tabela * ");

    for (const dados of dds.recordset) {
      linhas =
        linhas +
        `<tr>
                <td>${dados["Cliente"]}</td>
                <td>${dados["grupoNF"]}</td>
                <td>${dados["Processo"]}</td>
                <td>${dados["OPV"]}</td>
                <td>${dados["NF3"]}</td>
                <td>${dados["qtdOs"]}</td>
                <td>${dados["objeto"]}</td>
                <td>${dados["NF4"]}</td>
            </tr>`;

      osCare.push(dados["osCare"]);
    }

    console.log("* Gerando relatório para o anexo *");

    let cell = Object.keys(dds.recordset[0]);

    let valores = [];

    dds.recordset.forEach((data) => {
      valores.push(Object.values(data));
    });

    await make_xlsx(cell, valores);

    console.log("* Arquivo OK *");

    console.log("* Enviando e-mail *");

    let ds = await exec(qryDanfe());

    let danfes = ds.recordset;

    let dest = await exec(getDestinatarios());

    let destinatarios = dest.recordset;

    await enviar(linhas, danfes, destinatarios);
  } else {
    console.log("Não existe(m) NF3 pendente(s)!");
    return false;
  }
};

const atualizar = async () => {
  const update = osCare.map((os) => exec(setFlagEmail(os)));
  return await Promise.all(update);
};

const enviar = async (ln, att, destinatarios) => {
  let a = [
    {
      filename: arqName,
      path: caminhoxlsx,
    },
  ];

  for (const teste of att) {
    a.push(teste);
  }

  // const oauth2Client = new OAuth2(
  //   "1015133689760-mthe18htvaht3nvi3moqti29usfo62dd.apps.googleusercontent.com",
  //   "_DzZqY0pg1b34u2qyNcvs1YU",
  //   "https://developers.google.com/oauthplayground"
  // );

  // oauth2Client.setCredentials({
  //   refresh_token:
  //     "1//04dZIil8b5v8KCgYIARAAGAQSNwF-L9IrEEh0adQ1yRxZU1cmOPM-pqNZakUzFENAaWSU6XZkX1rxXw8JrXXt1j8OIdHZSb6Tuss",
  // });

  // const accessToken = await oauth2Client.getAccessToken();

  // let rt = JSON.stringify(accessToken["res"]["data"]["refresh_token"]);
  // let at = JSON.stringify(accessToken["token"]);

  // console.log(rt);
  // console.log(at);

  send = email.createTransport({
    service: "gmail",
    auth: {
      // type: "OAuth2",
      user: "centercellsistema@centercell.com.br",
      pass: "=ABd4r<K",
      // clientId:
      //   "1015133689760-mthe18htvaht3nvi3moqti29usfo62dd.apps.googleusercontent.com",
      // clientSecret: "_DzZqY0pg1b34u2qyNcvs1YU",
      // refreshToken: rt,
      // accessToken: at,
    },
  });

  const options = {
    from: "centercellsistema@centercell.com.br",
    to: destinatarios[0]["email"],
    subject: `Expedição VENDA DIRETA - ${data}`,
    attachments: a,
    html: `
        <html>
            <body>Prezados, 
            <br><br>
            Segue planilha e nota(s) em anexo referente a triangulação fiscal.       
            <br><br>
                <style type='text/css'>
                    .tg  {border-collapse:collapse;border-spacing:0;}
                    .tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:black;}
                    .tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:black;}
                    .tg .tg-xgic{background-color:#fe0000;color:#ffffff;border-color:inherit;text-align:left;vertical-align:top}
                    .tg .tg-tr73{background-color:#fe0000;color:#ffffff;text-align:left;vertical-align:top}
                    .tg .tg-0lax{text-align:left;vertical-align:top}
                </style>
                <table class="tg">
                    <tr>\
                        <th class="tg-xgic">Cliente</th>
                        <th class="tg-xgic">Grupo NF</th>
                        <th class="tg-xgic">Processo</th>
                        <th class="tg-xgic">OPV</th>
                        <th class="tg-tr73">NF3</th>
                        <th class="tg-tr73">Qtd. OS</th>
                        <th class="tg-tr73">Objeto OUT</th>
                        <th class="tg-tr73">NF4</th>
                    </tr>
                    <tbody style="font-weight: bold">
                        ${ln}
                    </tbody>
                </table><br>
                Esta é uma mensagem automática gerada pelo Sistema e não deve ser respondida. <br> <br>
                Por favor, caso tenha alguma dúvida ou encontre alguma divergência, estamos disponíveis em nossos Canais de Atendimento.
            </body>
        </html>
        `,
  };

  console.log("* E-mail criado. Preparando envio... *");

  let retorno = await enviarEmail(options);

  console.log(retorno);

  console.log("* Atualizando osCare como e-mail enviado *");

  await atualizar();

  console.log("* NF3 enviadas com sucesso! *");

  return true;
};

const make_xlsx = (cabecalho, itens) => {
  let wb = new excel.Workbook();
  var opts = {
    dateFormat: "DD/MM/YYYY HH:mm:ss",
  };
  let ws = wb.addWorksheet("Relatorio");

  ws.addRow(cabecalho);

  ws.addRows(itens);

  wb.xlsx.writeFile(caminhoxlsx, opts);
};

const enviarEmail = async (opt) => {
  return new Promise((res, rej) => {
    send
      .sendMail(opt)

      .then((ok) => {
        send.close();
        res("* E-mail enviado com sucesso! *");
      })
      .catch(async (er) => {
        send.close();
        rej("* Falha ao enviar e-mail: " + er + " *");
      });
  });
};

module.exports = { iniciar };
