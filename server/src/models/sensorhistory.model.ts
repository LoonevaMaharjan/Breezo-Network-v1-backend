import mongoose from "mongoose";

const SensorHistorySchema = new mongoose.Schema({
    nodeId: String,

    temperature: Number,
    humidity: Number,

    pm25: Number,
    pm10: Number,

    aqi: Number,

    timestamp: {
        type: Date,
        default: Date.now
    }
});

export const SensorHistory = mongoose.model("SensorHistory", SensorHistorySchema);
