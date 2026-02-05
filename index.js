// --- IMPORTS ---
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- APP SETUP ---
const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// --- CREATE UPLOADS FOLDER ---
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// --- MULTER SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// --- STATIC ---
app.use("/uploads", express.static(uploadDir));

// --- MONGODB ---
const MONGO_URL = "mongodb+srv://Admin:oberhiri@cluster0.d9rfxxg.mongodb.net/skillconnect?retryWrites=true&w=majority";

mongoose.connect(MONGO_URL)
  .then(() => console.log("Database connected ✅"))
  .catch(err => console.log("MongoDB error ❌", err));

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

// --- NODEMAILER TRANSPORTER ---
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "destiny.okpone@gmail.com",
    pass: "zdgaphmmjwokovhy" // Make sure this is an app password
  }
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.log("Email transporter error ❌", error);
  } else {
    console.log("Email server ready ✅");
  }
});

// --- SIGNUP ---
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
      name,
      email,
      password: hashedPassword,
      phone,
      location,
      skill,
      image: imagePath
    });

    await user.save();

    res.json({ message: "Signup successful", user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- LOGIN ---
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "All fields required" });

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

// --- FORGOT PASSWORD ---
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry
    await user.save();

    // SEND EMAIL
    await transporter.sendMail({
      from: "SkillConnect <destiny.okpone@gmail.com>",
      to: email,
      subject: "Password Reset Code",
      html: `
        <h2>SkillConnect Password Reset</h2>
        <p>Your reset code is:</p>
        <h1>${resetCode}</h1>
        <p>Expires in 15 minutes.</p>
      `
    });

    console.log("Reset code sent:", resetCode);
    res.json({ message: "Reset code sent successfully" });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset code" });
  }
});

// --- RESET PASSWORD ---
app.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.resetCode !== code || Date.now() > new Date(user.resetCodeExpiry).getTime()) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} ✅`);
});
