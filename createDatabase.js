var fs = require('fs');

// load the database
var sql = require("sqlite3");
var db = new sql.Database("test.db");
db.serialize(startup);

function startup() {
    var fileJSON = fs.readFileSync('./data/results.json');
    fileJSON = JSON.parse(fileJSON);
    var name = "Andy";
    var kind = "Horsey";
    var query = "insert into animals values('"+name+"', '"+kind+"')"
    db.run("create table animals (name text, kind text)");
    db.run(query);
    db.run("insert into animals values('Wanda', 'fish')");
    db.close();
}