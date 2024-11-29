const jwt = require("jsonwebtoken")
// const cookieParser = require("cookie-parser")
const vendor = require('../models/vendor');

const verifyVendor = async(req,res,next)=>{
    try{
        const token = await req.cookies.vendortoken;

        if(!token){
            res.write(`
            <html>
            <head>
                <title>Login Page</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body>
                <div class="container mt-5">
                    <div class="card mx-auto" style="max-width: 400px;">
                        <div class="card-body text-center">
                            <h1 class="card-title text-center mb-4">Please Log In Vendor</h1>
                            <a href="/vendor" class="btn btn-primary btn-block">Sign in</a>
                            <a href="/vendor/registration" class="btn btn-secondary btn-block">Sign Up</a>
                        </div>
                    </div>
                </div>
                <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
            </body>
            </html>
        `);
        return res.send();
        }

        const verifyUser = await jwt.verify(token,process.env.SECRET_KEY_TOKEN)
        // console.log(verifyUser)
        const vendorUser = await vendor.findOne({_id: verifyUser._id});

        if(token === vendorUser.token){
            next();
        }
        else{
            return res.status(404).json({message:"Please login in again there is some problem"});
            // res.status(404).json({message:"No entry to post your blog"});
        }
    }
    catch(err){
        console.log(err);
        res.send(err);
    }
}

module.exports = verifyVendor;