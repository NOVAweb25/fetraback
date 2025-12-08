// init مع secret key
const User = require('../models/User');

// 1. إنشاء دفع جديد (مع خيار حفظ البطاقة)
exports.createPayment = async (req, res) => {
  const { amount, description, saveCard, source } = req.body;

  try {
    const payment = await Moyasar.payment.create({
      amount: amount * 100,
      currency: 'SAR',
      description,
      source, // من Moyasar JS (tokenized)
      callback_url: `${process.env.API_BASE}/api/payment/webhook`,
      metadata: { userId: req.user.id, saveCard }
    });

    // إذا يحتاج 3DS
    if (payment.status === 'initiated') {
      return res.json({ redirectUrl: payment.source.transaction_url });
    }

    // إذا تم الدفع مباشرة
    if (payment.status === 'paid') {
      // حفظ البطاقة إذا saveCard = true
      if (saveCard && payment.source.token) {
        const user = await User.findById(req.user.id);

        user.savedCards.push({
          token: payment.source.token,
          brand: payment.source.company,
          last4: payment.source.last4,
          holderName: payment.source.name
        });

        await user.save();
      }

      return res.json({ success: true, payment });
    }

  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2. دفع ببطاقة محفوظة (استخدم token)
exports.chargeSavedCard = async (req, res) => {
  const { amount, userId, cardIndex } = req.body; // اختاري بطاقة من savedCards

  try {
    const user = await User.findById(userId);
    const card = user.savedCards[cardIndex];

    if (!card) return res.status(400).json({ error: "Card not found" });

    const payment = await Moyasar.payment.create({
      amount: amount * 100,
      currency: "SAR",
      description: "دفع باستخدام بطاقة محفوظة",
      source: {
        type: "creditcard",
        token: card.token
      }
    });

    return res.json({ success: true, payment });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 3. Webhook للاستماع لأحداث (مثل paid)
exports.moyasarWebhook = async (req, res) => {
  try {
    const data = JSON.parse(req.body.toString());

    if (data.type === "payment_updated" && data.data.status === "paid") {
      const userId = data.data.metadata.userId;
      const saveCard = data.data.metadata.saveCard;

      // إذا يبغى يحفظ البطاقة
      if (saveCard && data.data.source.token) {
        const user = await User.findById(userId);

        user.savedCards.push({
          token: data.data.source.token,
          brand: data.data.source.company,
          last4: data.data.source.last4,
          holderName: data.data.source.name
        });

        await user.save();
      }

      console.log("Payment completed:", data.data.id);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(400);
  }
};
