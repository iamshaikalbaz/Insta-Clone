const express = require('express');
const app = express();
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const localStrategy = require('passport-local');

require('dotenv').config();

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch((err) => console.error('❌ MongoDB connection error:', err));


// ✅ Load User Model (the Mongoose schema with plugin)
const userModel = require('./routes/users');

// ✅ MIDDLEWARE (MUST be in this order)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));

app.use(session({
    secret: 'hey hey hey',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use('/uploads', express.static('uploads'));


app.use(passport.initialize());
app.use(passport.session());

// ✅ Passport config
passport.use(new localStrategy(userModel.authenticate()));
passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());

// ✅ View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
