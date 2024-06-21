import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import mongoose, { Schema } from "mongoose";
import findOrCreate  from 'mongoose-findorcreate'
import passport from 'passport';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20'
import 'dotenv/config'
import session from 'express-session';

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "ishan077",
  port: 5432,
});
(()=>db.connect())();     //immediately invoked function expression


//mongoose.set("useCreateIndex",true);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use(session({
  secret:"attack on titan",
  resave:false,
  saveUninitialized:false

}));
//var GoogleStrategy = require('passport-google-oauth20').Strategy;
app.use(passport.initialize());
app.use(passport.session());



const uri='mongodb://127.0.0.1/travel';
mongoose.connect(uri);
//mongoose.set("useCreateIndex",true);
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String
})
userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema)


passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id});
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


let googleid;
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/new"
  },
  function(accessToken, refreshToken, profile, cb) {
    googleid=profile.id;
    //console.log(googleid)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      
      return cb(err, user);
    });
  }
));

let currentUserId = 1;
let anotherUserId=1;






app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/new', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

app.get("/logout",async(req,res)=>{
  googleid='';
  
    req.logout(function(){
      res.redirect("/");
    });
    
  })
async function checkVisisted() {
  const result = await db.query("SELECT * FROM visited_countries JOIN users ON users.id = user_id");
  let countries = [];
 // console.log(result.rows);
  result.rows.forEach((country) => {
    if(country.user_id==currentUserId){
      countries.push(country.country_code);
    }
  });
  return countries;
  
}
app.get("/", async (req, res) => {
  if(req.isAuthenticated()){
    let totalusers= await db.query("SELECT * FROM users WHERE googleid=$1",[googleid]);
let users=totalusers.rows;
console.log(totalusers);
  const countries = await checkVisisted();
  console.log(googleid)
  // console.log(currentUserId);
  // console.log(countries);
  res.render("index.ejs", {
    countriesVisited: countries,
    total: countries.length,
    users: users,
    color: "teal",
  });
}else{
  res.redirect("/auth/google");
}
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1 || '%';",
      [input.toLowerCase()]
    );
   // console.log(result);
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
        [countryCode,currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  const result=await db.query("SELECT * FROM visited_countries JOIN users ON users.id = user_id");
  //console.log(result.rows);
  const userid=req.body.user;
  currentUserId=userid;
  const add=req.body.add;
  currentUserId=userid;
  //console.log(userid);
  if(add==="new"){
    res.render("new.ejs");
  }
  else{
    let countries = [];
    result.rows.forEach((country) => {
      if(userid==country.user_id){
        countries.push(country.country_code);
      }
    });
    console.log(countries);
    res.redirect("/")
    // res.render("index.ejs", {
    //   countries: countries,
    //   total: countries.length,
    //   users: users,
    //   color: "teal",
    // });
}


});
app.get("/user",async(req,res)=>{
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: "teal",
    });
      
})

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color, googleid) VALUES($1, $2, $3) RETURNING *;",
    [name, color,googleid]
  );
  //console.log(result);
  users.push(result.rows[0]);

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");

  
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
