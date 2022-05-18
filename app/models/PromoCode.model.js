var mongoose = require('mongoose');

var promoCodeSchema = new mongoose.Schema({
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'] },
    discountAmount: { type: Number, required: true },
    promoCode: { type: String, required: true},
    promoCodeDesciption: { type: String},
    promoCodeAmountMinCap: { type: String},
    promoCodeAmountMaxCap: { type: String},
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);
