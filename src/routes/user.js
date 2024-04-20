const express = require('express')
const router = express.Router()
const User = require("../models/user")
const vendor = require("../models/vendor")
const items = require("../models/items")
const cart = require("../models/cart")
const cookieParser = require("cookie-parser")
const verifUser = require("../middleware/verifyUser")
const jwt = require("jsonwebtoken");

// use of json file in the router or || app file 
router.use(express.json());
router.use(cookieParser())
const bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({
    extended: true
}))



// --->  /user

router.get("/", async (req, res) => {
    const token = await req.cookies.usertoken;
    if (!token) {
        res.render("user/userlogin");
    }
    else {
        const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
        res.render('user/userhome', { id: verifyUser._id });
    }
})
router.get("/registration", async (req, res) => {
    const error = req.query.error;
    res.render('user/usersign', { error: error });
})


// singup
router.post("/usersignup", async (req, res) => {
    // console.log(req.body);
    const { email, pass, user } = req.body;
    const expireDate = new Date();
    // user is registre for now 6th months
    expireDate.setMonth(expireDate.getMonth() + 6); // Add 6 months

    // console.log(req.body);

    if (!email || !pass || !user) {
        // console.log("hello")
        res.redirect("/user/registration?error=MissingFields")
    }
    else {
        try {
            const usersdb = await User.findOne({ user: user });
            // console.log(usersdb)
            if (usersdb) {
                return res.redirect("/user/registration?error=UsernameTaken");
            }
            const newUser = new User({
                email,
                pass,
                user,
                expireDate
            });
            await newUser.save();
            return res.redirect('/user/')
        }
        catch (err) {
            console.log(err);
            res.status(501).send("server error")
        }
    }
})

// router.get("/categories/:categ", async (req, res) => {
//     const categorie = req.params.categ;

//     const vendordata = await vendor.find({ category: categorie });
//     if (!vendordata) {
//         return res.status(404).json({ error: 'No Category found' });
//     }
//     // console.log(vendordata)
//     res.render("user/usercategories", { vendordata: vendordata, categorie: categorie })
// })

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

router.get("/allItems/:id", verifUser, async (req, res) => {
    const id = req.params.id; // Accessing the id parameter from the URL
    const vendorUser = await vendor.findOne({ _id: id });
    if (!vendorUser) {
        return res.status(404).json({ error: 'Vendor not found' });
    }
    // const allitems = vendorUser.items;
    // Extract items from the vendor
    let category = vendorUser.category;
    const allItems = vendorUser.items.map(item => ({
        itemname: item.itemname,
        price: item.price,
        img: `data:${item.img.contentType};base64,${item.img.data.toString('base64')}`, // Convert binary data to base64 data URI
        _id: item._id,
        data: id
    }));


    // console.log(category)
    res.render("user/userAllItems", { items: allItems, category: category })
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
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // Extracting items along with their IDs
        // console.log(vendorUser)
        const desiredItem = vendorUser.items.find(item => item._id == itemid);
        // console.log(desiredItem)
        const allItems = [{
            _id: desiredItem._id,
            itemname: desiredItem.itemname,
            price: desiredItem.price,
            img: `data:${desiredItem.img.contentType};base64,${desiredItem.img.data.toString('base64')}`
        }];

        // console.log(allItems.length)

        // res.status(200).json({ items: allItems });
        return res.render("user/userCart", { items: allItems, vendorid: vendorid, vendorname: vendorUser.user, userid: verifyUser._id })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }

})


// /user/usersignin
// login
router.post("/usersignin", async (req, res) => {
    // console.log(req.body);
    const { pass, user } = req.body;

    if (!user || !pass) {
        res.redirect("/user")
    }
    else {
        try {
            const { user, pass } = req.body;
            const usersdb = await User.findOne({ user: user });
            if (!usersdb) {
                return res.status(404).json({ error: "Please Enter Correct User and Password", "server": "ok" });
            }

            if (pass == usersdb.pass) {
                try {
                    // this ==> User   value
                    const token = jwt.sign({ _id: usersdb._id }, process.env.SECRET_KEY_TOKEN);
                    // console.log("lakshya" , token);
                    usersdb.token = token
                    await usersdb.save();
                    res.cookie('usertoken', token);

                } catch (error) {
                    console.log("the error part" + error);
                }
                return res.redirect("/user")
            }
            else {
                // Incorect user and password
                return res.status(400).json({ error: "Invalid Crediantial", server: "ok" });
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
        
        // Get the size (length) of the items array
        const itemsSize = userCart.items.length;
        let checkout = false;
        if(itemsSize >= 1) checkout = true;

        res.render("user/userAllCartItem", { Checkout: checkout, items: userCart.items, itemsSize:itemsSize })

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
    const {userName, mobileNum,address,city,pincode,paymentMethod,state} = req.body;

    try {
        const token = req.cookies.usertoken;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);
        // const userdata = await User.findOne({ _id: verifyUser._id });
        if (req.body) {
            // console.log(req.body);
            const cartData = await cart.findOne({user:verifyUser._id})
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
                    userInfo:{
                        userName:userName,
                        mobile:mobileNum,
                        address:address,
                        city:city,
                        pincode:pincode,
                        paymentMethod:paymentMethod,
                        state:state,
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


router.get("/successpayment",verifUser, async (req, res) => {
    const token = req.cookies.usertoken;
    const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);

    let userCart = await cart.findOne({ user: verifyUser._id });
    userCart.items = [];
    await userCart.save();

    res.render("user/successpayment");

})

// Cart logic
// Route for adding items to the cart
router.post("/userAddtoCart", verifUser, async (req, res) => {
    try {
        const token = req.cookies.usertoken;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY_TOKEN);
        // const userdata = await User.findOne({ _id: verifyUser._id });
        // console.log(req.body)
        if (req.body) {
            const { name, price, quantity, total, itemid, vendorid, userid, bidAmt } = req.body;

            // Check if there is already a cart for the user
            let userCart = await cart.findOne({ user: verifyUser._id });

            if (!userCart) {
                // If no cart exists, create a new cart entry
                userCart = new cart({
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

            // Save the updated/created cart to the database
            await userCart.save();

            res.status(200).json({ message: 'Item(s) added to the cart successfully' });
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




module.exports = router;