require("dotenv").config();
fetch("https://places.googleapis.com/v1/places:searchText", {
  method: "POST",
  headers: {
    "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    textQuery: "Roofers in Bengaluru"
  })
}).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
