const express = require("express")
const session = require("express-session")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")

const app = express()
const httpServer = require("http").Server(app)

const PORT = 8000

// setup mongoose
mongoose.connect("mongodb+srv://baiken314:melon14764638@cluster0-zsiod.azure.mongodb.net/tetris_99_data?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    games: [{   
        type: mongoose.Schema.Types.ObjectId,
        ref: "Game"
    }]
}, { collection: "users" })

const gameSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    invictus: Boolean,
    position: Number,
    kos: Number,
    badges: Number,
    lines: {
        single: Number,
        double: Number,
        triple: Number,
        tetris: Number
    },
    tSpins: {
        single: Number,
        double: Number,
        triple: Number
    },
    linesSent: Number,
    maxCombo: Number,
    backToBacks: Number,
    allClears: Number,
    date: Date
}, { collection: "games" })

const Game = mongoose.model("Game", gameSchema)
const User = mongoose.model("User", userSchema)


// middleware
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())

app.use(express.static("public"))
app.use(session({
    secret: "mySecret",
    resave: false,
    saveUninitialized: false
}))

app.set("view engine", "ejs")

// routes
app.get("/", (req, res) => {
    res.redirect("/enter-game")
})

app.get("/enter-game", (req, res) => {
    const currentMessage = req.session.message
    req.session.message = ""
    res.render("enter_game", {
        message: currentMessage
    })
})

app.get("/games", (req, res) => {
    Game.find({}).sort({ "position": 1 }).populate("user").exec((err, docs) => {
        res.render("games", {
            games: docs
        })
    })
})

app.get("/register", (req, res) => {
    const message = req.session.message
    req.session.message = ""
    res.render("register", {
        message: message
    })
})

app.get("/users", (req, res) => {
    if (req.query.name) {
        res.redirect(`/users/${req.query.name}`)
    }
    else {
        User.find({}).sort({ "name": 1 }).exec((err, users) => {
            res.render("user_search", {
                users: users
            })
        })
    }
})

// home page of user
app.get("/users/:name", (req, res) => {
    User.findOne({ "name": req.params.name })
        .populate({
            path: "games",
            options: {
                sort: "position"
            }
        })
        .exec((err, user) => {
            res.render("user", { 
                user: user
            })
    })
})

// create a user
app.post("/users/create", (req, res) => {
    User.findOne({ "name": req.body.name }, (err, user) => {
        // user already exists
        if (user) {
            req.session.message = "User already exists."
            res.redirect("/register")
        }
        else {
            // create new user
            User.create({
                name: req.body.name,
                password: req.body.password,
                games: []
            })
            res.redirect(`/users/${req.body.name}`)
        }
    })
})

// create a game
app.post("/games/create", (req, res) => {
    // find user
    User.findOne({ "name": req.body.name }, (err, user) => {
        // check if user exists
        if (user) {
            // check password
            if (req.body.password === user.password) {
                // create game
                Game.create({
                    user: user._id,
                    invictus: req.body.invictus === "on",
                    position: req.body.position,
                    kos: req.body.kos,
                    badges: req.body.badges,
                    lines: {
                        single: req.body.linesSingle,
                        double: req.body.linesDouble,
                        triple: req.body.linesTriple,
                        tetris: req.body.linesTetris
                    },
                    tSpins: {
                        single: req.body.tSpinsSingle,
                        double: req.body.tSpinsDouble,
                        triple: req.body.tSpinsTriple
                    },
                    linesSent: req.body.linesSent,
                    maxCombo: req.body.maxCombo,
                    backToBacks: req.body.backToBacks,
                    allClears: req.body.allClears,
                    date: new Date()
                }, (err, game) => {
                    console.log(user, game)
                    user.games.push(game._id)  // add game to user
                    user.save()
                    res.redirect("/games")  // go to games screen
                })
            }
            // password incorrect
            else {
                req.session.message = "Incorrect password."
                res.redirect("/enter-game")
            }
        }
        // user does not exist
        else {
            req.session.message = "User does not exist."
            res.redirect("/enter-game")
        }
    })
})

// run server
const listener = httpServer.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})  