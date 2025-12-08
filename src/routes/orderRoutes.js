const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { upload, uploadToCloudinary } = require("../middlewares/upload"); 
const { moyasarCallback } = require("../controllers/paymentController");

router.post("/", orderController.createOrder);
router.post(
  "/with-proof",
  upload.single("file"),
  uploadToCloudinary,
  orderController.createOrderWithReceipt
);


router.post("/payment/callback", moyasarCallback);

router.get("/", orderController.getOrders);
router.get("/user/:userId", orderController.getUserOrders);
router.get("/:id", orderController.getOrderById);
router.put("/:id", orderController.updateOrder);
router.delete("/:id", orderController.deleteOrder);

// رفع إيصال الدفع
router.post("/:id/payment-proof", upload.single('file'),   uploadToCloudinary, orderController.uploadPaymentProof);

module.exports = router;