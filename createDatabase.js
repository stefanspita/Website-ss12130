var fs = require('fs');
var fluent = require("fluent-async");
var _ = require("underscore");
var sql = require("sqlite3");

// this file can be run with an extra argument, if the user only wants to add one of the tables to the database
// the parameters available are: incidents, results, teams or users
// if no extra parameter passed in, all tables will be added to the database
if(process.argv[2] === "incidents") {
    incidents(done);
}
else if(process.argv[2] === "results") {
    results(done);
}
else if(process.argv[2] === "teams") {
    teams(done);
}
else if(process.argv[2] === "users") {
    user(done);
}
else {
    fluent.create({}).async({results:results}).wait().async({teams:teams}).wait().async({incidents:incidents}).wait().async({user:user}).run(done);
}

// results table population flow
function results(callback) {
    var db = new sql.Database("football.db");
    console.log("populating the results table");
    fluent.create({
        table:"results", fileName:"results", db:db
    }).async({
        checkTableExists:checkTableExists
    }, "table", "db").async({
        createResultsTable:createResultsTable
    }, "checkTableExists", "db").wait().sync({
        getJsonData:getJsonData
    }, "fileName").sync({
        addResults: addResults
    }, "getJsonData", "db").wait().sync({
        close:close
    }, "db").run(callback);
}

// incidents table population flow
function incidents(callback) {
    var db = new sql.Database("football.db");
    console.log("populating the incidents table");
    fluent.create({
        table:"incidents", fileName:"results", db:db
    }).async({
        checkTableExists:checkTableExists
    }, "table", "db").async({
        createIncidentsTable:createIncidentsTable
    }, "checkTableExists", "db").wait().sync({
        getJsonData:getJsonData
    }, "fileName").sync({
        addIncidents: addIncidents
    }, "getJsonData", "db").wait().sync({
        close:close
    }, "db").run(callback);
}

// teams table population flow
function teams(callback) {
    var db = new sql.Database("football.db");
    console.log("populating the teams table");
    fluent.create({
        table:"teams", fileName:"tables", db:db
    }).async({
        checkTableExists:checkTableExists
    }, "table", "db").async({
        createTeamsTable:createTeamsTable
    }, "checkTableExists", "db").wait().sync({
        getJsonData:getJsonData
    }, "fileName").sync({
        addTeams: addTeams
    }, "getJsonData", "db").wait().sync({
        close:close
    }, "db").run(callback);
}

// teams user population flow
function user(callback) {
    var db = new sql.Database("football.db");
    console.log("creating admin user");
    fluent.create({
        table:"users", db:db
    }).async({
        checkTableExists:checkTableExists
    }, "table", "db").async({
        createUsersTable:createUsersTable
    }, "checkTableExists", "db").wait().sync({
        addAdmin: addAdmin
    }, "db").wait().sync({
        close:close
    }, "db").run(callback);
}

// check if the inputted table name exists in the database
function checkTableExists(tableName, db, callback) {
    db.all("SELECT * FROM sqlite_master WHERE name =? and type='table'", [tableName], callback);
}

// next 4 functions create the relevant tables if they don't exist, or run the callback to continue to the next function, if they do
function createResultsTable(table, db, callback) {
    if(table.length){ callback(); }
    else {
        db.run("create table results (id integer, date text, home_id integer, away_id integer, status text, round integer, scoreHome integer, scoreAway integer)", callback);
    }
}

function createIncidentsTable(table, db, callback) {
    if(table.length){ callback(); }
    else {
        db.run("create table incidents (id integer, type text, goaltype text, team_id integer, player_id integer, player text, playershort text, minute integer, match_id integer)", callback);
    }
}

function createTeamsTable(table, db, callback) {
    if(table.length){ callback(); }
    else {
        db.run("create table teams (id integer, team text, teamshort text)", callback);
    }
}

function createUsersTable(table, db, callback) {
    if(table.length){ callback(); }
    else {
        db.run("create table users (id integer, username text, password text)", callback);
    }
}

// get data stored in the json file having the inputted name and being a part of the local /data folder
function getJsonData(fileName) {
    var fileJSON = fs.readFileSync('./data/'+fileName+'.json');
    return JSON.parse(fileJSON);
}

// next 4 functions add sample data to the relevant tables. running this script twice in a row will add the same data twice,
// so please delete the .db file if you want to revert the database to its initial state
function addResults(rows, db) {
    var match, _i, _len;
    for (_i = 0, _len = rows.length; _i < _len; _i++) {
        match = _.pick(rows[_i], ["id", "date", "home_id", "away_id", "status", "round", "scoreHome", "scoreAway"]);
        db.run("insert into results values(?, ?, ?, ?, ?, ?, ?, ?)", _.values(match));
    }
}

function addIncidents(rows, db) {
    var incident, _i, _j, _len, _len2;
    rows = _.filter(rows, function(match){ return (match.incidents && match.incidents.length); });
    for (_i = 0, _len = rows.length; _i < _len; _i++) {
        for (_j = 0, _len2 = rows[_i].incidents.length; _j < _len2; _j++) {
            incident = _.pick(rows[_i].incidents[_j], ["id", "type", "goaltype", "team_id", "player_id", "player", "playershort", "minute"]);
            incident.match_id = rows[_i].id;
            db.run("insert into incidents values(?, ?, ?, ?, ?, ?, ?, ?, ?)", _.values(incident));
        }
    }
}

function addTeams(rows, db) {
    var team, _i, _len;
    for (_i = 0, _len = rows.length; _i < _len; _i++) {
        team = _.pick(rows[_i], ["team_id", "team", "teamshort"]);
        db.run("insert into teams values(?, ?, ?)", _.values(team));
    }
}

function addAdmin(db) {
    db.run("insert into users values(1, 'admin', 'admin')");
}

// close database connection
function close(db) {
    db.close();
}

// if an error occurred, it shows it in the terminal where the script is being run
function done(callback) {
    if(callback) { console.log("Error: ", callback); }
}