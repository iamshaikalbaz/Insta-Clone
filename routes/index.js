var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const passport = require('passport');
const localStrategy = require('passport-local');
const upload = require('./multer');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', (req, res) => {
  res.render('Index');
});

router.get('/Login', (req, res) => {
  res.render("Login");
});

router.get('/Home', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const posts = await postModel.find().populate("user").sort({ createdAt: -1 });
     const myStory = req.session.myStory || null;
  if (!user.savedPosts) user.savedPosts = [];

  res.render("Home", { posts, user, myStory });
});

router.get('/Search', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("Search", { user });
});

router.get('/Post', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("Post", { user });
});

router.get('/Profile', async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });

    const posts = await postModel.find({ user: user._id }).sort({ date: -1 }); // newest first

    res.render("Profile", { user: user, posts: posts });
  } catch (err) {
    console.error("Error loading profile:", err);
    res.redirect("/Login");
  }
});

router.get('/Menu-items', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("Menu-items", { user });
});

router.get('/Saved', isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('savedPosts').lean();
  res.render('Saved', { savedPosts: user.savedPosts || [] });
});

router.get('/Messages', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('Messages', { user });
});

router.get("/Mystory", async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (!req.session.myStory) {
      return res.redirect("/Home"); // No story yet
  }
  res.render("Mystory", { user, story: req.session.myStory });
});



router.get('/Edit', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  res.render("Edit", { user });
});

router.post('/register', function (req, res, next) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email
  });

  userModel.register(userData, req.body.password)
    .then(function () {
      passport.authenticate("local")(req, res, function () {
        res.redirect('/Profile');
      })
    });
});

router.post('/Login', passport.authenticate("local", {
  successRedirect: '/Profile',
  failureRedirect: '/Login'
}), function (req, res) {
});

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

router.post('/update', upload.single('image'), async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    {
      username: req.body.username,
      name: req.body.name,
      bio: req.body.bio
    },
    { new: true }
  );
  if (req.file) {
    user.profileImage = req.file.filename;
  }
  await user.save();
  res.redirect('/Profile');
});

router.post('/upload', upload.single('image'), async function (req, res) {
  console.log("Upload route hit"); // DEBUG LINE

  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.create({
    picture: req.file.filename,
    user: user._id,
    caption: req.body.caption
  });

  user.posts.push(post._id);
  await user.save();

  console.log("Redirecting to /Home"); // DEBUG LINE
  res.redirect('/Home');
});

router.get('/username/:query', async (req, res) => {
  try {
    const users = await userModel.find({
      username: { $regex: req.params.query, $options: 'i' } // case-insensitive
    }).limit(10);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post('/like/post/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id });

  let liked = false;

  if (post.likes.indexOf(user.id) === -1) {
    post.likes.push(user._id);
    liked = true;
  } else {
    post.likes.splice(post.likes.indexOf(user.id), 1);
  }

  await post.save();

  res.json({
    liked,
    likes: post.likes.length
  });
});

router.post('/save/post/:id', isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const postId = req.params.id;

  let saved = false;

  if (!user.savedPosts.includes(postId)) {
    user.savedPosts.push(postId);
    saved = true;
  } else {
    user.savedPosts = user.savedPosts.filter(id => id != postId);
  }

  await user.save();

  res.json({ saved });
});

router.post("/add-story", upload.single("story"), (req, res) => {
    console.log(req.file);
    req.session.myStory = `images/uploads/${req.file.filename}`;
    res.redirect("/Home");
});



router.get('/profile/:username', async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.params.username }).populate('post');
    if (!user) return res.status(404).send("User not found");

    res.render('profile', { user });
  } catch (err) {
    res.status(500).send("Server error");
  }
});



function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/Login');
}

module.exports = router;
