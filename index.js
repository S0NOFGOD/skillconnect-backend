const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cors());

/*
===========================
MongoDB Connection
===========================
*/

const MONGO_URL = "mongodb+srv://Admin:oberhiri@cluster0.d9rfxxg.mongodb.net/skillconnect?retryWrites=true&w=majority";

mongoose.connect(MONGO_URL)
.then(() => console.log("Database connected ✅"))
.catch(err => console.log("MongoDB connection error ❌", err));


/*
===========================
User Schema
===========================
*/

const UserSchema = new mongoose.Schema({

  name: String,

  email: {
    type: String,
    unique: true
  },

  password: String,

  phone: String,

  location: String,

  skill: String,

  image: String,

  resetCode: String,

  resetCodeExpiry: Date

});

const User = mongoose.model("User", UserSchema);


/*
===========================
Nodemailer Setup
===========================
*/

const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {

    user: "SkillConnect@gmail.com",

    pass: "xvfy hhjp seea eibi"

  }

});


/*
===========================
Signup Route
===========================
*/

app.post("/signup", async (req, res) => {

  try {

    const { name, email, password, phone, location, skill, image } = req.body;

    if (!name || !email || !password || !phone || !location || !skill) {

      return res.status(400).json({
        message: "All fields required"
      });

    }

    const exists = await User.findOne({ email });

    if (exists)
      return res.status(400).json({
        message: "Email already exists"
      });

    // HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({

      name,
      email,
      password: hashedPassword,
      phone,
      location,
      skill,
      image

    });

    await user.save();

    res.json({
      message: "Signup successful",
      user
    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});


/*
===========================
Login Route
===========================
*/

app.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({
        message: "All fields required"
      });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({
        message: "User not found"
      });

    // COMPARE HASHED PASSWORD
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).json({
        message: "Invalid password"
      });

    res.json({
      message: "Login successful",
      user
    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});


/*
===========================
Update User Route
===========================
*/

app.post("/update-user", async (req, res) => {

  try {

    const { email, name, phone, location, skill, image } = req.body;

    if (!email || !name || !phone || !location || !skill)
      return res.status(400).json({
        message: "All fields required"
      });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({
        message: "User not found"
      });

    user.name = name;
    user.phone = phone;
    user.location = location;
    user.skill = skill;

    if (image)
      user.image = image;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user
    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});


/*
===========================
Forgot Password Route
===========================
*/

app.post("/forgot-password", async (req, res) => {

  try {

    const { email } = req.body;

    if (!email)
      return res.status(400).json({
        message: "Email is required"
      });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({
        message: "User not found"
      });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetCode = code;

    user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();


    // SEND EMAIL
    await transporter.sendMail({

      from: '"SkillConnect" <SkillConnect@gmail.com>',

      to: email,

      subject: "SkillConnect Password Reset Code",

      html: `
        <h2>Password Reset Request</h2>
        <p>Your SkillConnect reset code is:</p>
        <h1 style="color:#0072ff">${code}</h1>
        <p>This code expires in 15 minutes.</p>
      `

    });


    res.json({
      message: "Reset code sent to your email"
    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Failed to send reset code"
    });

  }

});


/*
===========================
Reset Password Route
===========================
*/

app.post("/reset-password", async (req, res) => {

  try {

    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword)
      return res.status(400).json({
        message: "All fields required"
      });

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({
        message: "User not found"
      });

    if (
      !user.resetCode ||
      user.resetCode !== code ||
      user.resetCodeExpiry < new Date()
    ) {

      return res.status(400).json({
        message: "Invalid or expired code"
      });

    }

    // HASH NEW PASSWORD
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    user.resetCode = null;

    user.resetCodeExpiry = null;

    await user.save();

    res.json({
      message: "Password reset successful"
    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error"
    });

  }

});


/*
===========================
Start Server
===========================
*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
