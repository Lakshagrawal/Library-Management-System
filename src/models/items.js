require('dotenv').config()
const mongoose = require("mongoose")


const Vendor = new mongoose.Schema({
    userid:{type:String,required:true},
    vendorid:{type:String,required:true},
    totalPrice:{type:String,required:true},
    items:[{
        itemname:{type:String,required:true},
        price:{type:String,required:true},
        // image:{type:String,required:true}
        img:{ 
            data: Buffer,
            contentType: String
        }

    }],
    category:{type:String,required:true}
})


module.exports = mongoose.model('vendor',Vendor);