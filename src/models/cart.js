require('dotenv').config()
const mongoose = require("mongoose")


const cart = new mongoose.Schema({
    user:{type:String,required:true},
    items:[{
        itemname:{type:String,required:true},
        price:{type:String,required:true},
        // image:{type:String,required:true}
        img:{ 
            data: Buffer,
            contentType: String
        }

    }],
})


module.exports = mongoose.model('cart',cart);