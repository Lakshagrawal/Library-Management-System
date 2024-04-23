const express = require('express')
const router = express.Router()
const vendor = require("../models/vendor")
const items = require('../models/items');
const cookieParser = require("cookie-parser")
const verifyVendor = require("../middleware/verifyVendor")
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer")
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: "<h1>Too many requests from this IP, please try again later.</h1>"
});

// use of json file in the router or || app file 
router.use(express.json());
router.use(cookieParser())
const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({
    extended: true
}))



// --->  /vendor

router.get("/", async (req, res) => {
    const token = await req.cookies.vendortoken;
    const message = req.query.message;
    const popup = req.query.popup;
    const popupSuccess = req.query.popupSuccess;

    if (!token) {
        res.render("vendor/vendorlogin",{message, popup, popupSuccess});
    }
    else {
        const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
        res.render('vendor/vendorhome', { id: verifyUser._id , message, popup, popupSuccess});
    }

})

router.get("/registration", async (req, res) => {
    const error = req.query.error;
    const message = req.query.message;
    const popup = req.query.popup;
    res.render('vendor/vendorsign', { error,message,popup });
})


router.get("/allItems/:vendorid", verifyVendor, async (req, res) => {
    const vendorid = req.params.vendorid; // Accessing the id parameter from the URL
    try {
        const vendorUser = await vendor.findOne({ _id: vendorid });
        // console.log(vendorUser)
        if (!vendorUser) {
            return res.redirect("/vendor?popup=Vendor not found")
            // return res.status(404).json({ error: 'Vendor not found' });
        }
        // const allitems = vendorUser.items;
        // Extract items from the vendor
        // console.log(vendorUser)
        const allItems = vendorUser.items.map(item => ({
            id:item._id,
            itemname: item.itemname,
            price: item.price,
            img: `data:${item.img.contentType};base64,${item.img.data.toString('base64')}` // Convert binary data to base64 data URI
        }));
        // console.log(allItems)

        // console.log("Items:", allItems);
        res.render("vendor/vendorAllItems", { items: allItems })
    } catch (error) {
        console.log(error)
    }

})

