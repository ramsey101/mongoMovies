try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const dbName = "Moviesapp";
const collectionName = "Movies";
const port = Number(process.env.PORT) || 3000;
let moviesCollection;

app.use(express.static(__dirname + "/styles"));

//endpoint to get all movies
app.get("/", async (req, res) => {
  try {
    const movies = await moviesCollection.find({}).toArray();
    res.render("index.ejs", { movies });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

//endpoint to get a single movie by id
app.get("/index/:id", async (req, res) => {
  try {
    if (!/^[\da-f]{24}$/i.test(req.params.id)) {
      res.status(400).send("Invalid movie ID");
      return;
    }

    const movie = await moviesCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!movie) {
      res.status(404).send("Movie not found");
      return;
    }
    res.json(movie);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

//endpoint to serve the add movie page
app.get("/addmovies", (req, res) => {
  res.render("addmovies.ejs");
});

//endpoint to add a new movie
app.post("/addmovies", express.urlencoded({ extended: false, limit: "10kb" }), async (req, res) => {
  try {
    const { title, year, genre, rating } = req.body;
    const parsedYear = Number(year);
    const parsedRating = Number(rating);

    if (
      typeof title !== "string" ||
      typeof genre !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      !genre.trim() ||
      genre.trim().length > 80 ||
      !Number.isInteger(parsedYear) ||
      parsedYear < 1888 ||
      parsedYear > new Date().getFullYear() + 5 ||
      !Number.isFinite(parsedRating) ||
      parsedRating < 0 ||
      parsedRating > 10
    ) {
      res.status(400).send("Invalid movie details");
      return;
    }

    await moviesCollection.insertOne({
      title: title.trim(),
      year: parsedYear,
      genre: genre.trim(),
      rating: parsedRating,
    });
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing required environment variable: MONGODB_URI");
  }

  const client = new MongoClient(uri);
  await client.connect();
  moviesCollection = client.db(dbName).collection(collectionName);
  console.log("Connected successfully to MongoDB");

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exitCode = 1;
});
