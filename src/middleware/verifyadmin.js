const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const admin = require('../models/admin');

const verifyAdmin = async(req,res,next)=>{
    try{
        const token = await req.cookies.admintoken;

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
                            <h1 class="card-title text-center mb-4">Please Log In Admin</h1>
                            <a href="/admin" class="btn btn-primary btn-block">Sign in</a>
                            <a href="/admin/registration" class="btn btn-secondary btn-block">Sign Up</a>
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

        const verifyadmin = await jwt.verify(token,process.env.SECRET_KEY_TOKEN)
        // console.log(verifyUser)
        const userid = await admin.findOne({_id: verifyadmin._id});

        if(token === userid.token){
            next();
        }
        else{
            return res.status(404).json({message:"Please login in again there is some problem"});
        }
    }
    catch(err){
        console.log(err);
        res.send(err);
    }
}

module.exports = verifyAdmin;