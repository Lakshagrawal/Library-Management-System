require('dotenv').config()
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken");
const { log } = require("console");


const User = new mongoose.Schema({
    user:{type:String,required:true},
    email:{type:String,require:true},
    pass:{type:String,required:true},
    token:{type:String},
    expireDate: {type:Date},
    is_verfied:{type:Number},
    is_admin:{type:Number}
})



module.exports = new mongoose.model('user',User);