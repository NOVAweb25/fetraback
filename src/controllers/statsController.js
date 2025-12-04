const User = require("../models/User");
const Order = require("../models/Order");
const Booking = require("../models/Booking");
const Product = require("../models/Product"); // ✅ استيراد Product

// helper لتحويل فترة الأيام إلى تاريخ بداية (افتراضي سنة)
const getStartDate = (range) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(today.getTime() - range * 24 * 60 * 60 * 1000);
};

exports.getStats = async (req, res) => {
  try {
    const { range = 365 } = req.query; // ✅ افتراضي 365 يوم (سنة)
    const startDate = getStartDate(parseInt(range));

    // 📊 إجماليات المستخدمين والحجوزات
    const users = await User.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: "confirmed" });

    // 📦 إجماليات الطلبات حسب الحالة
    const totalOrders = await Order.countDocuments();
    const deliveredOrders = await Order.countDocuments({ status: "تم التسليم" });
    const cancelledOrders = await Order.countDocuments({ status: "تم رفض الطلب" });
    const pendingOrders = await Order.countDocuments({ status: "بانتظار تأكيد الطلب" });

    // 🧮 حساب النسب المئوية
    const deliveredPercentage = totalOrders
      ? ((deliveredOrders / totalOrders) * 100).toFixed(1)
      : 0;
    const cancelledPercentage = totalOrders
      ? ((cancelledOrders / totalOrders) * 100).toFixed(1)
      : 0;

    // 📈 نمو الطلبات (تم التسليم) خلال السنة (شهرياً)
    const aggregation = await Order.aggregate([
      { $match: { status: "تم التسليم", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // ✅ تجميع شهرياً
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const ordersGrowth = aggregation.map((item) => ({
      date: item._id,
      orders: item.count,
    }));

    // ✅ إضافة إحصائيات الراغبين في المنتجات (مع فلتر للمنتجات اللي count > 0 فقط)
    const products = await Product.find({ 'interestedUsers.0': { $exists: true } }) // ✅ فلتر: فقط اللي لديها على الأقل 1 user
      .select('name interestedUsers')
      .lean();
    const productsWithInterest = products.map(p => ({
      name: p.name,
      interestedCount: p.interestedUsers.length,
    }));
    console.log('Products with interest (filtered):', productsWithInterest); // ✅ Log للتحقق في server console (شوفه في Render logs)

    // 📦 إرسال النتائج
    res.json({
      users,
      confirmedBookings,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      pendingOrders,
      deliveredPercentage,
      cancelledPercentage,
      ordersGrowth,
      productsWithInterest, // ✅ هنا الـ data المفلترة، هتظهر الرغبة ده
    });
  } catch (err) {
    console.error('Error in getStats:', err); // ✅ Log الخطأ للتحقق
    res.status(500).json({ message: "Server Error" });
  }
};