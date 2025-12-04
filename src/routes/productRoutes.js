// src/routes/productRoutes.js
const express = require("express");
const router = express.Router();
const { upload, uploadToCloudinary } = require("../middlewares/upload"); // استورد upload + uploadToLocal
const productController = require("../controllers/productController");
// 🟢 إنشاء منتج جديد
router.post(
  "/",
  upload.fields([ // استخدم upload.fields (مش uploadToLocal)
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 20 },
  ]),
  uploadToCloudinary, // أضفه بعدها (بعد تعديله أسفله)
  productController.createProduct
);
// 🟡 جلب كل المنتجات
router.get("/", productController.getProducts);
// 🟣 جلب منتج معين
router.get("/:id", productController.getProductById);
// 🔵 تعديل منتج
router.put(
  "/:id",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "images", maxCount: 20 },
  ]),
 uploadToCloudinary, // نفس الشيء
  productController.updateProduct
);
// 🔴 حذف منتج
router.delete("/:id", productController.deleteProduct);
// 🔔 تسجيل الرغبة في المنتج (جديد)
router.post("/:id/notify-interest", productController.notifyInterest);
module.exports = router;