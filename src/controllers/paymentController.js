const axios = require("axios");
const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");
const admin = require("../../firebase"); // موجود

exports.moyasarCallback = async (req, res) => {
  try {
    const { id, status, message } = req.query; // استخدم req.query لـ GET
    if (!id) return res.redirect('https://tarafront.vercel.app/payment-failed?error=Missing ID');

    // جلب payment من Moyasar API للتحقق
    const paymentRes = await axios.get(`https://api.moyasar.com/v1/payments/${id}`, {
      auth: { username: process.env.MOYASAR_SECRET_KEY }
    });
    const payment = paymentRes.data;

    // ابحث عن order بـ paymentId (يجب أن يكون محفوظًا في الـ order عند الإنشاء الأولي)
    const order = await Order.findOne({ paymentId: id });
    if (!order) return res.redirect('https://tarafront.vercel.app/payment-failed?error=Order not found');

    if (payment.status === "paid") {
      // حدث order إلى paid
      order.paymentStatus = "paid";
      order.status = "تم تأكيد الطلب";
      await order.save();

      // أفرغ cart
      await User.findByIdAndUpdate(order.user, { cart: [] });

      // إرسال إشعار للأدمن
      await Notification.create({
        toRole: "admin",
        title: "📦 طلب جديد (مدفوع)",
        body: `طلب رقم ${order.orderNumber} من ${order.shipping?.name || "عميل"}`,
        meta: { orderId: order._id, orderNumber: order.orderNumber }
      });

      // FCM للأدمن
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

      // redirect لـ success
      return res.redirect('https://tarafront.vercel.app/payment-success');
    } else {
      // failed، حدث order و redirect
      order.paymentStatus = "failed";
      order.status = "تم رفض الطلب";
      await order.save();
      return res.redirect(`https://tarafront.vercel.app/payment-failed?message=${encodeURIComponent(message || payment.message)}`);
    }
  } catch (err) {
    console.error("Callback Error:", err.response?.data || err.message);
    return res.redirect('https://tarafront.vercel.app/payment-failed?error=Server error');
  }
};