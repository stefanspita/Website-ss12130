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

// build the standings array by reducing the results for each team to a single set of attributes
// (points, matches played, victories, draws, loses, goals scored, goals conceded, difference)
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
        team.played = team.won + team.drawn + team.lost;
    });
    teams = _.sortBy(teams, function(team){
        return ""+team.points+team.difference;
    });
    teams = teams.reverse();
    _.map(teams, function(team, index){
        team.position = index + 1;
    });
    return teams;
}

// merges the results table with the incidents table using the match_id foreign key stored with every incident
function mapResults(results, incidents, teams) {
    _.map(results, function(match){
        var homeTeam = _.findWhere(teams, {id:match.home_id});
        var awayTeam = _.findWhere(teams, {id:match.away_id});
        match.home = homeTeam.team;
        match.homeshort = homeTeam.teamshort;
        match.away = awayTeam.team;
        match.awayshort = awayTeam.teamshort;
        match.incidents = _.where(incidents, {match_id:match.id});
    });
    return results;
}

// close database connection
function close(db, tables, results) {
    db.close();
    return {tables:tables, results:results};
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
    }, "getResults", "getTeams").sync({
        mapResults:mapResults
    }, "getResults", "getIncidents", "getTeams").wait().sync({
        close:close
    }, "db", "calculateTables", "mapResults").run(callback, "close");
};