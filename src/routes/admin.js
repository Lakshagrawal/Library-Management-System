const express = require('express')
const router = express.Router()
// Models import
const vendor = require("../models/vendor")
const admin = require('../models/admin');
const User = require('../models/user');
const cookieParser = require("cookie-parser")
const verifyAdmin = require("../middleware/verifyadmin")
const jwt = require("jsonwebtoken");


// use of json file in the router or || app file 
router.use(express.json());
router.use(cookieParser())
const  bodyParser = require("body-parser");
const user = require('../models/user');
router.use(bodyParser.urlencoded({
    extended:true
}))



// --->  /admin

router.get("/", async(req,res)=>{
    const token = await req.cookies.admintoken;

    if(!token){
        return res.render("admin/adminlogin");
    }
    else{
        const verifyUser = await jwt.verify(token,process.env.SECRET_KEY_TOKEN) 
        return res.render('admin/adminhome',{id:verifyUser._id});
    }
    
})

router.get("/registration", async(req,res)=>{
        res.render('admin/adminsign');
})

router.get("/maintainUser", async(req,res)=>{
        res.render('admin/maintainUser');
})
router.get("/maintainVendor", async(req,res)=>{
        res.render('admin/maintainVendor');
})

router.get("/allUser", verifyAdmin, async(req,res)=>{
    try {
        // Find all users from the User models
        const users = await User.find();
        res.render("admin/adminAlluser",{users});
        // res.json(users)
      } 
      catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
      }
})


router.get("/allVendor", async(req,res)=>{
    try {
        // Find all users from the User models
        const vendors = await vendor.find();
        
        // res.json(vendors)
        res.render("admin/adminAllvendor",{vendors});
      } 
      catch (error) {
        // Handle errors
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
      }
})


// router.get("/allItems/:id",verifyVendor,async(req,res)=>{
//     const id = req.params.id; // Accessing the id parameter from the URL
//     try {
//         const vendorUser = await vendor.findOne({ _id: id});
//         if (!vendorUser) {
//             return res.status(404).json({ error: 'Vendor not found' });
//         }
//         // console.log(vendorUser)
    
   
//     // const allitems = vendorUser.items;
//     // Extract items from the vendor
//     const allItems = vendorUser.items.map(item => ({
//         itemname: item.itemname,
//         price: item.price,
//         img: `data:${item.img.contentType};base64,${item.img.data.toString('base64')}` // Convert binary data to base64 data URI
//     }));
    
//     // console.log("Items:", allItems);
//     // console.log("hello my name is lakshya" , allItems)
//     res.render("vendorAllItems",{items:allItems})
//     } catch (error) {
//         console.log(error)
//         res.send(error)
//     }
    
// })


router.get("/logout",async(req,res)=>{
     res.clearCookie("admintoken");
     res.redirect('/admin');
})


// admin singup
router.post("/adminsignup",async(req,res)=>{
    console.log(req.body);
    const {pass,user} = req.body;
    if(!pass || !user ){
        res.redirect("/user/registration")
    }
    else{
        try{
            // make admin as admin
            let access = 0;
            const newUser = new admin({
                pass,
                user,
                access
            });
            await newUser.save();
            return res.redirect('/admin/')
        }
        catch(err){
            console.log(err);
            res.status(501).send("server error")
        }
    }
})


// login
router.post("/adminsignin",async(req,res)=>{
    // console.log(req.body);
    const {pass,user} = req.body;

    if(!user || !pass){
        res.redirect("/admin")
    }
    else{
        try{
            const {user,pass} =  req.body;
            // console.log(req.body)
            const usersdb = await admin.findOne({user:user});
            if(!usersdb){
                return res.status(404).json({error : "Please Enter Correct User and Password", "server": "ok"});
            }

            if(usersdb.access == 0){
                console.log("admin what's to login")
                return res.json({error : "Admin is not have Access to login", "server": "ok"});
            }
            
            if(pass == usersdb.pass){
                try {
                    // this ==> User   value
                    const token = jwt.sign({_id:usersdb._id},process.env.SECRET_KEY_TOKEN);
                    // console.log("lakshya" , token);
                    usersdb.token = token
                    await usersdb.save();
                    res.cookie('admintoken', token);

                } catch (error) {
                    console.log("Auth is not done properly" + error);
                }

                return res.redirect("/admin")
            }
            else{
                // Incorect user and password
                return res.status(400).json({error:"Invalid Crediantial" , server: "ok"});
            }
        }
        catch(err){
            console.log(err);
            return res.status(501).send("server error")
        }
    }
})










        

module.exports = router;