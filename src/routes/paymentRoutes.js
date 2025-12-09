const express = require("express");
const router = express.Router();
const crypto = require("crypto");
require("dotenv").config();
const { moyasarCallback } = require("../controllers/paymentController");

router.post("/callback", express.json(), async (req, res) => {
  try {
    const secret = process.env.MOYASAR_SECRET_KEY;
    const receivedSignature = req.headers["signature"];

    const payloadString = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");

    // التحقق من صحة الطلب
    if (receivedSignature !== expectedSignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const payment = req.body;

    console.log("🔔 Callback Received:", payment);

    // إذا كان الدفع ناجح
    if (payment.status === "paid") {
      // هنا تربط الدفع بالطلب وتحدّث حالة الطلب
      // ولو تبين أكتب لك كود الإنشاء الكامل
    }

    return res.json({ message: "Callback received", status: payment.status });

  } catch (err) {
    console.error("Callback Error:", err);
    res.status(500).json({ message: "Callback server error" });
  }
});


router.get("/callback", moyasarCallback);  // الـ path الآن /api/payment/callback بعد mount في app.js


module.exports = router;
