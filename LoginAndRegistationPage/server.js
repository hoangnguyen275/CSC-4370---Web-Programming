const express = require("express"); //imports the express module
const crypt = require("crypto"); //built-in module used to hash passwords
const app = express(); //creates the express application object
app.use(express.urlencoded({ extended: true })); //lets us read form data from req.body
app.use(express.static("public")); //register public as the directory for static files (the html pages)

const mysql = require("mysql2"); //uses new mysql package
//the password and other settings come from the .env file (loaded by "npm start")
const conn = mysql.createConnection({
	host: process.env.DB_HOST || "localhost",
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASSWORD || "",
	database: process.env.DB_NAME || "paws",
	port: Number(process.env.DB_PORT || 3306)
});

const hashRounds = 100000; //how many times pbkdf2 repeats the hashing
const hashLength = 64; //length of the hash in bytes

//a new random salt is created for every user, so two users with the same password get different hashes
function hashPassword(plainPass, salt)
{
	return crypt.pbkdf2Sync(plainPass, salt, hashRounds, hashLength, "sha512").toString("hex");
}

//escapes <, >, & and quotes so a username cannot inject html into the response
function escapeHtml(text)
{
	return String(text).replace(/[&<>"']/g, function(c) { return "&#" + c.charCodeAt(0) + ";"; });
}

//creates the login_accounts table in the paws database if it does not exist yet
const createTable = "create table if not exists login_accounts (" +
	"id int auto_increment primary key," +
	"username varchar(50) not null unique," +
	"email varchar(100) not null unique," +
	"password varchar(128) not null," + //hashed password, never the plain text
	"salt varchar(32) not null)";

conn.connect(function(err)
{
	if (err)
	{
		console.log("Couldnt connect to MySQL", err);
		return;
	}
	console.log("Database connection established");
	conn.query(createTable, function(err)
	{
		if (err)
			console.log("Could not create the login_accounts table", err);
		else
			app.listen(3000, function() { console.log("Server running at http://localhost:3000/register.html"); });
	});
});

//runs when the form in register.html is submitted (action="/register")
app.post("/register", function(req, res)
{
	let username = req.body.username;
	let email = req.body.email;
	let plainPass = req.body.password;
	if (!username || !email || !plainPass)
	{
		res.send('<p>All fields are required. <a href="register.html">Back to register</a></p>');
		return;
	}

	let salt = crypt.randomBytes(16).toString("hex"); //random salt for this user
	let hashedPass = hashPassword(plainPass, salt);
	let sql = "insert into login_accounts (username,email,password,salt) values (?,?,?,?)";
	conn.query(sql, [username, email, hashedPass, salt], function(err, result)
	{
		if (err && err.code === "ER_DUP_ENTRY") //username or email is already in the table
			res.send('<p>That username or e-mail is already registered. <a href="register.html">Back to register</a></p>');
		else if (err)
		{
			console.log("There was an error inserting an account", err);
			res.send('<p>Something went wrong. <a href="register.html">Back to register</a></p>');
		}
		else
			res.send("<p>You have successfully registered, " + escapeHtml(username) + '! <a href="login.html">Login</a> here</p>');
	});
});

//runs when the form in login.html is submitted (action="/login")
app.post("/login", function(req, res)
{
	let username = req.body.username;
	let plainPass = req.body.password || "";

	//look the user up first, because we need their salt to hash the password they typed
	let sql = "select password, salt from login_accounts where username = ?";
	conn.query(sql, [username || ""], function(err, result)
	{
		if (err)
		{
			console.log("Login query failed", err);
			res.send('<p>Something went wrong. <a href="login.html">Back to login</a></p>');
		}
		else if (result.length === 0 || hashPassword(plainPass, result[0].salt) !== result[0].password)
			//same message for a wrong username and a wrong password, so nobody can tell which one was wrong
			res.send('<p>The login credentials were incorrect<br><a href="login.html">Back to login</a></p>');
		else
			res.redirect("/success.html"); //success.html shows "You have logged in successfully"
	});
});

//there are no sessions, so logging out simply sends the user back to the login page
app.post("/logout", function(req, res)
{
	res.redirect("/login.html");
});
