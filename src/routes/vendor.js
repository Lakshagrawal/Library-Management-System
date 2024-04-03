const express = require('express')
const router = express.Router()
const vendor = require("../models/vendor")
const items = require('../models/items');
const cookieParser = require("cookie-parser")
const verifyVendor = require("../middleware/verifyVendor")
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
    const token = await req.cookies.vendortoken;
    if (!token) {
        res.render("vendorlogin");
    }
    else {
        const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
        res.render('vendorhome', { id: verifyUser._id });
    }

})

router.get("/registration", async (req, res) => {
    res.render('vendorsign');
})


router.get("/allItems/:id", verifyVendor, async (req, res) => {
    const id = req.params.id; // Accessing the id parameter from the URL
    try {
        const vendorUser = await vendor.findOne({ _id: id });
        // console.log(vendorUser)
        if (!vendorUser) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        // const allitems = vendorUser.items;
        // Extract items from the vendor
        const allItems = vendorUser.items.map(item => ({
            itemname: item.itemname,
            price: item.price,
            img: `data:${item.img.contentType};base64,${item.img.data.toString('base64')}` // Convert binary data to base64 data URI
        }));

        // console.log("Items:", allItems);
        res.render("vendorAllItems", { items: allItems })
    } catch (error) {
        console.log(error)
    }

})


router.get("/logout", async (req, res) => {
    res.clearCookie("vendortoken");
    res.redirect('/vendor');
})


// singup
router.post("/vendorsignup", async (req, res) => {
    // console.log(req.body);
    const { email, pass, user, category } = req.body;
    if (!email || !pass || !category || !user) {
        res.redirect("/vendor/registration")
    }
    else {
        try {
            const newUser = new vendor({
                email,
                pass,
                user,
                category
            });
            await newUser.save();
            return res.redirect('/vendor/')
        }
        catch (err) {
            console.log(err);
            res.status(501).send("server error")
        }
    }
})

// login
router.post("/vendorsignin", async (req, res) => {
    // console.log(req.body);
    const { pass, user } = req.body;

    if (!user || !pass) {
        res.redirect("/vendor")
    }
    else {
        try {
            const { user, pass } = req.body;
            const usersdb = await vendor.findOne({ user: user });
            if (!usersdb) {
                return res.status(404).json({ error: "Please Enter Correct User and Password", "server": "ok" });
            }

            if (pass == usersdb.pass) {
                try {
                    // this ==> User   value
                    const token = jwt.sign({ _id: usersdb._id }, process.env.SECRET_KEY_TOKEN);
                    // console.log("lakshya", token);
                    usersdb.token = token
                    await usersdb.save();
                    res.cookie('vendortoken', token);

                } catch (error) {
                    console.log("the error part" + error);
                }
                return res.redirect("/vendor")
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




// Done
router.get("/addItems/:id", verifyVendor, async (req, res) => {
    const id = req.params.id; // Accessing the id parameter from the URL
    res.render("vendorAddItems", { id: id });
})

router.get("/transactions", verifyVendor, async (req, res) => {
    const token = await req.cookies.vendortoken;
    const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
    // console.log(verifyUser)

    if (!token) {
        res.render("vendorlogin");
    }
    else {
        try {
            // Transaction schema define kar na hai 
            const vendorTransaction = await items.find({ vendorid: verifyUser._id });
            const id = req.params.id; // Accessing the id parameter from the URL
            res.render("vendortransaction", {items:vendorTransaction});
        } catch (error) {
            console.log(error)
        }
    }
})



// Import necessary packages
const multer = require('multer');

// Set up Multer storage
const storage = multer.memoryStorage(); // Store files in memory as Buffers
const upload = multer({ storage: storage });

// Controller method to handle file upload
exports.uploadFile = upload.single('img'); // 'img' is the name attribute of the file input field in the form


router.post("/addItems/:id", verifyVendor, upload.single('img'), async (req, res) => {

    const id = req.params.id; // Accessing the id parameter from the URL
    const { itemname, price } = req.body;
    // console.log(req.file)
    try {
        // Find the vendor by ID
        const vendorUser = await vendor.findById(id);
        if (!vendorUser) {
            return res.status(404).json({ error: 'Vendor not found' });
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










module.exports = router;