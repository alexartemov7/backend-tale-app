import 'dotenv/config'

import express from "express"
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'


const app = express()
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGO_URI)
client.connect()
console.log('Connected to Mongo')
const PORT = process.env.PORT

app.listen(PORT, () => console.log(`API listening on port ${process.env.PORT}`))

//get access to all stories on page with a full list of stories by genre

app.get('/stories/genre/:genre', async (req, res) => {
    const db = client.db('tale-together');
    const stories = db.collection('stories');
    const users = db.collection('users');

    try {
      // Fetch stories with the specified genre
      const genreStoriesCursor = stories.find({ genre: req.params.genre });
      const genreStories = await genreStoriesCursor.toArray();
  
      // Enhanced logic to fetch author details for each story
      const formattedStories = await Promise.all(genreStories.map(async (story) => {
        const authorDetails = await Promise.all(story.authors.map(async (authorId) => {
          const author = await users.findOne({ _id: authorId });
          return author ? { username: author.username, profilePicture: author.profilePicture } : null;
        }));
  
        return {
          ...story,
          authors: authorDetails.filter(author => author !== null)
        };
      }));
  
      res.json(formattedStories);
    } catch (error) {
      console.error('Error fetching stories by genre:', error);
      res.status(500).send('Error fetching stories');
    }
  });
  
//get all chapters within one story

app.get('/stories/:storyId/chapters', async (req, res) => {
    const db = client.db('tale-together');
    const stories = db.collection('stories');

    try {
        // Convert the storyId from string to ObjectId
        const storyId = new ObjectId(req.params.storyId);

        // Fetch the story by its _id
        const story = await stories.findOne({ _id: storyId });

        if (!story) {
            return res.status(404).send('Story not found');
        } 

        // Respond with just the chapters
        res.json(story.chapters);
    } catch (error) {
        console.error('Error fetching chapters for story by _id:', error);
        res.status(500).send('Error fetching chapters');
    }
});


  //adding a whole story

  app.post('/stories', async (req, res) => {
    const db = client.db('tale-together');
    const stories = db.collection('stories');
  
    try {
      const newStory = {
        title: req.body.title,
        description: req.body.description,
        genre: req.body.genre,
        authors: req.body.authors, // Array of ObjectIds representing authors
        createdAt: new Date(),
        updatedAt: new Date(),
        illustration: req.body.illustration, // URL or reference to the story's illustration
        chapters: [] // Initially empty, chapters are added separately
      };
  
      // Insert the new story into the database
      await stories.insertOne(newStory);
  
      res.status(201).send('Story added successfully');
    } catch (error) {
      console.error('Error adding new story:', error);
      res.status(500).send('Error adding new story');
    }
  });
  

  //adding a new chapter to a particular story 

  app.post('/stories/:storyId/chapters', async (req, res) => {
    const db = client.db('tale-together');
    const stories = db.collection('stories');
  
    try {
      const storyId = req.params.storyId;
      const newChapter = {
        chapterId: new ObjectId(), // Generating a new ObjectId for the chapter
        title: req.body.title,
        description: req.body.description,
        content: req.body.content,
        author: req.body.author, // This should be the ObjectId of the author from 'users' collection
        createdAt: new Date(),
        updatedAt: new Date(),
        illustration: req.body.illustration // URL or reference to the chapter's illustration
      };
  
      // Add the new chapter to the story
      await stories.updateOne(
        { _id: new ObjectId(storyId) },
        { $push: { chapters: newChapter } }
      );
  
      res.status(201).send('Chapter added successfully');
    } catch (error) {
      console.error('Error adding chapter to story:', error);
      res.status(500).send('Error adding chapter to the story');
    }
  });
  
  