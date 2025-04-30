const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const serviceAccount = require('./gadgetshop-88be7-firebase-adminsdk-2dw7i-0593a198f5.json')
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 4000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
//middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'https://mobile-shop-stride.vercel.app'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

//verify jwt token
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ message: "No Token" })
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (err, decoded) => {
    if (err) {
      return res.send({ message: "Invalid token" })
    }
    req.decoded = decoded;
    next()
  })
};

//verify seller
const verifySeller = async (req, res, next) => {
  const email = req.decoded.email
  const query = { email: email }
  const user = await userCollection.findOne(query)
  const isSeller = user?.role === 'seller'
  if (!isSeller) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  next()
}

//mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nh9hntn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})
const dbConnect = async () => {
  try {
    client.connect();
    console.log("Database connected successfully");

  } catch (error) {
    console.log(error.name, error.message);
  }
}
dbConnect()
app.use(cookieParser())

//db Collection
const userCollection = client.db('MobileShopDB').collection('users')
const categoryCollection = client.db('MobileShopDB').collection('categories')
const productCollection = client.db('MobileShopDB').collection('products')
const wishListCollection = client.db('MobileShopDB').collection('wishlist')
const cartCollection = client.db('MobileShopDB').collection('cart')

//api

app.get("/", (req, res) => {
  res.send("server is running")
})

//jwt
app.post("/authentication", (req, res) => {
  const userEmail = req.body
  const token = jwt.sign(userEmail, process.env.ACCESS_KEY_TOKEN, { expiresIn: '10d' })
  res.send({ token })

})

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email
  const query = { email: email }
  const user = await userCollection.findOne(query)
  const isAdmin = user?.role === 'admin'
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  next()
}
const verifyBuyer = async (req, res, next) => {
  const email = req.decoded?.email
  const query = { email: email }
  const user = await userCollection.findOne(query)
  const isbuyer = user?.role === 'buyer'
  if (!isbuyer) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  next()
}


//find admin
app.get('/user/admin/:email', verifyToken, async (req, res) => {
  console.log("clicked");
  const email = req.params.email;
  console.log("decoded data", req.decoded);
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" })
  }
  const query = { email: email }
  const user = await userCollection.findOne(query);
  let admin = false
  if (user) {
    admin = user?.role === 'admin'
  }
  res.send({ admin })
})

//find Buyer
app.get('/user/buyer/:email', verifyToken, async (req, res) => {
  console.log("clicked");
  const email = req.params.email;
  console.log("decoded data", req.decoded);
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" })
  }
  const query = { email: email }
  const user = await userCollection.findOne(query);
  let buyer = false;
  if (user) {
    buyer = user?.role === 'buyer'
  }
  res.send({ buyer })
})

//find Seller
app.get('/user/seller/:email', verifyToken, async (req, res) => {
  console.log("clicked");
  const email = req.params.email;
  console.log("decoded data", req.decoded);
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" })
  }
  const query = { email: email }
  const user = await userCollection.findOne(query);
  let seller = false;
  if (user) {
    seller = user?.role === 'seller'
  }
  res.send({ seller })
})

