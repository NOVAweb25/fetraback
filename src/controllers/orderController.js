const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");
const admin = require("../../firebase");
const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
  try {
    // لم نعد نرفض "initiated"، لكن لـ Moyasar لن نستخدم هذا مباشرة
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    const nextNum = lastOrder && lastOrder.orderNumber
      ? parseInt(lastOrder.orderNumber) + 1
      : 1;
    const orderNumber = nextNum.toString().padStart(6, "0");

    const order = await Order.create({
      ...req.body,
      orderNumber,
      status: req.body.paymentStatus === "paid" ? "تم تأكيد الطلب" : "قيد الدفع", // حالة مبدئية
    });

    if (req.body.paymentStatus === "paid") {
      await User.findByIdAndUpdate(order.user, { cart: [] });

      await Notification.create({
        toRole: "admin",
        title: "📦 طلب جديد (مدفوع)",
        body: `طلب رقم ${order.orderNumber} من ${order.shipping?.name || "عميل"}`,
        meta: { orderId: order._id, orderNumber: order.orderNumber }
      });

      const admins = await User.find({ role: "admin", fcmToken: { $exists: true, $ne: null } });
      for (const adminUser of admins) {
        await admin.messaging().send({
          token: adminUser.fcmToken,
          notification: { title: "📦 طلب جديد (مدفوع)", body: `طلب رقم ${order.orderNumber}` },
          data: { orderId: order._id.toString(), type: "new_paid_order" }
        });
      }
    }

    res.json(order);
  } catch (err) {
    console.error("❌ خطأ أثناء إنشاء الطلب:", err);
    res.status(500).json({ error: err.message });
  }
};

// باقي الدوال كما هي (getOrders, getUserOrders, getOrderById, updateOrder, deleteOrder)
exports.getOrders = async (req, res) => {
  let query = Order.find()
    .populate("items.product")
    .populate('user', 'firstName lastName phone');
  if (req.query.status) query = query.where('status').equals(req.query.status);
  if (req.query.orderNumber) query = query.where('orderNumber').equals(req.query.orderNumber);
  if (req.query.name) query = query.where('shipping.name').regex(new RegExp(req.query.name, 'i'));
  if (req.query.phone) query = query.where('shipping.phone').equals(req.query.phone);
  const orders = await query.sort({ createdAt: -1 }).exec();
  res.json(orders);
};

exports.getUserOrders = async (req, res) => {
  let query = Order.find({ user: req.params.userId }).populate("items.product");
  if (req.query.status) query = query.where('status').equals(req.query.status);
  if (req.query.orderNumber) query = query.where('orderNumber').equals(req.query.orderNumber);
  const orders = await query.exec();
  res.json(orders);
};

exports.getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("items.product");
  res.json(order);
};

exports.updateOrder = async (req, res) => {
  try {
    const oldOrder = await Order.findById(req.params.id).populate("items.product");
    const updates = { ...req.body };
    const noteAllowedStatuses = ["تم تأكيد الطلب", "تم رفض الطلب"];
    if (!noteAllowedStatuses.includes(req.body.status)) {
      delete updates.adminNote;
    }
    const updated = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).populate("user");
    // إشعار تحديث حالة الطلب
    if (req.body.status && req.body.status !== oldOrder.status) {
      const user = await User.findById(updated.user._id);
      await Notification.create({
        toUser: user._id,
        title: "📦 تحديث حالة الطلب",
        body: `تم تحديث حالة الطلب رقم ${updated.orderNumber} إلى: ${req.body.status}`,
        meta: {
          orderId: updated._id,
          orderNumber: updated.orderNumber,
          newStatus: req.body.status,
        },
      });
      // إرسال FCM
      if (user?.fcmToken) {
        const message = {
          token: user.fcmToken,
          notification: {
            title: "📦 تم تحديث حالة طلبك",
            body: `تم تحديث حالة الطلب رقم ${updated.orderNumber} إلى: ${req.body.status}`,
          },
          data: {
            orderId: updated._id.toString(),
            status: req.body.status,
            type: "order_update",
          },
        };
        try {
          await admin.messaging().send(message);
        } catch (e) {
          console.error("⚠️ فشل إرسال إشعار FCM:", e.message);
        }
      }
    }
    // خصم المخزون إذا تم التأكيد
    if (req.body.status === "تم تأكيد الطلب" && oldOrder.status !== "تم تأكيد الطلب") {
      console.log("🔻 بدء خصم المخزون للطلب:", oldOrder.orderNumber);
      for (const item of oldOrder.items) {
        const productId = item.product._id || item.product;
        const product = await Product.findById(productId);
        if (!product) {
          console.log("❌ لم يتم العثور على المنتج:", productId);
          continue;
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: `المخزون غير كافٍ للمنتج: ${product.name}`,
          });
        }
        product.stock -= item.quantity;
        await product.save();
        console.log(`✔ خصم ${item.quantity} من المخزون للمنتج ${product.name}`);
      }
      console.log("✅ تم خصم المخزون بنجاح");
    }
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating order:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};