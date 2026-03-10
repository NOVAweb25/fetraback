const express = require("express");
const router = express.Router();
const crypto = require("crypto");
require("dotenv").config();

const { moyasarCallback, moyasarWebhook } = require("../controllers/paymentController");

// رجوع العميل بعد الدفع
router.get("/callback", moyasarCallback);

// إشعار Moyasar للسيرفر
router.post("/webhook", express.json(), async (req, res) => {
  try {

    const secret = process.env.MOYASAR_SECRET_KEY;
    const receivedSignature = req.headers["signature"];

    const payloadString = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadString)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const payment = req.body;

    console.log("🔔 Webhook received:", payment);

    if (payment.status === "paid") {

      // هنا تحدث الطلب في قاعدة البيانات
      // Order.update...

    }

    res.status(200).json({ received: true });

  } catch (err) {

    console.error("Webhook Error:", err);
    res.status(500).json({ message: "Webhook error" });

  }
});

module.exports = router;