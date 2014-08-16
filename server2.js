var express = require('express');
_ = require("underscore");
fs = require("fs");
var bodyParser = require('body-parser');
var path = require("path");
var https = require('https');
var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.cer', 'utf8');
var getDataFunction = require("./getData");


var app = express();
app.use(bodyParser.urlencoded({ extended:false }));
app.use(express.static(__dirname + '/app'));
app.use('/node_modules', express.static(path.join(__dirname, "node_modules")));


app.get('/', function(request, response) {
    response.render("index");
});

app.get("/getData", function(request, response){
    getDataFunction(function(err, data) {
        if(err) throw err;
        response.json(data);
    });
});

var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);
console.log("App listening on https://localhost:3000/");
httpsServer.listen(3000);