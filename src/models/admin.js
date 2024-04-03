require('dotenv').config()
const mongoose = require("mongoose")


const admin = new mongoose.Schema({
    user:{type:String,required:true},
    pass:{type:String,required:true},
    access:{type:Number,required:true},
    token:{type:String}
})


module.exports = mongoose.model('admin',admin);