const { Table } = require("console-table-printer");
const minimist = require("minimist");
const { readFileSync, writeFileSync } = require("fs");

// Represents the item ids as the key, with the user name as the value
var item_ids = {};
var users = [];

/**
 * Reads the database file (users.json), and stores its value
 * in the users array. If the file does not exist, will write
 * an empty array to the file, and set the users array to an
 * empty array.
 *
 * Will also add the ids of all items to a set to keep track of
 * which ids have been used, along with the user that owns it
 */
function readDatabase() {
    try {
        var data = readFileSync("users.json").toString();
        users = JSON.parse(data);
        for (var i_1 = 0; i_1 < users.length; i_1++) {
            for (var j_1 = 0; j_1 < users[i_1].items.length; j_1++) {
                item_ids[users[i_1].items[j_1].id] = users[i_1].user_name;
            }
        }
    } catch (err) {
        console.error(err);
        if (err.code === "ENOENT") {
            users = [];
            console.log("File does not exist, creating empty file.");
            writeDatabase();
        } else {
            throw err;
        }
    }
}

/**
 * Writes the current value of the users array to the file
 * to keep it up to date with the latest data.
 */
function writeDatabase() {
    writeFileSync("users.json", JSON.stringify(users, null, 4));
}

/**
 * Searches the users array for a user with the username passed in
 * and will return the index of the object in the array.
 *
 * If no user with username is found, will return -1.
 *
 * @param user_name The username to search for
 * @returns The index of the user in the users array
 */
function getUserIndexByUsername(user_name) {
    for (var i_2 = 0; i_2 < users.length; i_2++) {
        if (users[i_2].user_name === user_name) {
            return i_2;
        }
    }
    return -1;
}

/**
 * Searches through the list of users to find the user with
 * the item with the id.
 *
 * @param item_id The item id to find
 * @returns The item object
 */
function getItem(item_id) {
    var user_name = item_ids[item_id];
    if (user_name !== undefined) {
        var idx = getUserIndexByUsername(user_name);
        for (var i_3 = 0; i_3 < users[idx].items.length; i_3++) {
            if (users[idx].items[i_3].id === item_id) {
                return {
                    user_index: idx,
                    item: users[idx].items[i_3],
                    item_index: i_3,
                };
            }
        }
    }
}

/**
 * As long as there are not more than 100 ids already created,
 * will generate a random id.
 *
 * @returns The new id
 */
function generateId() {
    while (Object.keys(item_ids).length < 100) {
        var number = Math.floor(Math.random() * 100);
        // Check if the id already exists
        if (!(number in item_ids)) {
            return number;
        }
    }
    return -1;
}

/**
 * Creates a new user in the database. If a user already exists,
 * exits the function immediately and does not add a new user.
 *
 * @param user_name The new username to add
 * @param name The user's name
 * @param balance Their starting balance
 */
function addUser(user_name, name, balance) {
    if (getUserIndexByUsername(user_name) !== -1) {
        return console.error(
            "This username is already taken. Please choose a different one."
        );
    }
    users.push({
        user_name: user_name,
        name: name,
        balance: balance,
        items: [],
    });
    writeDatabase();
}

/**
 * Removes the user with username from the database.
 *
 * @param user_name The username to delete
 */
function deleteUser(user_name) {
    var idx = getUserIndexByUsername(user_name);
    var user = users[idx];
    if (idx > -1) {
        users.splice(idx, 1);
        // Remove items from map of current items
        for (var i_4 = 0; i_4 < user.items.length; i_4++) {
            delete item_ids[user.items[i_4].id];
        }
        writeDatabase();
    } else {
        console.error("That user does not exist.");
    }
}

/**
 * Adds a new item to the database.
 * Will assign it to the user specified.
 *
 * @param user_name User name to give the item to
 * @param item_name Name of the item
 * @param item_price Price of the item
 */
function addItem(user_name, item_name, item_price) {
    var idx = getUserIndexByUsername(user_name);
    if (idx > -1) {
        var id = generateId();
        if (id > -1) {
            users[idx].items.push({
                id: id,
                name: item_name,
                price: item_price,
            });
            item_ids[id] = user_name;
            writeDatabase();
        } else {
            console.error(
                "Too many items in database, no more room for new ids"
            );
        }
    } else {
        console.error("That user does not exist.");
    }
}

/**
 * Transfers ownership of an item to a new user.
 *
 * @param user_name User to buy the item
 * @param item_id ID of the item
 */
function buyItem(user_name, item_id) {
    var idx = getUserIndexByUsername(user_name);
    if (idx === -1) return console.error("That user does not exist.");
    if (!(item_id in item_ids))
        return console.error("That item does not exist.");
    var item = getItem(item_id);
    if (item === undefined)
        return console.error(
            "Something wild went wrong. Item exists, but was not found."
        );
    if (item.user_index === idx)
        return console.error("Whoa there, you can't buy your own items!");
    if (users[item.user_index].balance < item.item.price)
        return console.error("You don't have enough money for that.");
    // Deduct balance from buyer
    users[idx].balance -= item.item.price;
    // Add balance to seller
    users[item.user_index].balance += item.item.price;
    // Remove item from seller
    delete users[idx].items[item.item_index];
    // Add item to buyer
    users[idx].items.push(item.item);
    // Update item map
    item_ids[item_id] = users[idx].user_name;
    writeDatabase();
}

/**
 * Prints out the list of users in a formatted table
 */
function viewUsers() {
    var table = new Table({
        columns: [
            { name: "user_name" },
            { name: "name" },
            { name: "balance" },
            { name: "item_count", title: "Items for sale" },
        ],
    });
    users.forEach(function (user) {
        table.addRow({
            user_name: user.user_name,
            name: user.name,
            balance: "$" + user.balance,
            item_count: user.items.length,
        });
    });
    table.printTable();
}

/**
 * Prints out the list of products in a formatted table
 */
function viewProducts() {
    var table = new Table({
        columns: [
            { name: "id" },
            { name: "name" },
            { name: "seller" },
            { name: "price" },
        ],
    });
    Object.keys(item_ids).forEach(function (id) {
        var item = getItem(parseInt(id));
        if (item !== undefined) {
            table.addRow({
                id: id,
                name: item.item.name,
                seller: users[item.user_index].user_name,
                price: "$" + item.item.price,
            });
        }
    });
    table.printTable();
}

readDatabase();
var argv = minimist(process.argv.slice(2));

if (argv.addUser !== undefined && argv.addUser === true) {
    addUser(argv.username, argv.name, argv.balance ? argv.balance : 0);
}

if (argv.deleteUser !== undefined && argv.deleteUser === true) {
    deleteUser(argv.username);
}

if (argv.buy !== undefined && argv.buy === true) {
    buyItem(argv.buyer, argv.itemid);
}

if (argv.addItem !== undefined && argv.addItem === true) {
    addItem(argv.owner, argv.name, argv.price);
}

if (argv.view !== undefined) {
    if (argv.view === "all" || argv.view === "users") {
        viewUsers();
    }
    if (argv.view === "all" || argv.view === "products") {
        viewProducts();
    }
}
