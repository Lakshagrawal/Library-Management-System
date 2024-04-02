const express = require('express')
const router = express.Router()
const User = require("../models/User")
const vendor = require("../models/vendor")
const cookieParser = require("cookie-parser")
const verifUser = require("../middleware/verifyUser")
const jwt = require("jsonwebtoken");
// const widgetText= require("../models/widgetText");


// use of json file in the router or || app file 
router.use(express.json());
router.use(cookieParser())
const  bodyParser = require("body-parser");
router.use(bodyParser.urlencoded({
    extended:true
}))



// --->  /user

router.get("/", async(req,res)=>{
    const token = await req.cookies.usertoken;
    if(!token){
        res.render("userlogin");
    }
    else{
        const verifyUser = await jwt.verify(token,process.env.SECRET_KEY_TOKEN) 
        res.render('userhome',{id:verifyUser._id});
    }
})
router.get("/registration", async(req,res)=>{
    res.render('usersign');
})

// Done
// singup
router.post("/usersignup",async(req,res)=>{
    console.log(req.body);
    const {email,pass,user} = req.body;
    if(!email || !pass || !user ){
        console.log("hello")
        res.redirect("/user/registration")
    }
    else{
        try{
            const newUser = new User({
                email,
                pass,
                user
            });
            await newUser.save();
            return res.redirect('/user/')
        }
        catch(err){
            console.log(err);
            res.status(501).send("server error")
        }
    }
})

router.get("/categories/:categ",async(req,res)=>{
    const categorie = req.params.categ;

    const vendordata = await vendor.find({ category:categorie});
    if (!vendordata) {
        return res.status(404).json({ error: 'No Category found' });
    }
    console.log(vendordata.length)
    console.log(vendordata)
    res.render("usercategories",{vendordata:vendordata})
})

router.get("/allItems/:id",verifUser,async(req,res)=>{
    const id = req.params.id; // Accessing the id parameter from the URL
    const vendorUser = await vendor.findOne({ _id: id});
    if (!vendorUser) {
        return res.status(404).json({ error: 'Vendor not found' });
    }
    // const allitems = vendorUser.items;
    // Extract items from the vendor
    const allItems = vendorUser.items.map(item => ({
        itemname: item.itemname,
        price: item.price,
        img: `data:${item.img.contentType};base64,${item.img.data.toString('base64')}`, // Convert binary data to base64 data URI
        _id: item._id,
        data:id
    }));
    
    // console.log("Items:", allItems);
    // console.log("hello my name is lakshya" , allItems)
    // console.log(allItems[0])
    // console.log(id)
    let data = id;
    res.render("userAllItems",{items: allItems})
})


router.get("/userCart",verifUser,async(req,res)=>{
    const vendorid = req.query.vendorid;
    const itemid = req.query.itemid;
    console.log(vendorid)
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
        return res.render("userCart",{items:allItems})

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    
})


// /user/usersignin
// login
router.post("/usersignin",async(req,res)=>{
    // console.log(req.body);
    const {pass,user} = req.body;

    if(!user || !pass){
        res.redirect("/user")
    }
    else{
        try{
            const {user,pass} =  req.body;
            const usersdb = await User.findOne({user:user});
            if(!usersdb){
                return res.status(404).json({error : "Please Enter Correct User and Password", "server": "ok"});
            }

            if(pass == usersdb.pass){
                try {
                    // this ==> User   value
                    const token = jwt.sign({_id:usersdb._id},process.env.SECRET_KEY_TOKEN);
                    console.log("lakshya" , token);
                    usersdb.token = token
                    await usersdb.save();
                    res.cookie('usertoken', token);

                } catch (error) {
                    console.log("the error part" + error);
                }
                return res.redirect("/user")
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



router.get("/", async(req,res)=>{
    res.render('vendorsign');
})

router.get("/postyourblog", async(req,res)=>{
    let widget = await widgetText.findOne();
    res.render("blog",{text:widget})
})


router.get("/logOut",async(req,res)=>{
     res.clearCookie("jwtoken");
     res.redirect('/user');
})


// Done
router.post("/VerifySignup",async(req,res)=>{
    // console.log(req.body);
    const {name,email,pass,cpass,user} = req.body;
    if(!name || !email || !pass || !cpass || !user || (pass != cpass)){
        res.redirect("/user/registration")
    }
    else{
        const port = process.env.APP_PORT || 3000;
        let url = `http://localhost:${port}/api/signUp`;
        try{

            let apiVerify = await fetch(url,{
                method:"POST",
                headers:{
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    req.body
                ),
                redirect: 'follow'
            })
            let vall = await apiVerify.json();
            let statusCode = await apiVerify.status;
            // console.log(statusCode);

            if(statusCode === 200){  
                // console.log("success in user creation, take time to verify it by the admin");
                // res.write("<h1>Success in user creation, take time to verify it by the admin</h1>")
                // res.write('<a href="/user">Login in</a>')
                // res.send();
                res.redirect('/user')
            }
            else{
                res.send(vall);
            }
        }
        catch(err){
            console.log(err);
            res.status(400).send("Not able to Registration user")
        }
    }
})





// Done
router.post("/verifyLogin",async(req,res)=>{
    // console.log("login-in");
    // console.log(req.body);

    // let url = "http://localhost:3000/api/signIn";
    const port = process.env.APP_PORT || 3000;
    const url = `http://localhost:${port}/api/signIn`;

    let {user,pass} = req.body;

    if(!user || !pass){
        res.redirect("/user")
    }
    else{
        const apiVerify = await fetch(url,{
            method:"POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body),
            redirect: 'follow'
        })
        // console.log(apiVerify);
        let vall = await apiVerify.json();
        // console.log(vall);

        let statusCode = apiVerify.status;

        if(statusCode === 200){
            const token = vall.message;
            // console.log(token);
            res.cookie("jwtoken",token,{
                expires :new Date(Date.now()+1260000),
                httpOnly:true,
                // //secure is use in the production 
                // secure:true 
            });
            let widget = await widgetText.findOne();
            res.render('blog',{text:widget});
        }
        else{
            res.send(vall);
        }
    }
    
    
})







router.post("/postBlog",async(req,res)=>{
    
    const {title,context} =  req.body;
    
    if(!title || !context){
        res.status(400).send("Please fill the data");
    }
    else{
        let arr = await blog.find({});
        let n = arr.length;
        let thereisduplicate = false;
        
        const token = await req.cookies.jwtoken;
        const verifyUser = await jwt.verify(token,process.env.SECRET_KEY_TOKEN)
        const user = await newUser.findOne({_id: verifyUser._id});

        for(let i=0;i<n;i++){
            if(arr[i].title === title){
                thereisduplicate = true;
                break;
            }
        }
        
        if(thereisduplicate === true){
            res.send("No same title is allow")
        }
        else{
            req.body.sr = n + 1;
            req.body.date = await new Date().toJSON();;
            req.body.user = user.name;
            console.log(req.body);
            blog.create(req.body);
            
            res.write("<h1>Success in Blog Creation, Blog have been Save in the database</h1>")
            res.write('<a href="/user/postyourblog">New Blog</a> <br> <br>')
            res.write('<a href="/">See Your blog</a>')
            res.send();
        }
        
    }
})
        

module.exports = router;