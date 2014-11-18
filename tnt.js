var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var compression = require("compression");

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(compression());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/manga"));


port = 4000;

app.listen(port, function () {
  console.log("Third New Tokyo is running on port", port);
});

