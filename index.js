const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB connected ✅");
  })
  .catch((err) => {
    console.error("MongoDB connection error ❌", err);
  });

app.get("/", (req, res) => {
  res.send("SkillConnect backend is running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
