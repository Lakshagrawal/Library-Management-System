const jwt = require("jsonwebtoken")
// const cookieParser = require("cookie-parser")
const User = require('../models/User');

const verifyUser = async(req,res,next)=>{
    try{
        const token = await req.cookies.usertoken;

        if(!token){
            res.write("<h1>Please Log In </h1>")
            res.write('<a href="/vendor">Sign in</a> <br> <br>')
            res.write('<a href="/vendor/registration">Sign Up</a>')
            return res.send();
        }

        const verifyUser = await jwt.verify(token,process.env.SECRET_KEY_TOKEN)
        // console.log(verifyUser)
        const userid = await User.findOne({_id: verifyUser._id});

        if(token === userid.token){
            next();
        }
        else{
            res.status(404).json({message:"No entry to post your blog"});
        }
    }
    catch(err){
        console.log(err);
        res.send(err);
    }
}

module.exports = verifyUser;