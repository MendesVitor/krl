require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? "./.env.test" : "./.env",
});
const consulta = require("./models/reparo");
const atualizar = require("./models/atualizar-pedido");
const send = require("./models/email");
const pedidos = require("./models/pedidosrt");
const updateRequest = require("./models/ws-ingenico/updateRequest");
const sendSerialNumber = require("./models/ws-ingenico/sendSerialNumber");
const insertEquipReceived = require("./models/ws-ingenico/insertEquipReceived");
const sendNF3 = require("./models/ws-ingenico/sendNF3");
const getNfs = require("./models/ws-ingenico/listRequest");
const eticket = require("./models/eticket");

console.log(`Ambiente: ${process.env.NODE_ENV}`);

console.log(`Server: ${process.env.DB_SERVER}`);

const start = async () => {
  try {
    // await consulta.iniciar();
    // await atualizar.executar();
    // await send.iniciar();
    // await pedidos.iniciar();
    // await updateRequest.iniciar();
    // await sendSerialNumber.iniciar();
    // await insertEquipReceived.iniciar();
    // await sendNF3.iniciar();
    await getNfs.iniciar();
    // await eticket.iniciar();
    process.exit();
  } catch (error) {
    console.log(`Erro: ${error}`);
    process.exit();
  }
};

start();
