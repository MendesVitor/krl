require("dotenv").config({
  path: process.env.NODE_ENV === "test" ? "./.env.test" : "./.env",
});

// const schedule = require("node-schedule");

const getNfs = require("./models/ws-ingenico/listRequest");

console.log(`Ambiente: ${process.env.NODE_ENV}`);

console.log(`Server: ${process.env.DB_SERVER}`);

const listRequest = async () => {
  try {
    await getNfs.iniciar();
    console.log("* Rotina de NF Finalizada *");
    return true;
  } catch (error) {
    console.log(`Erro: ${error}`);
    return false;
  }
};

// const jobs = () => {
//   schedule.scheduleJob("*/30 * * * *", async () => {
//     console.clear();
//     console.log("* Rotina de NF iniciada *");
//     await listRequest();
//     console.log("* Rotina de NF Finalizada *");
//     return true;
//   });
// };

const start = async () => {
  console.clear();
  console.log("* Rotina de NF iniciada *");
  await listRequest();
  // return true;
  process.exit();
};

// jobs();

start();
