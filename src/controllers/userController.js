const User = require("../models/User");
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
// ⚙️ إعداد Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
// 🧩 دالة مساعدة لرفع الصور إلى Cloudinary
const uploadToCloudinary = async (file, folder = "users") => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });
    fs.unlinkSync(file.path); // حذف الملف المؤقت بعد الرفع
    return result.secure_url;
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
};
// 👥 عرض كل المستخدمين
exports.getAllUsers = async (req, res) => {
  res.json(await User.find().select("-passwordHash"));
};
// 👤 عرض مستخدم واحد بالتفاصيل
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: "cart.product",
        model: "Product",
      })
      .populate("favorites")
      .lean();
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    res.json(user);
  } catch (err) {
    console.error("❌ Get user by ID error:", err);
    res.status(500).json({ error: err.message });
  }
};
// ✏️ تحديث بيانات المستخدم
exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // 🖼️ رفع صورة الملف الشخصي إلى Cloudinary
    if (updates.profilePic) {
      user.profilePic = updates.profilePic;
    }
    // 🖼️ رفع صور "من أنا" إلى Cloudinary (متعددة)
    if (req.files?.aboutImages && Array.isArray(req.files.aboutImages)) {
      const uploadPromises = req.files.aboutImages.map((file) =>
        uploadToCloudinary(file, "users/about")
      );
      const uploadedImages = await Promise.all(uploadPromises);
      user.aboutImages.push(...uploadedImages.map((url) => ({ path: url })));
    }
    // 🧾 تحديث باقي الحقول النصية
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.nickname !== undefined) user.nickname = updates.nickname;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.location !== undefined) user.location = updates.location;
    if (updates.latitude !== undefined) user.latitude = updates.latitude;
    if (updates.longitude !== undefined) user.longitude = updates.longitude;
    if (updates.city !== undefined) user.city = updates.city;
    if (updates.neighborhood !== undefined) user.neighborhood = updates.neighborhood;
    if (updates.street !== undefined) user.street = updates.street;
    if (updates.nearestLandmark !== undefined) user.nearestLandmark = updates.nearestLandmark;
    // 🎨 خيارات العرض (JSON مرن)
    if (updates.displayOptions) {
      let displayOptionsData = updates.displayOptions;
      if (typeof displayOptionsData === "string") {
        try {
          displayOptionsData = JSON.parse(displayOptionsData);
        } catch (err) {
          console.error("⚠️ Error parsing displayOptions:", err);
        }
      }
      user.displayOptions = {
        ...user.displayOptions,
        ...displayOptionsData,
      };
    }
    await user.save();
    res.json(user);
  } catch (err) {
    console.error("❌ Update user error:", err);
    res.status(500).json({ message: err.message });
  }
};
// ❌ حذف مستخدم
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // 🧹 حذف الصور من Cloudinary (اختياري)
    const extractPublicId = (url) => {
      try {
        const parts = url.split("/");
        const lastPart = parts.pop();
        const [publicId] = lastPart.split(".");
        return parts.slice(-2).join("/") + "/" + publicId;
      } catch {
        return null;
      }
    };
    if (user.profilePic) {
      const publicId = extractPublicId(user.profilePic);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }
    if (user.aboutImages?.length) {
      for (const img of user.aboutImages) {
        const publicId = extractPublicId(img.path);
        if (publicId) await cloudinary.uploader.destroy(publicId);
      }
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("❌ Delete user error:", err);
    res.status(500).json({ message: err.message });
  }
};
// ❤️ الإعجابات (Favorites)
exports.addFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!req.body.productId)
      return res.status(400).json({ message: "Product ID is required" });
    if (!user.favorites.includes(req.body.productId)) {
      user.favorites.push(req.body.productId);
      await user.save();
    }
    res.json(user);
  } catch (err) {
    console.error("❌ Error adding favorite:", err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.removeFavorite = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $pull: { favorites: req.params.productId } },
    { new: true }
  );
  res.json(user);
};
// 🛒 السلة (Cart)
exports.addToCart = async (req, res) => {
  try {
    const { product, name, price, mainImage } = req.body;
    const quantity = req.body.quantity || 1;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    const existingItem = user.cart.find(
      (item) => item.product?.toString() === product
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({ product, name, price, mainImage, quantity });
    }
    await user.save();
    const populatedUser = await User.findById(req.params.id)
      .populate("cart.product")
      .lean();
    res.json(populatedUser.cart);
  } catch (err) {
    console.error("❌ Error in addToCart:", err);
    res.status(500).json({ error: err.message });
  }
};
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    const item = user.cart.id(req.params.itemId);
    if (!item) return res.status(404).json({ error: "العنصر غير موجود في السلة" });
    if (quantity <= 0) {
      item.remove();
    } else {
      item.quantity = quantity;
    }
    await user.save();
    const populatedUser = await User.findById(req.params.id)
      .populate("cart.product")
      .lean();
    res.json(populatedUser.cart);
  } catch (err) {
    console.error("❌ Error in updateCartItem:", err);
    res.status(500).json({ error: err.message });
  }
};
exports.removeFromCart = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { cart: { _id: req.params.itemId } } },
      { new: true }
    )
      .populate("cart.product")
      .lean();
    res.json(user.cart);
  } catch (err) {
    console.error("❌ Error in removeFromCart:", err);
    res.status(500).json({ error: err.message });
  }
};
// 🔔 تحديث fcmToken
exports.updateFcmToken = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fcmToken: req.body.fcmToken },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "✅ Token updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};