import mongoose from "mongoose";

const NodeLatestSchema = new mongoose.Schema({
    nodeId: { type: String, unique: true },

    ownerEmail: String,

    temperature: Number,
    humidity: Number,

    pm25: Number,
    pm10: Number,

    aqi: Number,
    aqiLevel: String,

    reward: {
        type: Number,
        default: 0
    },

    location: {
        lat: Number,
        lng: Number
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export const NodeLatest = mongoose.model("NodeLatest", NodeLatestSchema);
