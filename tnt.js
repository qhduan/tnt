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


function ListManga (path) {
  var all = [];
  var list = fs.readdirSync(path);
  
  list.forEach(function (mangaName) {
    var mangaRoot = path + "/" + mangaName;
    if (fs.statSync(mangaRoot).isDirectory() == false) return;
    var manga = {};
    fs.readdirSync(mangaRoot).forEach(function (volName) {
      if (fs.statSync(mangaRoot + "/" + volName).isDirectory() == false) return; 
      manga[volName] = [];
      fs.readdirSync(mangaRoot + "/" + volName).forEach(function (imageName) {
        if (imageName.match(/\.jpg|\.jpeg|\.png|\.gif|\.bmp/i)) manga[volName].push(imageName);
      });
    });
    fs.writeFileSync(mangaRoot + "/manga.json", JSON.stringify(manga, null, 4));
    all.push({
      name: mangaName,
      count: Object.keys(manga).length
    });
  });
  fs.writeFileSync(path + "/manga.json", JSON.stringify(all, null, 4));
  console.log("Manga json generated");
}

ListManga(__dirname + "/manga");

port = 4000;

app.listen(port, function () {
  console.log("Third New Tokyo is running on port", port);
});

