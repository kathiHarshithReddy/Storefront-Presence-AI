require("dotenv").config();
const { sendEmail } = require("./dist/server.cjs");
sendEmail("mock_1785085071525", "harshith.ise24@cmrit.ac.in").then(() => console.log("Success")).catch(console.error);
