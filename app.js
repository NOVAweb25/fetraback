const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const cors = require("cors");
const admin = require("./firebase");
admin.app()
  ? console.log("✅ Firebase Admin initialized successfully")
  : console.log("❌ Firebase Admin failed");

// Routes
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const sectionRoutes = require("./src/routes/sectionRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const productRoutes = require("./src/routes/productRoutes");
const sessionRoutes = require("./src/routes/sessionRoutes");
const locationRoutes = require("./src/routes/locationRoutes");
const timeRoutes = require("./src/routes/timeRoutes");
const unavailableDateRoutes = require("./src/routes/unavailableDateRoutes");
const surveyRoutes = require("./src/routes/surveyRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const bankRoutes = require("./src/routes/bankRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const settingRoutes = require("./src/routes/settingRoutes");
const statsRoutes = require("./src/routes/statsRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");


dotenv.config();
const app = express();
const path = require("path");

const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://poise-frontend.onrender.com",
  "https://tarafront-k08nk8hwr-novaweb25s-projects.vercel.app",
  "https://tarafront.vercel.app"  // أضفت الدومين الجديد هنا كـ fallback
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(
  "/api/payment/webhook",
  express.raw({ type: "*/*" }) // مهم جداً للـ webhook
);


app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/times", timeRoutes);
app.use("/api/unavailable-dates", unavailableDateRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/banks", bankRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reviews", reviewRoutes);



// 🖼️ مسار ثابت للصور
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect DB
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;