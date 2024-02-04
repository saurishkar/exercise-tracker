const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");

const MONGO_URI = `mongodb+srv://${process.env["MONGO_USER"]}:${process.env["MONGO_PWD"]}@cluster0.uw8ojnz.mongodb.net/exercise-tracker?retryWrites=true&w=majority`;

mongoose.connect(MONGO_URI);

const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const exerciseSchema = mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const logSchema = mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: Array,
});

const Log = mongoose.model("Log", logSchema);

exerciseSchema.post("save", async (doc) => {
  const { username, duration, description, date } = doc;
  const logDetails = { duration, date, description };
  const userLog = await Log.findOne({ username }).exec();
  if (userLog) {
    userLog.log = [...userLog.log, { ...logDetails }];
    userLog.count += 1;
    return userLog.save();
  }
  const log = new Log({
    count: 1,
    username,
    log: [{ ...logDetails }],
  });
  return log.save();
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.urlencoded());
app.use(express.json());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  const userName = req.body.username;
  const user = new User({ username: userName });
  return user
    .save()
    .then((data) => res.status(200).send(data))
    .catch((err) => res.send(err));
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  return res.send(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  const user = await User.findById(userId).exec();
  const exerciseParams = {
    description,
    duration,
    date: new Date(date).toDateString(),
  };
  const exercise = new Exercise({
    username: user.username,
    ...exerciseParams,
  });
  return exercise
    .save()
    .then((data) => res.send(data))
    .catch((err) => res.send(err));
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit = 10 } = req.query;
  const userId = req.params._id;
  const user = await User.findById(userId, "username");
  const logs = await Log.find({ username: user.username }, null, {
    limit,
  }).exec();
  return res.send(logs);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
