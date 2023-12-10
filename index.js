import 'dotenv/config'

import express from "express"
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'
import OpenAI from 'openai';
const { OPENAI_KEY } = process.env;


  const openai = new OpenAI({
    apiKey: '' // This is also the default, can be omitted
});

const app = express()
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGO_URI)
client.connect()
console.log('Connected to Mongo')
const PORT = process.env.PORT 

app.listen(PORT, () => console.log(`API listening on port ${process.env.PORT}`))


async function createImage (prompt) {
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
          });  
         return response.data[0].url 
    } catch (err) {
      console.log(err);
    }
  }

app.post('/stories/generate',async(req,res)=>{
    const {storyId} = req.body 
    const stories = client.db('tale-together').collection('stories');
    const thisStory = await stories.findOne({title:storyId})
    console.log(thisStory)
    const storyImg =  await  createImage(thisStory.description)
    console.log(storyImg)
    await stories.updateOne({title: storyId},{$set: {illustration:storyImg}})
    res.send({img:storyImg})
})

//get access to all stories on page with a full list of stories by genre


app.get('/stories', async (req, res) => {
    const db = client.db('tale-together');
    const stories = db.collection('stories');
    const users = db.collection('users'); 
    try {
        // Fetch all stories
        const allStories = await stories.find({}).toArray();

        const storiesWithUserDetails = await Promise.all(
            allStories.map(async (story) => {
                // Fetch user details for each story
                const userDetails = await Promise.all(
                    story.users.map(async (userId) => {
                        const user = await users.findOne({ _id: userId });//use new ObjectId
                        return user ? {
                            // Add the user details you want to show
                            username: user.username,
                            profilePicture: user.profilePicture
                        } : null;
                    })
                );

                return {
                    _id: story._id,
                    title: story.title,
                    genre: story.genre,
                    description: story.description,
                    users: userDetails.filter(user => user !== null), // Filter out null values
                    illustration: story.illustration
                };
            })
        );

        res.json(storiesWithUserDetails);
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).send('Error fetching stories');
    }
});

//get all stories by genre

app.get('/stories/genre/:genre', async (req, res) => {
    const db = client.db('tale-together');
    const stories = db.collection('stories');

    try {
        // Fetch stories that match the genre
        const genre = req.params.genre;
        const genreStories = await stories.find({ genre: genre }, {
            projection: { title: 1, description: 1, illustration: 1, users: 1 }
        }).toArray();

        if (genreStories.length === 0) {
            return res.status(404).send('No stories found for this genre');
        }

        // Send the response with stories data
        res.json(genreStories);
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

  //adding a new chapter to a particular story 

  app.post('/stories/chapters/:storyId', async (req, res) => {
    const db = client.db('tale-together');
    const stories = db.collection('stories');
  
    try {
      const storyId = req.params.storyId;
      const newChapter = {
        chapterId: new ObjectId(), // Generating a new ObjectId for the chapter
        title: req.body.title,
        description: req.body.description,
        content: req.body.content, 
        createdAt: new Date(),
        updatedAt: new Date() 
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