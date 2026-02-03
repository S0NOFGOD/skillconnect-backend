const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ---------------------------
// MongoDB Connection
// ---------------------------
console.log("MONGO_URL:", process.env.MONGO_URL);

mongoose.connect(process.env.MONGO_URL, {
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
  email: String,
  password: String
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

  res.json({ message: "Signup successful" });
});

// ---------------------------
// Login Route
// ---------------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "All fields required" });

  const user = await User.findOne({ email, password });
  if (!user) return res.status(400).json({ message: "Invalid email or password" });

  res.json({ message: "Login successful", user: { name: user.name, email: user.email } });
});

// ---------------------------
// Password Reset Route (template)
// ---------------------------
app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) return res.status(400).json({ message: "All fields required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Email not found" });

  user.password = newPassword;
  await user.save();

  res.json({ message: "Password reset successful" });
});

// ---------------------------
// Start Server
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
