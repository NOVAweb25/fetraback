const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true, default: '' },
  nickname: { type: String, trim: true, default: '' }, // اسم الشهرة
  phone: { type: String, required: true, unique: true, trim: true },
  profilePic: { type: String, default: 'default-avatar.png' },
  location: { type: String, trim: true, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  city: { type: String, trim: true, default: '' },
  neighborhood: { type: String, trim: true, default: '' },
  street: { type: String, trim: true, default: '' },
  nearestLandmark: { type: String, trim: true, default: '' },
  // 🔔 رمز إشعارات Firebase
  fcmToken: { type: String, default: null },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['client', 'admin'], default: 'client' },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  bankDetail: { type: mongoose.Schema.Types.ObjectId, ref: 'BankDetail' },
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    mainImage: String,
    quantity: { type: Number, default: 1 }
  }],
  displayOptions: {
    showPic: { type: Boolean, default: true },
    showFirstName: { type: Boolean, default: true },
    showLastName: { type: Boolean, default: true },
    showNickname: { type: Boolean, default: true }
  },
  aboutContent: { type: String, default: '' },
  aboutFiles: [{ name: String, extension: String, path: String }],
  aboutImages: [{ path: String, position: { x: Number, y: Number } }],
     savedCards: [
  {
    token: { type: String, required: true }, // Token من Moyasar
    brand: { type: String }, // visa – mastercard – mada
    last4: { type: String }, // آخر ٤ أرقام
    holderName: { type: String }, // اسم صاحب البطاقة
    createdAt: { type: Date, default: Date.now } // تاريخ الإضافة
  }
],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);