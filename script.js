var mapTemplate = function(url) {
	$('#main').fadeTo(500, 0);
	$('.footer').fadeTo(500, 0);
	setTimeout(function(){
		var arguments = [];
		var template;
		if(url.indexOf("#") != -1) {
			template = url.split("#")[1];
			if(!template){template = "index";}
			else if(template.indexOf("/") != -1){
				arguments = template.split("/");
				template = arguments[0];
			}
		} else {
			template = "index";
		}
		var $html = $.handlebarTemplates.partials[template]({});
		$('#main').html($html);
		window[template](arguments);
		setTimeout(function(){
			$('#main').fadeTo(500, 1);
			$('.footer').fadeTo(500, 1);
		},500);
	},500);
};

var index = function() {
	$.getJSON("./data/tables.json", function(data) {
		var $html = $.handlebarTemplates.partials.standingsTemplate({title: "Standings", tables: data});
		$('#standings').html($html);
	  });
	$.getJSON("./data/results.json", function(data) {
		var justResults = _.filter(data, function(match){if((match.scoreHome) || (match.scoreHome === 0)){return true;}else{return false;}});
		var lastResult = _.last(justResults);		
		data = _.where(data, {round:(lastResult.round)});
		var $html = $.handlebarTemplates.partials.quickResults({title: "Round "+(lastResult.round), results: data, showMore:"Results and Fixtures"});
    	$('#results').html($html);
    });
};

var results = function(options) {
	$.getJSON("./data/results.json", function(data) {
		
		if(options[1]) {currentRound = parseInt(options[1], 10);}
		else {
			var lastResult = _.last(_.filter(data, function(match){if((match.scoreHome) || (match.scoreHome === 0)){return true;}else{return false;}}));
			var currentRound = lastResult.round;
		}
		var rounds = _.map(_.unique(_.pluck(data, "round")), function(r)
		{
			if(currentRound === r){return {round:r, selected:true};}
			else{ return {round:r};}
		});
		var results = _.where(data, {round:currentRound});
		var $html = $.handlebarTemplates.partials.roundSelect({title: "Premiership Results and Fixtures ", rounds:rounds});
    	$('#results').html($html);
		var openedMatch = 0;
		if(options) {openedMatch = parseInt(options[2], 10);}
		$html = $.handlebarTemplates.partials.detailedResults({results: results, openedMatch:openedMatch});
    	$('#results .content').html($html);
		$(".score").click(function(e) {
			$(e.currentTarget).closest("li").find(".matchEvents").toggleClass("hidden");
		});
		
		$( "#round" ).change(function() {
			currentRound = $( "#round" ).val();
			results = _.where(data, {round:(parseInt(currentRound, 10))});
			$html = $.handlebarTemplates.partials.detailedResults({results: results});
			$('#results .content').html($html);
			$(".score").click(function(e) {
				$(e.currentTarget).closest("li").find(".matchEvents").toggleClass("hidden");
			});
		});
    });
	$.getJSON("./data/tables.json", function(data) {
		var first = _.first(data, 6);
		var last = _.last(data, 4);
		var $html = $.handlebarTemplates.partials.shortStandingsTemplate({title: "Standings", first:first, last:last, showMore:"Full Standings"});
		$('#shortStandings').html($html);
	});
};

var compare = function(options) {
	var templateData = [];
	$.getJSON("./data/results.json", function(results) {
		$.getJSON("./data/tables.json", function(data) {
			var teams = _.sortBy(data, function(team){return team.team;});
			if(!options[1]){options[1] = teams[0].team_id; }
			if(!options[2]){options[2] = teams[1].team_id; }
			var $html = $.handlebarTemplates.partials.teamSelect({title: "Team Comparison", teams:teams, firstSelected:parseInt(options[1], 10), secondSelected:parseInt(options[2], 10)});
			$('#comparison').html($html);
			var first = _.first(data, 6);
			var last = _.last(data, 4);
			$html = $.handlebarTemplates.partials.shortStandingsTemplate({title: "Standings", first:first, last:last, showMore:"Full Standings"});
			$('#shortStandings').html($html);
			if(!options[1]){options[1] = teams[0].team_id; }
			
			templateData.push(getSeasonComparisonData(parseInt(options[1], 10), parseInt(options[2], 10), data));
			templateData.push(getResultsComparisonData(parseInt(options[1], 10), parseInt(options[2], 10), results));
			templateData.push(getVersusMatches(parseInt(options[1], 10), parseInt(options[2], 10), results));
			
			$html = $.handlebarTemplates.partials.twoTeams({sections:templateData});
			$('#comparison .content').html($html);
			
			$( "select" ).change(function() {
				var team1 = $( "select#team1" ).val();
				var team2 = $( "select#team2" ).val();
				window.location.hash = "#compare/" + team1 + "/" + team2;
			});
		});
	});
};

