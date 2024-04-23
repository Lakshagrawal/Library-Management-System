const express = require('express')
const router = express.Router()
const User = require("../models/user")
const vendor = require("../models/vendor")
const items = require("../models/items")
const cart = require("../models/cart")
const cookieParser = require("cookie-parser")
const verifUser = require("../middleware/verifyUser")
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer")
const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});

// use of json file in the router or || app file 
router.use(express.json());
router.use(cookieParser())
const bodyParser = require("body-parser");
const { rmSync } = require('fs')
router.use(bodyParser.urlencoded({
    extended: true
}))



// --->  /user

router.get("/", async (req, res) => {
    const token = await req.cookies.usertoken;
    const message = req.query.message;
    const popup = req.query.popup;
    const popupSuccess = req.query.popupSuccess;

    if (!token) {
        res.render("user/userlogin", { message, popup, popupSuccess });
    }
    else {
        const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
        res.render('user/userhome', { id: verifyUser._id, message, popup, popupSuccess });
    }
})
router.get("/registration", async (req, res) => {
    const error = req.query.error;
    const popup = req.query.popup;
    const message = req.query.message;
    res.render('user/usersign', { error: error, popup, message });
})

// for send mail
const sendVerifyMail = async (name, email, user_id) => {
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
            subject: "Here's your verification link for User Registration",
            html: `<p> Hii ${name},</p> <p>Please click here to <a href= "http://${process.env.WEBSITE_DOMAIN_NAME}/user/verify?id=${user_id}">  Verify </a> your mail.</p> <p>Regards,</p> <p>Lakshya Agrawal</p>`
        }

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: "Failed to send password reset email" });
            }
            else {
                console.log("Email has been send :-", info.response);
                return res.status(200).json({ message: "Password reset instructions sent to your email" });
            }
        })
    } catch (error) {
        console.log(error)
    }
}

