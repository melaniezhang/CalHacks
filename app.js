var express               = require("express"),
    app                   = express(),
    bodyParser            = require("body-parser"),
    path                  = require('path'),
    mongoose              = require('mongoose'),
    passport              = require('passport'),
    LocalStrategy         = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose');


mongoose.connect("mongodb://localhost/rideshare");

/* Mongo Database Objects */
var userSchema = new mongoose.Schema({
	first: String,
	last: String,
	username: String,
	password: String,
	phone: String
});

userSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", userSchema);

var rideSchema = new mongoose.Schema({
	driver: userSchema,
	origin: String,
	destination: String,
	price: Number,
	date: String,
	passengers: [userSchema]
})

var Ride = mongoose.model("Ride", rideSchema);

// idk what these do but just use these
app.use(express.static(__dirname + '/public'));
app.use(express.static('views'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(require("express-session")({
	secret: "Calvin is awesome",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/* ~~~~~~~~~~~~~~~~~~~~~~~~~ ROUTES ~~~~~~~~~~~~~~~~~~~~~~ */
// RENDER THE LANDING PAGE
app.get("/", isLoggedInLanding, function(req, res){
  res.render("landing");
});

// INDEX - show all rides
app.get("/rides", isLoggedIn, function(req, res){	
	Ride.find({}, function(err, allRides){
		if(err){
			console.log(err);
		} else {
			res.render("index", {rides:allRides, user: req.user});
		}
	})
});

// NEW - show form for new ride
app.get("/rides/new", isLoggedIn, function(req, res){
	res.render("new");
});

// FIND
app.get("/rides/find", isLoggedIn, function(req, res){
	res.render("find");
});

var foundRide = null;

app.post("/rides/find", function(req, res) {
	var origin = req.body.origin.split(",")[0];
	var destination = req.body.destination.split(",")[0];
	var date = req.body.date;
	foundRide = {origin: origin, destination: destination, date: date};
	res.redirect("/results");
});

app.get("/results", isLoggedIn, function(req, res) {
	Ride.find({}, function(err, allRides){
		if(err){
			console.log(err);
		} else {
			res.render("results", {rides:allRides, ride: foundRide, user: req.user});
		}
	})
});

// CREATE - puts new ride into database
app.post("/rides", function(req, res){
	// get data from form and add to rides array
	var driver = req.user;
	var origin = req.body.origin.split(",")[0];
	var destination = req.body.destination.split(",")[0];
	var price = req.body.price;
	var date = req.body.date;
	var newRide = {driver: driver, origin: origin, destination: destination, price: price, date: date, passengers: req.user};
	Ride.create(newRide, function(err, newlyCreated) {
		if(err){
			console.log(err);
		} else {
			res.redirect("/confirm");
		}
	});
});

// SHOW - shows detail for one ride
app.get("/rides/:id", isLoggedIn, function(req, res){
	Ride.findById(req.params.id, function(err, foundRide){
		if(err){
			console.log(err);
		} else {
			res.render("show", {ride: foundRide});
		}
	});
});


// AUTH ROUTES - REGISTER
app.get("/register", function(req, res){
	res.render("register");
});

app.post("/register", function(req, res){
	var first = req.body.first;
	var last = req.body.last;
	var username = req.body.username;
	var password = req.body.password;
	var phone = req.body.phone;
	User.register(new User({first: first, last: last, username: username, phone: phone}), password, function(err, user){
		if(err) {
			console.log(err);
			return res.render('register');
		}
		passport.authenticate("local")(req, res, function(){
			res.redirect("/rides");
		});
	});
});

// AUTH ROUTES - SIGN IN
app.get("/login", function(req, res){
	res.render("login");
});

//middleware inbetween request and callback
app.post("/login", passport.authenticate("local", {
	successRedirect: "/rides",
	failureRedirect: "/login"
}), function(req, res){
});

// AUTH ROUTES - LOGOUT
app.get("/logout", function(req, res){
	req.logout();
	res.redirect("/");
});

app.get("/profile", isLoggedIn, function(req, res){
	Ride.find({}, function(err, allRides){
		if(err){
			console.log(err);
		} else {
			res.render("profile", {rides:allRides, user: req.user});
		}
	})
})

app.post("/rides/addpassenger", function(req, res){
	Ride.findById(req.body.id, function(err, foundRide){
		if (err){
			console.log(err);
		} else {
			foundRide.passengers.push(req.user);
		}
	});
});

app.get("/confirm", function(req, res){
	res.render("confirm");          
});

// ERROR PAGE
app.get("*", function(req, res){
	res.send("IT SEEMS LIKE YOU LANDED IN THE WRONG PAGE!");
});

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()){
		return next();
	}
	res.redirect("/login");
};

function isLoggedInLanding(req, res, next) {
	if (req.isAuthenticated()){
		res.redirect("/rides");
	} else {
		return next();
	}
}

app.listen(3000, function(){
  console.log("The Rideshare server has started!");
});