const axios = require("axios");
const Order = require("../models/Order");

exports.moyasarCallback = async (req, res) => {
  try {
    const { id } = req.body;

    // 📌 اجلب نتيجة الدفع من Moyasar
    const payment = await axios.get(
      `https://api.moyasar.com/v1/payments/${id}`,
      {
        auth: {
          username: process.env.MOYASAR_SECRET_KEY,
          password: ""
        }
      }
    );

    const data = payment.data;

    // لو الدفع مو ناجح → تجاهل
    if (data.status !== "paid") {
      return res.json({ message: "الدفع غير مكتمل" });
    }

    // نجلب orderId من metadata
    const orderId = data.metadata.orderId;

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "paid",
      paymentId: data.id,
      paymentMethod: data.source.type,  
      status: "تم تأكيد الطلب"
    });

    return res.json({ message: "تم تحديث حالة الدفع" });

  } catch (err) {
    console.error("Callback Error:", err.response?.data || err.message);
    res.status(500).json({ error: "خطأ في الكولباك" });
  }
};
