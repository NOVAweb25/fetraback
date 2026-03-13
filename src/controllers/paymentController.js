const axios = require("axios");
const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");
const admin = require("../../firebase"); // موجود
const Product = require("../models/Product");

exports.moyasarCallback = async (req, res) => {
  try {
    const { id, status, message } = req.query; // استخدم req.query لـ GET
    if (!id) return res.redirect('https://tarafront.vercel.app/payment-failed?error=Missing ID');

    // جلب payment من Moyasar API للتحقق
    const paymentRes = await axios.get(`https://api.moyasar.com/v1/payments/${id}`, {
      auth: { username: process.env.MOYASAR_SECRET_KEY }
    });
    const payment = paymentRes.data;

    // تحقق إذا كان الطلب موجوداً بالفعل (idempotency)
    let order = await Order.findOne({ paymentId: id });
    if (order) {
      // إذا موجود، فقط أعد توجيه بناءً على الحالة
      if (order.paymentStatus === "paid") {
        return res.redirect('https://tarafront.vercel.app/payment-success');
      } else {
        return res.redirect(`https://tarafront.vercel.app/payment-failed?message=${encodeURIComponent(message || payment.message)}`);
      }
    }

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
        paymentId: id,
        paymentStatus: "paid",
        status: "تم تأكيد الطلب",
        orderNumber,
      });

      // أفرغ cart
      await User.findByIdAndUpdate(order.user, { cart: [] });

      // خصم المخزون تلقائياً
      const populatedOrder = await Order.findById(order._id).populate("items.product");
      for (const item of populatedOrder.items) {
        const productId = item.product._id || item.product;
        const product = await Product.findById(productId);
        if (!product) {
          console.log("❌ لم يتم العثور على المنتج:", productId);
          continue;
        }
        if (product.stock < item.quantity) {
          // يمكن إرسال إشعار خطأ، لكن نستمر
          console.error(`⚠️ المخزون غير كافٍ لـ ${product.name}`);
          continue;
        }
        product.stock -= item.quantity;
        await product.save();
        console.log(`✔ خصم ${item.quantity} من ${product.name}`);
      }

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
      // failed، لا تنشئ طلب، redirect
      return res.redirect(`https://tarafront.vercel.app/payment-failed?message=${encodeURIComponent(message || payment.message)}`);
    }
  } catch (err) {
    console.error("Callback Error:", err.response?.data || err.message);
    return res.redirect('https://tarafront.vercel.app/payment-failed?error=Server error');
  }
};