const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(cors()); // allow frontend requests

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
  resetCode: String
});

const User = mongoose.model("User", UserSchema);

// ---------------------------
// Test Route
// ---------------------------
app.get("/", (req, res) => {
  res.send("SkillConnect backend is running 🚀");
});

// ---------------------------
// Signup Route
// ---------------------------
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email already exists" });

  const user = new User({ name, email, password });
  await user.save();

  res.json({ message: "Signup successful", user: { name: user.name, email: user.email }, token: "dummy-jwt-token" });
});

// ---------------------------
// Login Route
// ---------------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "All fields required" });

  const user = await User.findOne({ email, password });
  if (!user) return res.status(400).json({ message: "Invalid email or password" });

  res.json({ message: "Login successful", user: { name: user.name, email: user.email }, token: "dummy-jwt-token" });
});

// ---------------------------
// Forgot Password Route
// ---------------------------
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Email not found" });

  // generate a 6-digit reset code
  const resetCode = crypto.randomInt(100000, 999999).toString();
  user.resetCode = resetCode;
  await user.save();

  // In production, you'd send email here
  console.log(`Reset code for ${email}: ${resetCode}`);

  res.json({ message: "Reset code sent" });
});

// ---------------------------
// Reset Password Route
// ---------------------------
app.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) return res.status(400).json({ message: "All fields required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Email not found" });
  if (user.resetCode !== code) return res.status(400).json({ message: "Invalid reset code" });

  user.password = newPassword;
  user.resetCode = null; // clear code
  await user.save();

  res.json({ message: "Password reset successful" });
});

// ---------------------------
// Start Server
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
