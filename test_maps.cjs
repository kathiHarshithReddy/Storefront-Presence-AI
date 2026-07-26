const { Client } = require("@googlemaps/google-maps-services-js");
require("dotenv").config();
const maps = new Client({});
maps.textSearch({
  params: {
    query: "Roofers in Bengaluru",
    key: process.env.GOOGLE_MAPS_API_KEY
  }
}).then(console.log).catch(e => console.error(e.response ? e.response.data : e.message));
