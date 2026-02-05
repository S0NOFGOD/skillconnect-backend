// backend.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// --- CREATE UPLOADS FOLDER IF NOT EXISTS ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// --- MULTER SETUP ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- MAKE UPLOADS STATIC ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- MONGO DB ---
const MONGO_URL = "mongodb+srv://Admin:oberhiri@cluster0.d9rfxxg.mongodb.net/skillconnect?retryWrites=true&w=majority";
mongoose.connect(MONGO_URL)
  .then(() => console.log("Database connected ✅"))
  .catch(err => console.log("MongoDB connection error ❌", err));

// --- USER SCHEMA ---
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  location: String,
  skill: String,
  image: String,
  resetCode: String,
  resetCodeExpiry: Date
});
const User = mongoose.model("User", UserSchema);

// --- NODEMAILER ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "SkillConnect@gmail.com", pass: "xvfy hhjp seea eibi" }
});

// --- SIGNUP ROUTE ---
app.post("/signup", upload.single("image"), async (req, res) => {
  try {
    const { name, email, password, phone, location, skill } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : "";

    if (!name || !email || !password || !phone || !location || !skill) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name, email, password: hashedPassword, phone, location, skill, image: imagePath
    });

    await user.save();

    res.json({ message: "Signup successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- LOGIN ROUTE ---
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid password" });

    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
