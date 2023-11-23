import express from "express"
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb'

import 'dotenv/config'

const app = express()
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGO_URI)
const db = client.db('tale-together')
const authorsDb = db.collection('users')
const storiesDb = db.collection('stories')
const chaptersDb = db.collection('chapters')

client.connect()
console.log('Connected to Mongo')
const PORT = process.env.PORT

app.listen(PORT, () => console.log(`API listening on port ${process.env.PORT}`))

//get access to all stories on page with a full list of stories