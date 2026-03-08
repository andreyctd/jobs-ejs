const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");

require("dotenv").config(); // to load the .env file into the process.env object
require("express-async-errors");

const app = express();

//// ---------------- SECURITY MIDDLEWARE ---------------- ////

app.use(helmet());
app.use(xss());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP
  })
);

//// ---------------- DATABASE SESSION STORE ---------------- ////
const url = process.env.MONGO_URI;

const store = new MongoDBStore({
  // may throw an error, which won't be caught
  uri: url,
  collection: "mySessions",
});
store.on("error", function (error) {
  console.log(error);
});

//// ---------------- SESSION CONFIGURATION ---------------- ////
const sessionParms = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false, sameSite: "strict" },
};

if (app.get("env") === "production") {
  app.set("trust proxy", 1); // trust first proxy
  sessionParms.cookie.secure = true; // serve secure cookies
}

//// ---------------- MIDDLEWARE ORDER MATTERS ---------------- ////

//// ---------------- SESSION MIDDLEWARE ---------------- ////
app.use(session(sessionParms));

//// ---------------- PASSPORT CONFIGURATION ---------------- ////
const passport = require("passport");
const passportInit = require("./passport/passportInit");

passportInit();                   // configure the passport strategies and serialization
app.use(passport.initialize());   // initialize passport
app.use(passport.session());      // use passport's session handling middleware, which will deserialize the user from the session and make it available as req.user

//// ---------------- FLASH MESSAGES ---------------- ////
app.use(require("connect-flash")());

// Cookie parser (needed for CSRF)
app.use(cookieParser(process.env.SESSION_SECRET));

// Body parser
app.use(express.urlencoded({ extended: true }));

// CSRF protection
app.use(csrf({ cookie: false }));

// Make csrf token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

//// ---------------- MIDDLEWARE ( CUSTOM LOCALS )---------------- ////
app.use(require("./middleware/storeLocals"));

app.set("view engine", "ejs");
// to parse the body of the POST request
//   app.use(require("body-parser").urlencoded({ extended: true }));

/* app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
); */

//// ---------------- ROUTES ---------------- ////
// Home page
app.get("/", (req, res) => {
  res.render("index");
});
// Session routes (register, login, logoff)
app.use("/sessions", require("./routes/sessionRoutes"));
// secret word handling
//   let secretWord = "syzygy";
// Secret Word (stored per session)
/*   app.get("/secretWord", (req, res) => {
  if (!req.session.secretWord) {
    req.session.secretWord = "syzygy";
  }
  // load flash messages into res.locals so they can be accessed in the view
  res.locals.info = req.flash("info");
  res.locals.errors = req.flash("error");
  res.render("secretWord", { secretWord: req.session.secretWord });
});
// POST /secretWord
app.post("/secretWord", (req, res) => {
    if (req.body.secretWord.toUpperCase()[0] == "P") {
    req.flash("error", "That word won't work!");
    req.flash("error", "You can't use words that start with p.");
  } else {
    req.session.secretWord = req.body.secretWord;
    req.flash("info", "The secret word was changed.");
  }
  res.redirect("/secretWord");
});   */

// Protected routes
const secretWordRouter = require("./routes/secretWord");   // this router will handle all routes starting with /secretWord
//   app.use("/secretWord", secretWordRouter);   // this will apply the auth middleware to all routes starting with /secretWord
// Auth-protected secretWord routes
const auth = require("./middleware/auth");   // this middleware will check if the user is authenticated, and if not, it will redirect them to the logon page
app.use("/secretWord", auth, secretWordRouter);   // this will apply the auth middleware to all routes starting with /secretWord
// Auth-protected jobs routes
const jobsRouter = require("./routes/jobs");
app.use("/jobs", auth, jobsRouter);


//// ---------------- ERROR HANDLING ---------------- ////
// 404 handler
app.use((req, res) => {
  res.status(404).send(`That page (${req.url}) was not found.`);
});

// global error handler
app.use((err, req, res, next) => {
  console.log(err);

  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).send("Invalid CSRF token.");
  }

  res.status(500).send(err.message);
  //   console.log(err);
});

//// ---------------- SERVER START ---------------- ////
const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await require("./db/connect")(process.env.MONGO_URI);   // connect to the database before starting the server
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();
