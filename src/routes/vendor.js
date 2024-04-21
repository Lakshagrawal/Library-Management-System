const express = require('express')
const router = express.Router()
const vendor = require("../models/vendor")
const items = require('../models/items');
const cookieParser = require("cookie-parser")
const verifyVendor = require("../middleware/verifyVendor")
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer")

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
    if (!token) {
        res.render("vendor/vendorlogin",{message});
    }
    else {
        const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
        res.render('vendor/vendorhome', { id: verifyUser._id , message});
    }

})


router.get("/registration", async (req, res) => {
    const error = req.query.error;
    res.render('vendor/vendorsign', { error: error });
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
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // console.log(vendordata)
        const itemIndex = vendordata.items.findIndex(item => item._id.toString() === itemId);

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found' });
        }
        // console.log("item index "+itemIndex)
        vendordata.items.splice(itemIndex, 1); // Remove the item from the items array
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
            subject:"Here's your verification link for Vendor Registraion",
            html:"<p> Hii " + name + `, Please click here to <a href= "http://${process.env.WEBSITE_DOMAIN_NAME}/vendor/verify?id=`+user_id+'">  Verify </a> your mail.</p>'
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
router.post("/vendorsignup", async (req, res) => {
    // console.log(req.body);
    const { email, pass, user, mobile } = req.body;
    const expireDate = new Date();
    // vendor is registre for now 6th months
    expireDate.setMonth(expireDate.getMonth() + 6); // Add 6 months

    if (!email || !pass || !mobile || !user) {
        res.redirect("/vendor/registration?error=MissingFields")
    }
    else {
        try {
            const vendordb = await vendor.findOne({user:user});
            if (vendordb) {
                return res.redirect("/vendor/registration?error=UsernameTaken");
            }

            const newVendor = new vendor({
                email,
                pass,
                user,
                mobile,
                expireDate,
                is_verfied:0,
            });

            const vendorData = await newVendor.save();
            // console.log(vendorData)
            sendVerifyMail(req.body.user,req.body.email,vendorData._id)

            return res.redirect('/vendor/')
        }
        catch (err) {
            console.log(err);
            res.status(501).send("server error")
        }
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
                    if(usersdb.is_verfied === 0){
                        return res.redirect("/vendor?message=Please Verify Vendor on Mail First.")
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
    res.render("vendor/vendorAddItems", { id: id });
})

router.get("/transactions", verifyVendor, async (req, res) => {
    const token = await req.cookies.vendortoken;
    const verifyUser = await jwt.verify(token, process.env.SECRET_KEY_TOKEN)
    // console.log(verifyUser)

    if (!token) {
        res.render("vendor/vendorlogin");
    }
    else {
        try {
            // Transaction schema define kar na hai 
            const vendorTransaction = await items.find({ vendorid: verifyUser._id });
            const id = req.params.id; // Accessing the id parameter from the URL
            res.render("vendor/vendortransaction", {items:vendorTransaction});
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


// Define a route for updating the status of items
router.post('/updateStatus/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const { status } = req.body;
    // console.log(req.body)
    try {
        // Find the item by ID and update its status
        const updatedItem = await items.findByIdAndUpdate(itemId, { status: status }, { new: true });

        if (!updatedItem) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Return the updated item
        res.json(updatedItem);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});









module.exports = router;