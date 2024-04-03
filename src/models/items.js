require('dotenv').config()
const mongoose = require("mongoose")


const items = new mongoose.Schema({
    user:{type:String},
    items:{
        name:{type:String},
        quantity:{type:Number},
        total:{type:Number},
        bookid:{type:String}
    },
    status:{type:String},
    vendorid:{type:String}
})


module.exports = mongoose.model('items',items);