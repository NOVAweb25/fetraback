const express = require("express");
const router = express.Router();
const crypto = require("crypto");
require("dotenv").config();
const { moyasarCallback } = require("../controllers/paymentController");
const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");
const admin = require("../../firebase");
const Product = require("../models/Product");

// Webhook (POST) - أضف في لوحة Moyasar: https://your-api-base/api/payment/webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
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
    console.log("🔔 Webhook Received:", payment);

    // تحقق إذا كان الطلب موجوداً
    let order = await Order.findOne({ paymentId: payment.id });
    if (order) {
      return res.json({ message: "Order already processed" });
    }

    // إذا كان الدفع ناجح
    if (payment.status === "paid") {
      // استرجع بيانات الطلب من metadata
      const orderData = JSON.parse(payment.metadata.orderData || "{}");

      // إنشاء رقم الطلب
      const lastOrder = await Order.findOne().sort({ createdAt: -1 });
      const nextNum = lastOrder && lastOrder.orderNumber ? parseInt(lastOrder.orderNumber) + 1 : 1;
      const orderNumber = nextNum.toString().padStart(6, "0");

      // إنشاء الطلب
      order = await Order.create({
        user: orderData.user,
        items: orderData.items,
        shipping: orderData.shipping,
        subtotal: orderData.subtotal,
        delivery: orderData.delivery,
        total: orderData.total,
        paymentId: payment.id,
        paymentStatus: "paid",
        status: "تم تأكيد الطلب",
        orderNumber,
      });

      // أفرغ cart
      await User.findByIdAndUpdate(order.user, { cart: [] });

      // خصم المخزون
      const populatedOrder = await Order.findById(order._id).populate("items.product");
      for (const item of populatedOrder.items) {
        const productId = item.product._id || item.product;
        const product = await Product.findById(productId);
        if (!product) continue;
        if (product.stock < item.quantity) {
          console.error(`⚠️ المخزون غير كافٍ لـ ${product.name}`);
          continue;
        }
        product.stock -= item.quantity;
        await product.save();
      }

      // إرسال إشعار
      await Notification.create({
        toRole: "admin",
        title: "📦 طلب جديد (مدفوع)",
        body: `طلب رقم ${order.orderNumber} من ${order.shipping?.name || "عميل"}`,
        meta: { orderId: order._id, orderNumber: order.orderNumber }
      });

      // FCM
      const admins = await User.find({ role: "admin", fcmToken: { $exists: true, $ne: null } });
      for (const adminUser of admins) {
        try {
          await admin.messaging().send({
            token: adminUser.fcmToken,
            notification: { title: "📦 طلب جديد (مدفوع)", body: `طلب رقم ${order.orderNumber}` },
            data: { orderId: order._id.toString(), type: "new_paid_order" }
          });
        } catch (e) {
          console.error("FCM Error:", e);
        }
      }
    }

    return res.json({ message: "Webhook received", status: payment.status });
  } catch (err) {
    console.error("Webhook Error:", err);
    res.status(500).json({ message: "Webhook server error" });
  }
});

router.get("/callback", moyasarCallback); // الـ path الآن /api/payment/callback بعد mount في app.js

module.exports = router;