var getVersusMatches = function(team1_id, team2_id, results) {
	var matches1 = _.where(results, {home_id:team1_id, away_id:team2_id});
	var matches2 = _.where(results, {home_id:team2_id, away_id:team1_id});
	matches2 = _.map(matches2, function(match){
		var scoreHome = match.scoreHome;
		match.scoreHome = match.scoreAway;
		match.scoreAway = scoreHome;
		return match;		
	});
	var matches = _.sortBy(_.union(matches1, matches2), "date");
	return {name:"Matches", results:(_.map(matches, function(match){
		match.comparison = simpleCompare(match.scoreHome, match.scoreAway);
		return match;
	}))};
};

var getSeasonComparisonData = function(team1_id, team2_id, tables) {
	var team1 = _.findWhere(tables, {team_id:team1_id});
	var team2 = _.findWhere(tables, {team_id:team2_id});
	var subsection = {name:"General Statistics", attributes:[]};
	subsection.attributes.push({label:"Rank", first:team1.position, second:team2.position, comparison:comparisonResult(team1, team2, "position", true)});
	subsection.attributes.push({label:"Wins", first:team1.won, second:team2.won, comparison:comparisonResult(team1, team2, "won")});
	subsection.attributes.push({label:"Draws", first:team1.drawn, second:team2.drawn, comparison:comparisonResult(team1, team2, "drawn")});
	subsection.attributes.push({label:"Defeats", first:team1.lost, second:team2.lost, comparison:comparisonResult(team1, team2, "lost", true)});
	subsection.attributes.push({label:"Points", first:team1.points, second:team2.points, comparison:comparisonResult(team1, team2, "points")});
	subsection.attributes.push({label:"Goals Scored", first:team1["for"], second:team2["for"], comparison:comparisonResult(team1, team2, "for")});
	subsection.attributes.push({label:"Goals Conceded", first:team1.against, second:team2.against, comparison:comparisonResult(team1, team2, "against", true)});

	return subsection;
};

