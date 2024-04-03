const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const User = require('../models/admin');

const verifyAdmin = async(req,res,next)=>{
    try{
        const token = await req.cookies.usertoken;

        if(!token){
            res.write("<h1>Please Log In </h1>")
            res.write('<a href="/admin">Sign in</a> <br> <br>')
            res.write('<a href="/admin/registration">Sign Up</a>')
            return res.send();
        }

        const verifyadmin = await jwt.verify(token,process.env.SECRET_KEY_TOKEN)
        // console.log(verifyUser)
        const userid = await admin.findOne({_id: verifyadmin._id});

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

module.exports = verifyAdmin;