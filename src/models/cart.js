require('dotenv').config()
const mongoose = require("mongoose")


const cart = new mongoose.Schema({
    user:{type:String,required:true},
    items:[{
        itemname:{type:String,required:true},
        price:{type:Number,required:true},
        // image:{type:String,required:true}
        img:{ 
            data: Buffer,
            contentType: String
        },
        quantity:{type:Number,required:true},
        vendorid:{type:String,required:true},
        total:{typde:Number}

    }],
})

module.exports = mongoose.model('cart',cart);