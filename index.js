const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;
const app = express();


// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access' });
    }

    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: true, message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d4qhn1l.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOption object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)


        // clients items
        const popularUsers = client.db("brainHub").collection("users");
        const popularClassess = client.db("brainHub").collection("classes");
        const popularInstructor = client.db("brainHub").collection("instructor");
        const popularcarts = client.db("brainHub").collection("carts");

        // jwt added
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        // verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await popularUsers.findOne(query);
            if (user.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        }

        // Secure user 
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await popularUsers.find().toArray();
            res.send(result);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await popularUsers.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User Already Exist' })
            }
            const result = await popularUsers.insertOne(user);
            res.send(result);
        })

        // verifyJWT
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            console.log(email, req.decoded.email)
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await popularUsers.findOne(query);
            console.log(user)
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        // user specfic id
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await popularUsers.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };

            const result = await popularUsers.updateOne(filter, updateDoc);
            res.send(result);

        })

        app.get('/classes', async (req, res) => {
            const result = await popularClassess.find().toArray();
            res.send(result);
        })

        // classess item
        app.post('/classes', async (req, res) => {
            const classItem = req.body;
            const result = await popularClassess.insertOne(classItem)
            res.send(result);
        })

        // classes specfic id --------- approved or deny
        app.patch('/classes/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await popularClassess.updateOne(filter, updateDoc);
            res.send(result);
        })

        // feedback api
        app.patch("/class-feedback/:id", async (req, res) => {
            const id = req.params.id;
            const feedback = req.body.feedback;

            const query = { _id: new ObjectId(id) };
            const updatedFeedback = {
                $set: {
                    feedback: feedback,
                },
            };
            const result = await popularClassess.updateOne(query, updatedFeedback);
            res.send(result);
        });

        // get all classes
        app.get("/all-class", async (req, res) => {
            const result = await classCollenction.find().toArray();
            console.log(result)
            res.send(result);
        });



        // get all classes of instructor by email
        app.get("/myclass/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await popularClassess.find(query).toArray();
            res.send(result);
        });

        // class status (approve or deny) api
        app.patch("/class-status/:id", async (req, res) => {
            const id = req.params.id;
            const status = req.query.status;
            const query = { _id: new ObjectId(id) };
            const updatedStatus = {
                $set: {
                    status: status,
                },
            };

            const result = await popularClassess.updateOne(query, updatedStatus);
            res.send(result);
        });


        app.get('/instructor', async (req, res) => {
            const result = await popularInstructor.find().toArray();
            res.send(result);
        })

        // cart collection apis
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            console.log(email)
            console.log(email)
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, messahe: 'Forbidden Access' })
            }

            const query = { email: email };
            const result = await popularcarts.find(query).toArray();
            res.send(result);
        })

        app.post('/carts', async (req, res) => {
            const singleClass = req.body;
            console.log(singleClass);
            const result = await popularcarts.insertOne(singleClass);
            res.send(result);
        })

        // cart id
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await popularcarts.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Brain Hub is Running')
})

app.listen(port, () => {
    console.log(`Brain hub is sitting on port ${port}`)
})