// singup
router.post("/usersignup", limiter, async (req, res) => {
    // console.log(req.body);
    try {
        // Input validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, pass, user } = req.body;
        const expireDate = new Date();
        // user is registre for now 6th months
        expireDate.setMonth(expireDate.getMonth() + 6); // Add 6 months

        // console.log(req.body);

        if (!email || !pass || !user) {
            // console.log("hello")
            res.redirect("/user/registration?popup=Please fill in all the fields")
            // res.redirect("/user/registration?error=collegeEmailId")
        }
        else {

            const usersdb = await User.findOne({ user: user });
            // console.log(usersdb)
            if (usersdb) {
                return res.redirect("/user/registration?popup=Username is already taken. Please choose another one");
            }
            // Check if email ends with "@iitp.ac.in"
            if (!email.endsWith("@iitp.ac.in")) {
                return res.redirect("/user/registration?popup=Only IITP email addresses are allowed for registration.");
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(pass, 10);

            const newUser = new User({
                email,
                pass: hashedPassword,
                user,
                expireDate,
                is_verfied: 0,
                is_admin: 1
            });
            const userData = await newUser.save();
            // console.log(userData)
            sendVerifyMail(req.body.user, req.body.email, userData._id)

            return res.redirect('/user?popupSuccess=Please check your email inbox/junk')
        }
    }
    catch (err) {
        console.log(err);
        res.status(501).send("server error")
    }
})


const verifyMail = async (req, res) => {
    try {
        const updateInfo = await User.updateOne({ _id: req.query.id }, { $set: { is_verfied: 1 } });
        // console.log(updateInfo);
        return res.redirect("/user")
    } catch (error) {
        console.log(error)
    }
}
router.get("/verify", verifyMail);


//new route for categories 
router.get("/categories", async (req, res) => {
    // const categorie = req.params.categ;

    const vendordata = await vendor.find();
    if (!vendordata) {
        return res.status(404).json({ error: 'No Category found' });
    }
    // console.log(vendordata)
    res.render("user/usercategories", { vendordata: vendordata, categorie: "All Vendor" })
})

router.get("/allItems/:vendorid", verifUser, async (req, res) => {
    try {
        const vendorid = req.params.vendorid; // Accessing the id parameter from the URL
        const vendorUser = await vendor.findOne({ _id: vendorid });

        if (!vendorUser) {
            return res.redirect('/user?popup=Vendor not found')
            // return res.status(404).json({ error: 'Vendor not found' });
        }

        // Extract items from the vendor
        let category = vendorUser.category;
        const allItems = vendorUser.items.map(item => ({
            itemname: item.itemname,
            price: item.price,
            img: `data:${item.img.contentType};base64,${item.img.data.toString('base64')}`, // Convert binary data to base64 data URI
            _id: item._id,
            vendorid: vendorid
        }));

        // console.log(category)
        res.render("user/userAllItems", { items: allItems, category: category })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})


router.get("/userCart", verifUser, async (req, res) => {
    const vendorid = req.query.vendorid;
    const itemid = req.query.itemid;
    // console.log(vendorid)

    const token = await req.cookies.usertoken;
    const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)

    try {
        const vendorUser = await vendor.findById(vendorid);
        // console.log(vendorUser)
        // console.log(id)
        if (!vendorUser) {
            return res.redirect('/user?popup=Vendor not found')
            // return res.status(404).json({ error: 'Vendor not found' });
        }

        // Extracting items along with their IDs
        // console.log(vendorUser)
        const desiredItem = vendorUser.items.find(item => item._id == itemid);
        // console.log(desiredItem)
        const allItems = {
            _id: desiredItem._id,
            itemname: desiredItem.itemname,
            price: desiredItem.price,
            img: `data:${desiredItem.img.contentType};base64,${desiredItem.img.data.toString('base64')}`
        };

        // console.log(allItems)

        // res.status(200).json({ items: allItems });
        return res.render("user/userCart", { items: allItems, vendorid: vendorid, vendorname: vendorUser.user, userid: verifyUser._id })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

})


// /user/usersignin
// login
router.post("/usersignin", limiter, async (req, res) => {
    // console.log(req.body);
    const { pass, user } = req.body;

    if (!user || !pass) {
        return res.redirect("/user?popup=Please fill in all the fields")
    }
    else {
        try {
            const { user, pass } = req.body;

            const usersdb = await User.findOne({ user: user });
            if (!usersdb) {
                return res.redirect('/user?popup=Please Enter Correct User and Password')
            }

            const isPasswordValid = await bcrypt.compare(pass, usersdb.pass);
            if(!isPasswordValid) {
                return res.redirect('/user?popup=Please Enter Correct User and Password');
            }
            else{
                try {
                    if (usersdb.is_verfied === 0) {
                        return res.redirect("/user?message=Please Verify User on Mail First.")
                    }
                    else if(usersdb.is_admin === 0){
                        return res.redirect("/user?popup=You have been blocked by Admin.")
                    }
                    else {
                        // this ==> User   value
                        const token = jwt.sign({ _id: usersdb._id }, process.env.SECRET_KEY_TOKEN);
                        // console.log("lakshya" , token);
                        usersdb.token = token
                        await usersdb.save();
                        res.cookie('usertoken', token);
                        return res.redirect("/user")
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


router.get("/logout", async (req, res) => {
    res.clearCookie("usertoken");
    res.redirect('/user');
})


router.get("/cart", verifUser, async (req, res) => {
    try {
        const token = req.cookies.usertoken;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);

        // Check if there is already a cart for the user
        let userCart = await cart.findOne({ user: verifyUser._id });

        // Check if userCart is null (no cart found for the user)
        if (!userCart) {
            // Handle the case when no cart is found
            return res.render("user/userAllCartItem", { Checkout: false, items: [], itemsSize: 0 });
        }

        // Get the size (length) of the items array
        let checkout = false;
        let itemsSize = userCart.items.length;
        if (userCart.items.length >= 1) checkout = true;

        return res.render("user/userAllCartItem", { Checkout: checkout, items: userCart.items, itemsSize: itemsSize })

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

})


router.get("/userorderstatus", verifUser, async (req, res) => {
    try {
        const token = req.cookies.usertoken;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);
        const userid = verifyUser._id;

        const userItems = await items.find({ user: userid });

        // Render the userorderstatus view and pass the userItems data to it
        res.render("user/userorderstatus", { items: userItems });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

})


// router.post("/payment", async (req, res) => {
//     // Process payment...

//     // Send response with JavaScript code to clear localStorage
//     const clearLocalStorageScript = `
//         <script>
//             localStorage.clear();
//             // Redirect the user to a success page or perform any other action
//             window.location.href = "/user/successpayment";
//         </script>
//     `;
//     res.send(clearLocalStorageScript);

// })




router.get("/usertransection", verifUser, async (req, res) => {
    res.render("user/usertransection")

})

router.post("/usertransection", verifUser, async (req, res) => {
    // console.log(req.body);
    const { userName, mobileNum, address, city, pincode, paymentMethod, state } = req.body;

    try {
        const token = req.cookies.usertoken;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);
        // const userdata = await User.findOne({ _id: verifyUser._id });
        if (req.body) {
            // console.log(req.body);
            const cartData = await cart.findOne({ user: verifyUser._id })
            // console.log(verifyUser._id)
            // Iterate over the list of items in req.body and save each item individually
            for (const item of cartData.items) {
                const newItem = new items({
                    user: verifyUser._id, // Assuming you want to associate the items with the user
                    items: {
                        name: item.itemname,
                        quantity: item.quantity,
                        total: item.bidAmt,
                        itemsid: item.itemid,
                    },
                    status: "Pending", // Assuming status is always "Pending" for new items
                    vendorid: item.vendorid,
                    userInfo: {
                        userName: userName,
                        mobile: mobileNum,
                        address: address,
                        city: city,
                        pincode: pincode,
                        paymentMethod: paymentMethod,
                        state: state,
                    }
                });

                // Save the newItem object to the database
                await newItem.save();
            }

            res.redirect("/user/successpayment")
        } else {
            throw new Error('Items array is missing or invalid in the request body');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// if you want to integreate razorpay you have to add it here
router.get("/successpayment", verifUser, async (req, res) => {
    const token = req.cookies.usertoken;
    const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);

    let userCart = await cart.findOne({ user: verifyUser._id });
    userCart.items = [];
    await userCart.save();

    res.render("user/successpayment");

})

// Cart logic
// Route for adding items to the cart schema
router.post("/userAddtoCart", verifUser, async (req, res) => {
    // console.log(req.body)
    try {
        const token = req.cookies.usertoken;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);
        // const userdata = await User.findOne({ _id: verifyUser._id });
        if (req.body) {
            const { name, price, quantity, total, itemid, vendorid, userid, bidAmt } = req.body;

            // Check if there is already a cart for the user
            let userCart = await cart.findOne({ user: verifyUser._id });
            
            if (!userCart) {
                // If no cart exists, create a new cart entry
                userCart = await new cart({
                    user: verifyUser._id,
                    items: [{
                        itemname: name,
                        itemid: itemid,
                        price: price,
                        quantity: quantity,
                        vendorid: vendorid,
                        userid: userid,
                        bidAmt: bidAmt,
                        total: total,
                    }]
                });
            } else {

                const existingItem = userCart.items.find(item => item.itemid === itemid);
                // if there is same item in the database then we are not adding it 
                if (!existingItem) {
                    // If cart exists, add the new item to the existing cart
                    userCart.items.push({
                        itemname: name,
                        itemid: itemid,
                        price: price,
                        quantity: quantity,
                        total: total,
                        vendorid: vendorid,
                        bidAmt: bidAmt,
                        userid: userid
                    });
                }

            }
            // console.log(userCart)

            // Save the updated/created cart to the database
            const userCartData = await userCart.save();
            
            return res.status(200).json({ message: 'Item(s) added to the cart successfully' });
        } else {
            throw new Error('Request body is missing or invalid');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get("/removeCartitem", verifUser, async (req, res) => {
    const { itemid } = req.query;
    try {
        const token = req.cookies.usertoken;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);
        // const userdata = await User.findOne({ _id: verifyUser._id });
        let userCart = await cart.findOne({ user: verifyUser._id });
        // console.log(userCart.items.filter(item => item.itemid !== itemid))
        // console.log(itemid)
        if (userCart) {
            // Remove the item from the cart
            userCart.items = userCart.items.filter(item => item.itemid !== itemid);

            // Save the updated cart
            await userCart.save();

            res.redirect("/user/cart")
        } else {
            res.status(404).json({ error: 'Cart not found for the user' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
                    <p><a href="https://${process.env.WEBSITE_DOMAIN_NAME}/user/resetpassword/${resetToken}">Reset Password</a></p>
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
    return res.render("user/forgetPassword",{popup,message,popupSuccess});
})
// Route for handling forget password request
router.post("/forgetpassword", async (req, res) => {
    const userName = req.body.user_id;
    // console.log(userName)
    try {
        // Check if the user with the provided email exists
        const userData = await User.findOne({ user:userName });

        if (!userData) {
            return res.redirect(`/user/forgetpassword?popup=User with this ${userName} does not exist`)
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
        return res.redirect('/user/forgetpassword?popupSuccess=Password reset link has been sent successfully. Please check your email inbox/junk.')

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
    
    return res.render("user/resetpassword",{popup,message,popupSuccess,resetToken});

});

router.post("/resetpassword/:token", async (req, res) => {
    const resetToken = req.params.token;
    const { newPassword } = req.body;

    try {
        // Find user by reset token and check if the token is not expired
        // $gt means that database date and time must greater that the current time 
        const userData = await User.findOne({ resetPasswordToken: resetToken, resetPasswordExpires: { $gt: Date.now() } });

        if (!userData) {
            return res.redirect('/user/forgetpassword?popup=Invalid or reset token has expired ')
            // return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password and clear reset token fields
        userData.pass = hashedPassword;
        userData.resetPasswordToken = undefined;
        userData.resetPasswordExpires = undefined;

        await userData.save();

        return res.redirect("/user?popupSuccess=Password reset successfully. Login")
        // return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;