app.post('/users/:email', async (req, res) => {
  const email = req.params.email
  const user = req.body
  const query = { email: email }
  const options = { upsert: true }
  const isExist = await userCollection.findOne(query)
  if (isExist) return res.send(isExist)
  const result = await userCollection.insertOne(user)
  res.send(result)
})
//add category
app.post('/addCategory',verifyToken,verifySeller, async (req, res) => {
  const receivedData= req.body;
  const categoryName= receivedData.categoryName
  const query= {categoryName: categoryName}
  const isExist = await categoryCollection.findOne(query)
  if (isExist) return res.send("already added")
    const result= await categoryCollection.insertOne(receivedData)
  res.send(result);
})
//get all categories
app.get('/getAllCategories', async (req, res) => {
  try {
    const newCateories= await categoryCollection.find().toArray();
    console.log(newCateories);

    // res.json(uniqueCategories);
    res.send(newCateories)
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
//get user
app.get("/user/:email", async (req, res) => {
  const query = { email: req.params.email }
  const user = await userCollection.findOne(query)
  res.send(user)
})

//add product
app.post("/addProduct",verifyToken,verifySeller, async (req, res) => {
  const product = req.body;
  const result = await productCollection.insertOne(product);
  res.send(result);
})
//get seller products
app.get("/getSellerProducts/:email", async (req, res) => {
  const email = req.params.email;
  const query = { sellerEmail: email }
  const products = await productCollection.find(query).toArray()
  res.send(products)
})

//get all user
app.get("/getAllUser", async (req, res) => {
  const users = await userCollection.find().toArray()
  res.send(users)
})

//get all products
app.get("/allProducts", async (req, res) => {
  //name searching
  //sort by price
  //filter by price
  //filter by brand

  const { name, sort, category,seller, brand, page=1, limit=6 } = req.query;
  const query = {}
  if (name) {
    query.name = { $regex: name, $options: 'i' }
  }
  if (category) {
    query.category = { $regex: category, $options: 'i' }
  }
  if(seller)
    {
      query.seller = seller;
    }
  if (brand) {
    query.brand = brand;
  }
 
  const pageNumber= Number(page);
  const limitNumber= Number(limit);

  const totalProducts = await productCollection.countDocuments(query)
  const sortOption = sort === 'asc' ? 1 : -1
  const products = await productCollection.find(query).skip((pageNumber-1)* limitNumber).limit(limitNumber).sort({ price: sortOption }).toArray()
  const productInfo = await productCollection.find({}, { projection: { category: 1, brand: 1, seller: 1 } }).toArray();

  const brands = [...new Set(productInfo.map((product) => product.brand))]
  const categories = [...new Set(productInfo.map((product) => product.category))]
  const sellers = [...new Set(productInfo.map((product) => product.seller))]

  res.json({ products, brands, categories, totalProducts,sellers })

})

//delete users
app.delete('/userRemove/:email', async (req, res) => {
  const email = req.params.email;
  const filter = { email: email };
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    // Delete user by UID
    await admin.auth().deleteUser(uid);

    //Delete user from Database
    const result = await userCollection.deleteOne(filter)
    if (result.deletedCount === 0) {
      return res.status(404).send({ success: false, message: "User not found" });
    }

    res.status(200).send({ success: true, message: `User with email ${email} deleted successfully.` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ success: false, message: error.message });
  }
});

app.patch("/userUpdateToSeller/:email",verifyToken,verifyAdmin, async (req, res) => {
  console.log("seller clicked");
  const email = req.params.email
  const filter = { email: email }
  const updatedDoc = {
    $set: {
      role: "seller"
    }
  };
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
})
app.patch("/userUpdateToBuyer/:email",verifyToken,verifyAdmin, async (req, res) => {
  const email = req.params.email
  const filter = { email: email }
  const updatedDoc = {
    $set: {
      role: "buyer"
    }
  };
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result);
});

app.get("/getFeaturedProducts", async (req, res) => {
  try {
    const products = await productCollection
      .find({ price: { $gt: 10000 } }) // Filter: Price greater than 10,000
      .limit(4) // Limit the result to 3 items
      .toArray(); // Convert the result to an array
    res.send(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ error: "Failed to fetch products" });
  }
});

app.post("/addToWishlist", async (req, res) => {
  const product = req.body
  delete product._id
  const result = await wishListCollection.insertOne(product)
  res.send(result)
})
app.post("/addToCart", async (req, res) => {
  const product = req.body;
  delete product._id
  const result = await cartCollection.insertOne(product)
  res.send(result)
})

app.get("/getWishList/:email", async (req, res) => {
  const email = req.params.email
  const query = { email: email }
  const product = await wishListCollection.find(query).toArray()
  res.send(product)
})

app.get("/getCartItem/:email", async (req, res) => {
  const email = req.params.email
  const query = { email: email }
  const product = await cartCollection.find(query).toArray()
  res.send(product)
})

app.delete("/wishlistRemove/:_id", async (req, res) => {

  const id = req.params._id;
  const filter = { _id: new ObjectId(id) };
  const result = await wishListCollection.deleteOne(filter);
  res.send(result)
});

app.delete("/cartRemove/:_id", async (req, res) => {

  const id = req.params._id;

  const filter = { _id: new ObjectId(id) };

  const result = await cartCollection.deleteOne(filter);
  res.send(result)
});

app.listen(port, () => {
  console.log(`server is running on port, ${port}`);
})