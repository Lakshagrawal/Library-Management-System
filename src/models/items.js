require('dotenv').config()
const mongoose = require("mongoose")


const items = new mongoose.Schema({
    user:{type:String},
    items:{
        name:{type:String},
        quantity:{type:Number},
        total:{type:Number},
        itemsid:{type:String}
    },
    status:{type:String},
    vendorid:{type:String},
    userInfo:{
        userName:{type:String,required:true},
        mobile:{type:Number,required:true},
        address:{type:String},
        city:{type:String},
        pincode:{type:Number},
        paymentMethod:{type:String},
        state:{type:String},
    },
})


module.exports = mongoose.model('items',items);