var getResultsComparisonData = function(team1_id, team2_id, results) {
	var matches1 = _.where(results, {home_id:team1_id, away_id:team2_id, status:"Finished"});
	var matches2 = _.where(results, {home_id:team2_id, away_id:team1_id, status:"Finished"});
	var versusMatches = _.union(matches1, matches2);
	var subsection = {name:"Versus Statistics", attributes:[]};
	subsection.attributes.push({label:"Total Matches", first:versusMatches.length, second:versusMatches.length, comparison:"same"});
	subsection.attributes.push({label:"Home Matches", first:matches1.length, second:matches2.length, comparison:simpleCompare(matches1.length, matches2.length)});
	subsection.attributes.push({label:"Away Matches", first:matches2.length, second:matches1.length, comparison:simpleCompare(matches2.length, matches1.length)});
	
	var team1Wins = (_.filter(matches1, function(match){return match.scoreHome > match.scoreAway;})).length + (_.filter(matches2, function(match){return match.scoreHome < match.scoreAway;})).length;
	var team2Wins = (_.filter(matches1, function(match){return match.scoreHome < match.scoreAway;})).length + (_.filter(matches2, function(match){return match.scoreHome > match.scoreAway;})).length;
	var draws = (_.filter(versusMatches, function(match){return match.scoreHome === match.scoreAway;})).length;
	subsection.attributes.push({label:"Wins", first:team1Wins, second:team2Wins, comparison:simpleCompare(team1Wins, team2Wins)});
	subsection.attributes.push({label:"Draws", first:draws, second:draws, comparison:"same"});
	subsection.attributes.push({label:"Defeats", first:team2Wins, second:team1Wins, comparison:simpleCompare(team1Wins, team2Wins)});
	
	var team1Scored = _.reduce(matches1, function(memo, match){ return memo + match.scoreHome; }, 0) + _.reduce(matches2, function(memo, match){ return memo + match.scoreAway; }, 0);
	var team2Scored = _.reduce(matches1, function(memo, match){ return memo + match.scoreAway; }, 0) + _.reduce(matches2, function(memo, match){ return memo + match.scoreHome; }, 0);
	subsection.attributes.push({label:"Scored", first:team1Scored, second:team2Scored, comparison:simpleCompare(team1Scored, team2Scored)});
	subsection.attributes.push({label:"Conceded", first:team2Scored, second:team1Scored, comparison:simpleCompare(team1Scored, team2Scored)});
	
	var goals = _.where(_.flatten(_.pluck(versusMatches, "incidents")), {type:"Goal"});
	var teamGoals = _.groupBy(goals, 'team_id');
	var goalScorers1 = getGoalscorers(_.groupBy(teamGoals[team1_id], "player"));
	var goalScorers2 = getGoalscorers(_.groupBy(teamGoals[team2_id], "player"));
	
	subsection.attributes.push({label:"Most Goals", first:goalScorers1.max, second:goalScorers2.max, comparison:simpleCompare(goalScorers1.max, goalScorers2.max)});
	subsection.attributes.push({label:"", first:goalScorers1.scorers, second:goalScorers2.scorers, comparison:simpleCompare(goalScorers1.max, goalScorers2.max)});
	return subsection;
};

var getGoalscorers = function(scorers) {
	if(_.isEmpty(scorers)){return {scorers:"0", max:0};}
	var max = _.max(scorers, function(incidents){ return incidents.length;});
	max = max.length;
	var bestScorers = _.where(scorers, {length: max});
	var _i, _len, string = "";
	for (_i = 0, _len = bestScorers.length; _i < _len; _i++) {
		string += bestScorers[_i][0].player + ", ";
	}
	string = string.substring(0, string.length - 2);
	return {scorers:string, max:max};
};

var comparisonResult = function(object1, object2, key, reverse) {
	if(reverse){return (object1[key] < object2[key] ? "higherFirst" : object1[key] === object2[key] ? "same" : "higherSecond");}
	else { return (object1[key] > object2[key] ? "higherFirst" : object1[key] === object2[key] ? "same" : "higherSecond");}
};

var simpleCompare = function(val1, val2, reverse) {
	if(reverse){return (val1 < val2 ? "higherFirst" : val1 === val2 ? "same" : "higherSecond");}
	else { return (val1 > val2 ? "higherFirst" : val1 === val2 ? "same" : "higherSecond");}
};

var initializeAnimation = function() {
	var paper = Raphael(document.getElementById('header'), "100%", "100%");
	var title = paper.text(20, 20, "Premiership Statistics").attr({"fill":"#503C22","font-size":35, opacity:0});
	var viewBox = paper.setViewBox(0, 0, 50, 50, "xMaxYMin meet");
	var football = viewBox.image("./img/football.png", 108, 10, 15, 15);
	var viewBox2 = paper.setViewBox(0, 0, 50, 50, "xMaxYMin meet");
	var boot = viewBox2.image("./img/boot.png", 150, 10, 30, 30);
	setTimeout(function(){
		boot.animate({transform: "t-42,-5"}, 500, "linear", function(){
			football.animate({transform: "t-100,-5"}, 600, "linear", function(){
				football.animate({transform: "t-200,0"}, 600, "linear", function(){
					boot.animate({opacity: 0}, 1200, "linear");
					football.animate({transform: "r90t0,400"}, 1300, "linear", function(){
						title.animate({opacity: 1}, 1200, "linear");
					});					
				});
			});
		});
	},2000);
};

$(document).ready(function() {
	initializeAnimation();
	window.onhashchange = function() { mapTemplate(window.location.href); };
	$(document).autoBars(function() {
	  mapTemplate(window.location.href);	  
	});
});

