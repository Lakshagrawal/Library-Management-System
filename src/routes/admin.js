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



// deleteVendor
router.get("/deleteVendor/:id",verifyAdmin,async(req,res)=>{
    const id = req.params.id; // Accessing the id parameter from the URL

    try {
        // Find the vendor document by ID and delete it
        const deletedVendor = await vendor.findByIdAndDelete(id);
        
        if (!deletedVendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // const vendors = await vendor.find();
        
        // res.json(vendors)
        res.redirect("/admin/allVendor");
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
    
})


// deleteUser
router.get("/deleteUser/:id",verifyAdmin,async(req,res)=>{
    const id = req.params.id; // Accessing the id parameter from the URL

    try {
        // Find the vendor document by ID and delete it
        const deletedUser = await User.findByIdAndDelete(id);
        
        if (!deletedUser) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        // const users = await User.find();
        res.redirect("/admin/allUser");
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
    
})


// updatingUser
router.post("/updateUser/:id", async (req, res) => {
    const userId = req.params.id;
    const { username, email, membershipDate } = req.body;
    
    try {
        // Find the user by ID and update the fields
        await User.findByIdAndUpdate(userId, {
            user: username,
            email: email,
            expireDate: membershipDate
        });
        
        // Redirect to some page indicating successful update
        res.redirect("/admin/allUser"); // Replace "/admin/success" with your desired success page
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});




// updatingVendor
router.post("/updateVendor/:id", async (req, res) => {
    const vendorId = req.params.id;
    const { username, email, category, membershipDate } = req.body;
    console.log(req.body)
    try {
        // Find the vendor by ID and update the fields
        await vendor.findByIdAndUpdate(vendorId, {
            user: username,
            email: email,
            category: category,
            expireDate: membershipDate
        });

        // Redirect to some page indicating successful update
        res.redirect("/admin/allVendor"); // Replace with your desired success page
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});





//logout 
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