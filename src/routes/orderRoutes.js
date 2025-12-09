const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { upload, uploadToCloudinary } = require("../middlewares/upload");
const { moyasarCallback } = require("../controllers/paymentController"); // موجود

router.post("/", orderController.createOrder);
router.post(
  "/with-proof",
  upload.single("file"),
  uploadToCloudinary,
  orderController.createOrderWithReceipt
);
router.get("/payment/callback", moyasarCallback); // 🟢 غير إلى GET
router.get("/", orderController.getOrders);
router.get("/user/:userId", orderController.getUserOrders);
router.get("/:id", orderController.getOrderById);
router.put("/:id", orderController.updateOrder);
router.delete("/:id", orderController.deleteOrder);
// رفع إيصال الدفع
router.post("/:id/payment-proof", upload.single('file'), uploadToCloudinary, orderController.uploadPaymentProof);

// 🟢 لو حابب webhook، أضف دالة أولاً في orderController.js ثم الـ route هنا

module.exports = router;