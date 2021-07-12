const express = require("express");
const app = express();
const port = 3000;
const lookup = require("./lookup");
let ejs = require("ejs");
console.log("done");
app.get("/s", async function(req, res) {
  var pfstart = new Date().getTime();
  var params = req.query;
  console.log(params);
  const dicts = await lookup.any(params["wd"]);
  var pfend = new Date().getTime();
  const dat = Object.assign(params, {
    dicts: dicts,
    performance: pfend - pfstart,
    siteurl: 'https://manchu-cake.glitch.me'
  });
  console.log(dat);
  console.log(`Time cost is ${dat.performance}ms`);
  ejs.renderFile("pages/result.html", params, {}, (err, str) => {
    if (err) console.log(err);
    res.send(str);
  });
  //res.sendFile(__dirname + "/pages/result.html");
});

app.use("/css", express.static("css"));

app.listen(port, () =>
  console.log(`Manchu Dict App listening at http://localhost:${port}`)
);
