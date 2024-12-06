const { MongoClient, ObjectId } = require("mongodb");
let http = require("http");
let fs = require("fs");
let querystring = require("querystring");
const express = require("express");

const app = express();


const uri = "mongodb+srv://harii:RYFvmXgAGeQwfjtT@mydb.vcxyb.mongodb.net/?retryWrites=true&w=majority&appName=MyDB";


const client = new MongoClient(uri);
let finalstr = "";

// Connect to MongoDB once and reuse the connection for all requests
client.connect()
    .then(() => {
        console.log("Connected to MongoDB Atlas");

        // HTTP Server for Handling Form Data
        let server = http.createServer(async (req, res) => {
            if (req.method === "POST") {
                collectReqData(req, async (result) => {
                    if (result) {
                        finalstr = querystring.parse(result);

                        try {
                            const database = client.db("Database"); // Ensure it's a string
                            const collection = database.collection("chunks"); // Ensure it's a string

                            const insertResult = await collection.insertOne(finalstr);
                            console.log(`Document inserted with _id: ${insertResult.insertedId}`);

                            // Send back the inserted ID in the response
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({
                                link: `http://localhost:4000/data/${insertResult.insertedId}`,
                                data: finalstr.text,
                            }));
                        } catch (err) {
                            console.error("Error inserting document:", err);
                            res.writeHead(500, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ message: "Internal Server Error" }));
                        }
                    } else {
                        res.writeHead(400, { "Content-Type": "text/plain" });
                        res.end("Bad Request");
                    }
                });
            } else {
                res.writeHead(200, { "Content-Type": "text/html" });
                fs.createReadStream("./share.html", "utf-8").pipe(res);
            }
        });

        // Start HTTP Server
        server.listen(3000, (err) => {
            if (err) throw err;
            console.log("Server is running at port: http://localhost:3000");
        });

        // Helper Function to Collect Request Data
        function collectReqData(request, callback) {
            let form_URLENCODED = "application/x-www-form-urlencoded";
            if (request.headers["content-type"] === form_URLENCODED) {
                let body = "";
                request.on("data", (chunk) => {
                    body += chunk.toString();
                });
                request.on("end", () => {
                    callback(body);
                });
            } else {
                callback(null);
            }
        }

        // Express Route to Retrieve Data
        app.get("/data/:id", async (req, res) => {
            const { id } = req.params;
            try {
                const db = client.db("Database"); // Ensure it's a string
                const collection = db.collection("chunks"); // Ensure it's a string

                // Convert id to ObjectId
                const objectId = new ObjectId(id);

                const data = await collection.findOne({ _id: objectId }); // Use ObjectId for querying
                if (data) {
                    res.json(data.text);
                } else {
                    res.status(404).json({ message: "Data not found" });
                }
            } catch (err) {
                console.error("Error retrieving data:", err);
                res.status(500).json({ message: "Internal Server Error" });
            }
        });

        // Start the Express API server
        app.listen(4000, () => {
            console.log("API running at http://localhost:4000");
        });
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB Atlas:", err);
    });
