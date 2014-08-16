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

//set up authentication
function findById(id, fn) {
    var db = new sql.Database("football.db");
    db.all("SELECT * FROM users WHERE id = ? ", [id], function(err, user){
        db.close();
        user = user[0];
        if(user) return fn(null, user);
        return fn(new Error('User ' + id + ' does not exist'));
    });
}

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


app.get("/getData", function(request, response){
    getDataFunction(function(err, data) {
        if(err) throw err;
        response.json(data);
    });
});

app.get('/admin', function(request, response) {
    response.render("login");
});

app.post('/admin', passport.authenticate('local', { failureRedirect: '/admin' }),
    function(request, response) {
        response.redirect('/addData');
});

app.get("/addData", ensureAuthenticated, function(request,response){
    response.render("addData");
});


var credentials = {key: privateKey, cert: certificate};
var httpsServer = https.createServer(credentials, app);
console.log("App listening on https://localhost:3000/");
httpsServer.listen(3000);