// src/models/Product.js
const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  mainImage: { type: String }, // مسار الصورة الرئيسية في الـ DB (مثل: /uploads/product1.jpg)
  images: [{ type: String }], // مصفوفة مسارات الصور الإضافية (مثل: [/uploads/img1.jpg, /uploads/img2.jpg])
  stock: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  extra: { type: mongoose.Schema.Types.Mixed }, // flexible metadata (sizes, colors...)
  interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // ✅ حقل جديد للراغبين في المنتج
}, { timestamps: true });
ProductSchema.index({ name: 'text', description: 'text' });
module.exports = mongoose.model('Product', ProductSchema);