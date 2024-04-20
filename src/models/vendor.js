require('dotenv').config()
const mongoose = require("mongoose")


const Vendor = new mongoose.Schema({
    user:{type:String,required:true},
    pass:{type:String,required:true},
    email:{type:String,required:true},
    token:{type:String},
    items:[{
        itemname:{type:String,required:true},
        price:{type:String,required:true},
        // image:{type:String,required:true}
        img:{ 
            data: Buffer,
            contentType: String
        }

    }],
    mobile:{type:Number,require:true},
    category:{type:String},
    expireDate: {type:Date},
    is_verfied:{type:Number,require:true}
})


module.exports = mongoose.model('vendor',Vendor);