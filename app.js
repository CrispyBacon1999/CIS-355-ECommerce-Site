const express = require("express");
const store = require("./src/store");
const path = require("path");

store.readDatabase();
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/favicon.ico", express.static("public/gauntlet.ico"));

/**
 * Redirect index page to login
 */
app.get("/", (req, res) => {
    res.redirect("/signin");
});

/**
 * Send the request to register a new user
 */
app.post("/register", (req, res) => {
    const { user_name, name, starting_balance } = req.body;
    store.addUser(user_name, name, starting_balance);
    res.redirect(`/${user_name}`);
});

/**
 * Send a login request
 */
app.post("/login", (req, res) => {
    const { user_name } = req.body;
    console.log(user_name);
    const user = store.getUser(user_name);
    if (user === null) {
        return res.redirect("/signup");
    }
    return res.redirect(`/${user_name}`);
});

/**
 * Return the signup page
 */
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

/**
 * Return the signin page
 */
app.get("/signin", (req, res) => {
    res.render("signin.ejs");
});

/**
 * Buy an item
 */
app.post("/buy", (req, res) => {
    const { item_id, buyer } = req.body;
    const successful = store.buyItem(buyer, parseInt(item_id));
    return res.redirect(`/${buyer}`);
});

/**
 * Return the user page
 */
app.get("/:user_name", (req, res) => {
    const { user_name } = req.params;
    const user = store.getUser(user_name);
    const items = store.getItems();
    if (user !== null) {
        return res.render("user.ejs", { user, items });
    }
    return res.status(404).send();
});

app.listen(3000, () => {
    console.log("Listening on http://localhost:3000");
});
