const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json({ limit: "5mb" })); // allow large images
app.use(cors());

// ---------------------------
// MongoDB Connection
// ---------------------------
const MONGO_URL = "mongodb+srv://Admin:oberhiri@cluster0.d9rfxxg.mongodb.net/skillconnect?retryWrites=true&w=majority";

mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Database connected ✅"))
.catch(err => console.log("MongoDB connection error ❌", err));

// ---------------------------
// User Schema & Model
// ---------------------------
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  location: String,
  skill: String,
  image: String // store base64 image
});

const User = mongoose.model("User", UserSchema);

// ---------------------------
// Signup Route
// ---------------------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, location, skill, image } = req.body;

    if (!name || !email || !password || !phone || !location || !skill) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const user = new User({ name, email, password, phone, location, skill, image });
    await user.save();

    res.json({ message: "Signup successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------
// Login Route
// ---------------------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email, password });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------
// Update User Route
// ---------------------------
app.post("/update-user", async (req, res) => {
  try {
    const { email, name, phone, location, skill, image } = req.body;

    if (!email || !name || !phone || !location || !skill) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Update fields
    user.name = name;
    user.phone = phone;
    user.location = location;
    user.skill = skill;
    if(image) user.image = image;

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------
// Start Server
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
