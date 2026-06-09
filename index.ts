import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from './routes/auth.routes.js'
import shopRoutes from './routes/shop.routes.js'
import appointmentRoutes from './routes/appointment.routes.js'
import reviewRoutes from './routes/review.routes.js'
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
app.use('/api/shop',shopRoutes)
app.use('/api/appointment', appointmentRoutes)
app.use('/api/review', reviewRoutes)

app.get('/health', (req, res)=>{
    res.json({status: 'ok'})
})

app.listen(3000,()=>{
    console.log('server is running on port 3000')
})
