// ================= IMPORTS =================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ================= APP SETUP =================
const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ================= CREATE UPLOADS FOLDER =================
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ================= MULTER SETUP =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ================= STATIC FILES =================
app.use("/uploads", express.static(uploadDir));

// ================= MONGODB CONNECT =================
const MONGO_URL =
  "mongodb+srv://Admin:oberhiri@cluster0.d9rfxxg.mongodb.net/skillconnect?retryWrites=true&w=majority";

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Database connected ✅"))
.catch(err => console.error("MongoDB connection error ❌", err));

// ================= USER SCHEMA =================
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  location: String,
  skill: String,
  image: String,
  resetCode: { type: String, default: null },
  resetCodeExpiry: { type: Date, default: null }
});
const User = mongoose.model("User", UserSchema);

// ================= NODEMAILER =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "destiny.okpone@gmail.com",
    pass: "yjqmeomjuxcdsxhi" // your 16-character Gmail App Password
  }
});

// verify email connection
transporter.verify((error, success) => {
  if (error) {
    console.log("Email transporter error ❌", error);
  } else {
    console.log("Email server ready ✅");
  }
});

// ================= TEST EMAIL ENDPOINT =================
app.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: '"SkillConnect" <destiny.okpone@gmail.com>',
      to: "samuel.okpone@gmail.com", // your test email
      subject: "Test Email from SkillConnect",
      text: "This is a test email sent from SkillConnect backend."
    });
    console.log("Test email sent ✅");
    res.send("Test email sent! Check your inbox (or spam).");
  } catch (err) {
    console.error("Test email failed ❌", err);
    res.status(500).send("Failed to send test email. Check console.");
  }
});

// ================= SIGNUP =================
app.post("/signup", upload.single("image"), async (req, res) => {
  try {
    const { name, email, password, phone, location, skill } = req.body;
    const imagePath = req.file ? "/uploads/" + req.file.filename : "";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name, email, password: hashedPassword,
      phone, location, skill, image: imagePath
    });

    await newUser.save();

    res.json({
      message: "Signup successful",
      user: { name, email, phone, location, skill, image: imagePath }
    });
  } catch (error) {
    console.error("Signup error ❌", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(400).json({ message: "Incorrect password" });

    res.json({
      message: "Login successful",
      user: { name: user.name, email: user.email, phone: user.phone, location: user.location, skill: user.skill, image: user.image }
    });
  } catch (error) {
    console.error("Login error ❌", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= FORGOT PASSWORD =================
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await transporter.sendMail({
      from: '"SkillConnect" <destiny.okpone@gmail.com>',
      to: email,
      subject: "Password Reset Code",
      html: `<h2>SkillConnect Password Reset</h2><p>Your reset code is:</p><h1>${resetCode}</h1><p>This code expires in 15 minutes.</p>`
    });

    console.log("Reset code sent:", resetCode);
    res.json({ message: "Reset code sent successfully" });
  } catch (error) {
    console.error("Forgot password error ❌", error);
    res.status(500).json({ message: "Failed to send reset code" });
  }
});

// ================= RESET PASSWORD =================
app.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.resetCode || !user.resetCodeExpiry || user.resetCode !== code || Date.now() > user.resetCodeExpiry.getTime()) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = null;
    user.resetCodeExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error ❌", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT, "✅"));
