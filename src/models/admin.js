require('dotenv').config()
const mongoose = require("mongoose")


const admin = new mongoose.Schema({
    widgettext:{type:String},
    about:{type:String},
    token:{type:String}
})


module.exports = mongoose.model('admin',admin);