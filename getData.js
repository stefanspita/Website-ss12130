var fluent = require("fluent-async");
var _ = require("underscore");
var sql = require("sqlite3");

function getResults(db, callback){
    db.all("SELECT * FROM results", callback);
}

function getIncidents(db, callback){
    db.all("SELECT * FROM incidents", callback);
}

function getTeams(db, callback){
    db.all("SELECT * FROM teams", callback);
}

function calculateTables(results, teams) {
    _.map(teams, function(team){
        var stats = _.countBy(results, function(match) {
            if(match.status != "Finished") return;
            if(team.id === match.home_id){
                if(match.scoreHome > match.scoreAway) return "won";
                if(match.scoreHome === match.scoreAway) return "drawn";
                if(match.scoreHome < match.scoreAway) return "lost";
            }
            else if(team.id === match.away_id){
                if(match.scoreHome < match.scoreAway) return "won";
                if(match.scoreHome === match.scoreAway) return "drawn";
                if(match.scoreHome > match.scoreAway) return "lost";
            }
        });
        team.for = _.reduce(results, function(memo, match){
            if(match.status != "Finished") return memo;
            if(team.id === match.home_id) return memo + match.scoreHome;
            else if(team.id === match.away_id) return memo + match.scoreAway;
            else return memo;
        },0);
        team.against = _.reduce(results, function(memo, match){
            if(match.status != "Finished") return memo;
            if(team.id === match.home_id) return (memo + match.scoreAway);
            else if(team.id === match.away_id) return memo + match.scoreHome;
            else return memo;
        },0);
        team.won = stats.won != null ? stats.won : 0;
        team.drawn = stats.drawn != null ? stats.drawn : 0;
        team.lost = stats.lost != null ? stats.lost : 0;
        team.points = stats.won * 3 + stats.drawn;
        team.difference = team.for - team.against;
    });

    return teams;
}

function close(db) {
    db.close();
}

module.exports = function(callback) {
    var db = new sql.Database("football.db");
    fluent.create({
        db:db
    }).async({
        getIncidents:getIncidents
    }, "db").async({
        getResults:getResults
    }, "db").async({
        getTeams:getTeams
    }, "db").sync({
        calculateTables:calculateTables
    }, "getResults", "getTeams").wait().sync({
        close:close
    }, "db").run(callback, "calculateTables");
}