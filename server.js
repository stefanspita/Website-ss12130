var express = require('express');
_ = require("underscore");
fs = require("fs");
var bodyParser = require('body-parser');
var path = require("path");
var https = require('https');
var privateKey  = fs.readFileSync('key.pem', 'utf8');
var certificate = fs.readFileSync('cert.cer', 'utf8');
var getDataFunction = require("./getData");
var hbs = require("hbs");
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var sql = require("sqlite3");
var cookieParser = require('cookie-parser');
var methodOverride = require("method-override");
var session = require("express-session");

// function used by passport to find user in the database by a given id
function findById(id, fn) {
    var db = new sql.Database("football.db");
    db.all("SELECT * FROM users WHERE id = ? ", [id], function(err, user){
        db.close();
        user = user[0];
        if(user) return fn(null, user);
        return fn(new Error('User ' + id + ' does not exist'));
    });
}

// function used by passport to find user in the database by a given username
function findByUsername(username, fn) {
    var db = new sql.Database("football.db");
    db.all("SELECT * FROM users WHERE username = ? ", [username], function(err, user){
        db.close();
        user = user[0];
        if(user) fn(null, user);
        else fn(null, null);
    });
}

function ensureAuthenticated(request, response, next) {
    if (request.isAuthenticated()) { return next(); }
    response.redirect('/admin');
}

// setup authentication
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        process.nextTick(function () {
            findByUsername(username, function(err, user) {
                if (err) { return done(err); }
                if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
                if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
                return done(null, user);
            })
        });
    }
));

// express server settings
var app = express();
app.use(bodyParser.urlencoded({ extended:false }));
app.use(express.static(__dirname + '/app'));
app.use('/node_modules', express.static(path.join(__dirname, "node_modules")));
app.set('view engine', 'hbs');
app.use(cookieParser());
app.use(methodOverride());
app.use(session({ secret: 'keyboard cat', resave:false, saveUninitialized:true }));
app.use(passport.initialize());
app.use(passport.session());

// initial data GET route
app.get("/getData", function(request, response){
    getDataFunction(function(err, data) {
        if(err) throw err;
        response.json(data);
    });
});

// admin login page GET route
app.get('/admin', function(request, response) {
    response.render("login");
});

// admin login page POST route
app.post('/admin', passport.authenticate('local', { failureRedirect: '/admin' }),
    function(request, response) {
        response.redirect('/addData');
});

// admin logout route
app.get('/logout', function(request, response){
    request.logout();
    response.redirect('/');
});

// admin data handling GET route
app.get("/addData", ensureAuthenticated, function(request,response){
    getDataFunction(function(err, data) {
        var matches = _.where(data.results, {status:"Not started"});
        matches = _.sortBy(matches, function(match){
            return match.date;
        });
        if(err) throw err;
        else response.render("addData", { user: request.user, matches:matches });
    });

});

// admin data POST route
app.post("/addData", ensureAuthenticated, function(request,response){
    var data = request.body;
    var db = new sql.Database("football.db");
    for (var i = 0; i < data.id.length; i++) {
        if(data.scoreHome[i] && data.scoreAway[i]){
            db.run("UPDATE results SET scoreHome = ?, scoreAway = ?, status = 'Finished' WHERE id = ?", [ parseInt(data.scoreHome[i]), parseInt(data.scoreAway[i]), parseInt(data.id[i]) ]);
        }
    }
    db.close();
    response.redirect("/addData");
});

// run server
var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);
console.log("App listening on https://localhost:3000/");
httpsServer.listen(3000);