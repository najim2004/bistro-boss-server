// ----------------import--------------------
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// ----------------import--------------------

// ---------------------middleware--------------------
app.use(
  cors()
  //     {
  //     origin: [
  //       "http://localhost:5173",
  //       "http://localhost:5174",
  //     ],
  //     credentials: true,
  //   }
);
app.use(express.json());
// ---------------------middleware--------------------

// ---------------------custom middleware--------------------

const verifyToken = (req, res, next) => {
  // console.log("28", req.headers.authorization);
  if (!req.headers.authorization) {
    return res
      .status(401)
      .send({ message: "Forbidden Access or You are not Authorized!" });
  }
  const token = req.headers.authorization.split(" ")[1];
  // console.log("36", token);
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      console.log("37", err);
      return res
        .status(401)
        .send({ message: "Forbidden Access or You are not Authorized!" });
    }
    req.decoded = decoded;
    next();
  });
};

// ---------------------custom middleware--------------------

// ---------------------mongoDB--------------------
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d0cidbu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // All collections
    const database = client.db("BISTRO_BOSS_DB");
    const allMenuItemsCollection = database.collection("All_Menu_Items");
    const allReviewsCollection = database.collection("All_Reviews");
    const cartCollection = database.collection("Cart_items");
    const userCollection = database.collection("Users");

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role == "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access!" });
      }
      next();
    };

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // users related api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const userEmail = req.params.email;
      if (userEmail !== req.decoded.email) {
        return res.status(403).send({ message: "Unauthorized access!" });
      }
      const query = { email: userEmail };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin" ? true : false;
      }
      res.send({ admin });
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const update = { $set: { role: "admin" } };
        const result = await userCollection.updateOne(filter, update);
        res.send(result);
      }
    );

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // get all menu items
    app.get("/all-menu-items", async (req, res) => {
      const result = await allMenuItemsCollection.find().toArray();
      res.send(result);
    });
    // get all reviews
    app.get("/all-reviews", async (req, res) => {
      const result = await allReviewsCollection.find().toArray();
      res.send(result);
    });

    // get cart items
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      } else {
        query = {};
      }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    // post cart items
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BISTRO-BOSS SERVER IS RUNNING");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
