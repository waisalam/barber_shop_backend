import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import rateLimit from "express-rate-limit"
import helmet from 'helmet'
import authRoutes from './routes/auth.routes.js'
dotenv.config()


const app = express()

app.use(helmet())
app.use(cors({origin: process.env.FRONTEND_URL || '*'}))
app.use(express.json({limit: '10kb'}))

app.use(rateLimit({
    windowMs : 15*60*1000,
    max : 100,
    message: {error: 'Too many requests , Please try again lates'}
}))

app.use('/api/auth', authRoutes)

app.get('/health', (req, res)=>{
    res.json({status: 'ok'})
})

app.listen(3000,()=>{
    console.log('server is running on port 3000')
})
