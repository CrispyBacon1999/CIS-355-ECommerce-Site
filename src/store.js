const { readFileSync, writeFileSync } = require("fs");

// Represents the item ids as the key, with the user name as the value
let item_ids = {};
let users = [];

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
        let data = readFileSync("users.json").toString();
        users = JSON.parse(data);
        for (let i = 0; i < users.length; i++) {
            for (let j = 0; j < users[i].items.length; j++) {
                item_ids[users[i].items[j].id] = users[i].user_name;
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
    for (let i = 0; i < users.length; i++) {
        if (users[i].user_name === user_name) {
            return i;
        }
    }
    return -1;
}

/**
 * Returns the user with the specified username
 * @param {*} user_name
 * @returns User object
 */
function getUser(user_name) {
    const idx = getUserIndexByUsername(user_name);
    if (idx === -1) {
        return null;
    }
    return users[idx];
}

/**
 * Searches through the list of users to find the user with
 * the item with the id.
 *
 * @param item_id The item id to find
 * @returns The item object
 */
function getItem(item_id) {
    let user_name = item_ids[item_id];
    if (user_name !== undefined) {
        let idx = getUserIndexByUsername(user_name);
        for (let i = 0; i < users[idx].items.length; i++) {
            if (users[idx].items[i].id === item_id) {
                return {
                    user_index: idx,
                    item: users[idx].items[i],
                    item_index: i,
                };
            }
        }
    }
}

function getItems() {
    const itemList = [];
    for (const item_id of Object.keys(item_ids)) {
        const item = getItem(parseInt(item_id));
        item.seller = item_ids[item_id];
        itemList.push(item);
    }
    return itemList;
}

/**
 * As long as there are not more than 100 ids already created,
 * will generate a random id.
 *
 * @returns The new id
 */
function generateId() {
    while (Object.keys(item_ids).length < 100) {
        let number = Math.floor(Math.random() * 100);
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
        return false;
    }
    users.push({
        user_name: user_name,
        name: name,
        balance: balance,
        items: [],
    });
    writeDatabase();
    return true;
}

/**
 * Removes the user with username from the database.
 *
 * @param user_name The username to delete
 */
function deleteUser(user_name) {
    let idx = getUserIndexByUsername(user_name);
    let user = users[idx];
    if (idx > -1) {
        users.splice(idx, 1);
        // Remove items from map of current items
        for (let i_4 = 0; i_4 < user.items.length; i_4++) {
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
    let idx = getUserIndexByUsername(user_name);
    if (idx > -1) {
        let id = generateId();
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
    let idx = getUserIndexByUsername(user_name);
    if (idx === -1) return false;
    if (!(item_id in item_ids)) return false;
    let item = getItem(item_id);
    if (item === undefined) return false;
    if (item.user_index === idx) return false;
    console.log(users[item.user_index], item.item);
    if (users[idx].balance < item.item.price) return false;
    // Deduct balance from buyer
    users[idx].balance -= item.item.price;
    // Add balance to seller
    users[item.user_index].balance += item.item.price;
    // Remove item from seller
    users[item.user_index].items.splice(item.item_index, 1);
    // Add item to buyer
    users[idx].items.push(item.item);
    // Update item map
    item_ids[item_id] = users[idx].user_name;
    writeDatabase();
    return true;
}

module.exports = {
    readDatabase,
    getItem,
    getItems,
    addUser,
    deleteUser,
    addItem,
    buyItem,
    getUser,
};