router.post("/deleteItem", verifyVendor, async (req, res) => {
    const vendorId = req.query.vendorId; // Accessing the vendorId query parameter
    const itemId = req.query.itemId; // Accessing the itemId query parameter
    // console.log(vendorId, " vendor ", itemId)
    try {
        const vendordata = await vendor.findById(vendorId);

        if (!vendordata) {
            // return res.redirect("/vendor?popup=Vendor not found")
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // console.log(vendordata)
        const newItem = vendordata.items.filter(item=> item._id.toString() !== itemId);
        // console.log("item index "+itemIndex)
        vendordata.items = newItem;// Remove the item from the items array
        // console.log(object)
        await vendordata.save(); // Save the updated vendor document

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})


router.get("/logout", async (req, res) => {
    res.clearCookie("vendortoken");
    res.redirect('/vendor');
})


// for send mail
const sendVerifyMail = async(name,email,user_id)=>{
    try {
        const transporter = nodemailer.createTransport({
            host:"smtp.gmail.com",
            port: 587,
            secure:false,
            requireTLS:true,
            auth:{
                user:"lakagrawal144@gmail.com",
                pass: process.env.GMAIL_KEY_SMTP
            }
        });

        const mailOptions = {
            from:"lakagrawal144@gmail.com",
            to:email,
            subject:"Here's your verification link for Vendor Registration",
            // html:"<p> Hii " + name + `, Please click here to <a href= "http://${process.env.WEBSITE_DOMAIN_NAME}/vendor/verify?id=`+user_id+'">  Verify </a> your mail.</p>'
            html:`<p> Hii ${name},</p> <br> <p>Please click here to <a href= "http://${process.env.WEBSITE_DOMAIN_NAME}/vendor/verify?id=${user_id}">  Verify </a> your mail.</p> <br> <p>Regards,</p> <p>Lakshya Agrawal</p>`
        }

        transporter.sendMail(mailOptions,function(error,info){
            if(error){
                console.log(error);
            }
            else{
                console.log("Email has been send :-", info.response);
            }
        })
    } catch (error) {
        console.log(error)
    }
} 

// singup (new id of the vendor)
router.post("/vendorsignup",limiter, async (req, res) => {
    // console.log(req.body);
    try {
        // Input validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, pass, user, mobile } = req.body;
        const expireDate = new Date();
        // vendor is registre for now 6th months
        expireDate.setMonth(expireDate.getMonth() + 6); // Add 6 months
        
        if (!email || !pass || !mobile || !user) {
        res.redirect("/vendor/registration?popup=Please fill in all the fields.")
        }
        else {
            const vendordb = await vendor.findOne({user:user});
            if (vendordb) {
                return res.redirect("/vendor/registration?popup=Username is already taken. Please choose another one.");
            }

            // Check if email ends with "@iitp.ac.in"
            if (!email.endsWith("@iitp.ac.in")) {
                return res.redirect("/user/registration?popup=Only IITP email addresses are allowed for registration.");
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(pass, 10);

            const newVendor = new vendor({
                email,
                pass: hashedPassword,
                user,
                mobile,
                expireDate,
                is_verfied:0,
                is_admin:1
            });

            const vendorData = await newVendor.save();
            // console.log(vendorData)
            sendVerifyMail(req.body.user,req.body.email,vendorData._id)

            return res.redirect('/vendor?popupSuccess=User is created successfully. Please check your mail inbox/junk')
        } 
    }
    catch (err) {
        console.log(err);
        res.status(501).send("Server error")
    }
})

const verifyMail = async(req,res)=>{
    try {
        const updateInfo = await vendor.updateOne({_id:req.query.id},{$set:{is_verfied:1}});
        // console.log(updateInfo);
        return res.redirect("/vendor/")
    } catch (error) {
        console.log(error)
    }
}
router.get("/verify",verifyMail);


// login
router.post("/vendorsignin",limiter, async (req, res) => {
    // console.log(req.body);
    const { pass, user } = req.body;

    if (!user || !pass) {
        res.redirect("/vendor?popup=Please fill in all the fields")
    }
    else {
        try {
            const { user, pass } = req.body;
            const usersdb = await vendor.findOne({ user: user });
            if (!usersdb) {
                return res.redirect('/user?popup=Please Enter Correct User and Password')
                // return res.status(404).json({ error: "Please Enter Correct User and Password", "server": "ok" });
            }

            const isPasswordValid = await bcrypt.compare(pass, usersdb.pass);
            if(!isPasswordValid) {
                return res.redirect('/vendor?popup=Please Enter Correct User and Password');
            }
            else{
                try {
                    if(usersdb.is_verfied === 0){
                        return res.redirect("/vendor?message=Please Verify Vendor on Mail First.")
                    }
                    else if(usersdb.is_admin === 0){
                        return res.redirect("/vendor?popup=You have been blocked by Admin.")
                    }
                    else{
                        // this ==> User   value
                        const token = jwt.sign({ _id: usersdb._id }, process.env.SECRET_KEY_TOKEN);
                        // console.log("lakshya", token);
                        usersdb.token = token
                        await usersdb.save();
                        res.cookie('vendortoken', token);
                        return res.redirect("/vendor")
                    }
                } catch (error) {
                    console.log("the error part" + error);
                }
            }
        }
        catch (err) {
            console.log(err);
            return res.status(501).send("server error")
        }
    }
})




// Done
router.get("/addItems/:vendorid", verifyVendor, async (req, res) => {
    const vendorid = req.params.vendorid; // Accessing the id parameter from the URL
    res.render("vendor/vendorAddItems", { id: vendorid });
})


router.get("/transactions", verifyVendor, async (req, res) => {
    const token = await req.cookies.vendortoken;
    const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
    // console.log(verifyUser)
    try {
        // Transaction schema define kar na hai 
        const vendorTransaction = await items.find({ vendorid: verifyUser._id });
        res.render("vendor/vendortransaction", {items:vendorTransaction});
    } catch (error) {
        console.log(error)
    }
})



// Import necessary packages
const multer = require('multer');

// Set up Multer storage
const storage = multer.memoryStorage(); // Store files in memory as Buffers
const upload = multer({ storage: storage });

// Controller method to handle file upload
exports.uploadFile = upload.single('img'); // 'img' is the name attribute of the file input field in the form


router.post("/addItems/:vendorid", verifyVendor, upload.single('img'), async (req, res) => {
    const { itemname, price } = req.body;
    const token = await req.cookies.vendortoken;
    const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)

    const vendorid = verifyUser._id; // Accessing the id parameter from the URL

    if(vendorid != req.params.vendorid){
        return res.redirect("/vendor?popup=Please don't play with this website.");
    }
    // console.log(req.file)
    try {
        // Find the vendor by ID
        const vendorUser = await vendor.findById(vendorid);
        if (!vendorUser) {
            return res.redirect("/vendor?popup=Please login again after logout.");
        }

        // Create new item for the vendor
        const newItem = {
            itemname,
            price,
            img: {
                data: req.file.buffer, // Access the uploaded file from the request object
                contentType: req.file.mimetype // Set the content type of the file
            }
        };

        // Add the new item to the vendor's items array
        vendorUser.items.push(newItem);

        // Save the vendor with the new item to the database
        await vendorUser.save();
        res.redirect("/vendor")
        // res.json(vendorUser); // Return the updated vendor object
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
})


// Define a route for updating the status of items
router.post('/updateStatus/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const { status } = req.body;
    // console.log(req.body)
    try {
        // Find the item by ID and update its status
        const updatedItem = await items.findByIdAndUpdate(itemId, { status: status }, { new: true });
        // const updatedItem = await items.updateOne({_id:itemId},{$set:{status:status}}); // this is also correct

        if (!updatedItem) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Return the updated item
        return res.json(updatedItem);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});


// for send mail
const forgetPasswordVerifyMail = async (name, email, user_id,resetToken) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: process.env.MAIL_PORT || 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: "lakagrawal144@gmail.com",
                pass: process.env.GMAIL_KEY_SMTP
            }
        });

        const mailOptions = {
            from: "lakagrawal144@gmail.com",
            to: email,
            subject: "Password Reset Request",
            html: ` <p> Hii ${name},</p>
                    <p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>  
                    <p>Please click on the following link to reset your password:</p>
                    <p><a href="https://${process.env.WEBSITE_DOMAIN_NAME}/vendor/resetpassword/${resetToken}">Reset Password</a></p>
                    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: "Failed to send password reset email" });
            }
            else {
                console.log("Email sent for forget password: " + info.response + "User_id is: " + userName);
                // console.log("Email has been send :-", info.response);
                return res.status(200).json({ message: "Password reset instructions sent to your email" });
            }
        })
    } catch (error) {
        console.log(error)
    }
}
router.get("/forgetpassword", async(req, res)=>{
    const message = req.query.message;
    const popup = req.query.popup;
    const popupSuccess = req.query.popupSuccess;
    return res.render("vendor/forgetPassword",{popup,message,popupSuccess});
})
// Route for handling forget password request
router.post("/forgetpassword", async (req, res) => {
    const userName = req.body.user_id;
    // console.log(userName)
    try {
        // Check if the user with the provided email exists
        const userData = await vendor.findOne({ user:userName });

        if (!userData) {
            return res.redirect(`/vendor/forgetpassword?popup=Vendor with this ${userName} does not exist`)
            // return res.status(404).json({ message: "User with this ** does not exist" });
        }

        // Generate a unique token for password reset
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        // Set token expiration time (e.g., 1 hour)
        const tokenExpiration = Date.now() + (5*3600000); // 1 hour in milliseconds

        // Update user document with reset token and token expiration time
        userData.resetPasswordToken = resetToken;
        userData.resetPasswordExpires = tokenExpiration;

        const userEmail = userData.email;
        const userSaveData = await userData.save();
        // console.log(userEmail)
        // console.log(userSaveData)

        // Send an email with password reset instructions
        forgetPasswordVerifyMail(userName,userEmail,userSaveData._id,resetToken);
        return res.redirect('/vendor/forgetpassword?popupSuccess=Password reset link has been sent successfully. Please check your email inbox/junk.')

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
});

// Route for handling password reset
router.get('/resetpassword/:resetToken', async(req, res) => {
    // Get the reset token from the request parameters
    const resetToken = req.params.resetToken;
    const message = req.query.message;
    const popup = req.query.popup;
    const popupSuccess = req.query.popupSuccess;
    
    return res.render("vendor/resetpassword",{popup,message,popupSuccess,resetToken});

});

router.post("/resetpassword/:token", async (req, res) => {
    const resetToken = req.params.token;
    const { newPassword } = req.body;

    try {
        // Find user by reset token and check if the token is not expired
        // $gt means that database date and time must greater that the current time 
        const userData = await vendor.findOne({ resetPasswordToken: resetToken, resetPasswordExpires: { $gt: Date.now() } });

        if (!userData) {
            return res.redirect('/vendor/forgetpassword?popup=Invalid or reset token has expired ')
            // return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password and clear reset token fields
        userData.pass = hashedPassword;
        userData.resetPasswordToken = undefined;
        userData.resetPasswordExpires = undefined;
        await userData.save();

        return res.redirect("/vendor?popupSuccess=Password reset successfully. Now login")
        // return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
});






module.exports = router;