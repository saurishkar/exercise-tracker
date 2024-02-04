const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");

const MONGO_URI = `mongodb+srv://${process.env["MONGO_USER"]}:${process.env["MONGO_PWD"]}@cluster0.uw8ojnz.mongodb.net/exercise-tracker?retryWrites=true&w=majority`;

mongoose.connect(MONGO_URI);

const userSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
  },
  { versionKey: false },
);

const exerciseSchema = mongoose.Schema(
  {
    username: { type: String, required: true },
    description: { type: String, required: true, default: "" },
    duration: { type: Number, required: true, default: 0 },
    date: { type: Date, default: new Date("2024-05-02") },
  },
  { versionKey: false },
);

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
  const users = await User.find({});
  return res.send(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  const user = await User.findById(userId).exec();
  const exerciseParams = {
    description,
    duration,
    date: (date ? new Date(date) : new Date()).toISOString(),
  };
  const exercise = new Exercise({
    username: user.username,
    ...exerciseParams,
  });
  const ex = await exercise.save();
  const responseObj = {
    username: user.username,
    _id: user._id,
    duration: ex.duration,
    description: ex.description,
    date: new Date(ex.date).toDateString(),
  };
  res.send(responseObj);
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit = 10 } = req.query;
  const userId = req.params._id;
  try {
    const user = await User.findById(userId).exec();
    const query = { username: user.username };
    if (!isNaN(Date.parse(from)) && !isNaN(Date.parse(to))) {
      query.date = {
        $gte: new Date(from).toISOString(),
        $lte: new Date(to).toISOString(),
      };
    }
    const exercises = await Exercise.where({ username: user.username })
      .where(query)
      .limit(limit)
      .exec();
    const logs = exercises.map((exercise) => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString(),
      };
    });
    const userData = {
      username: user.username,
      _id: userId,
    };
    res.send({
      ...userData,
      log: logs,
      count: logs.length,
    });
  } catch (err) {
    console.log(err);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
