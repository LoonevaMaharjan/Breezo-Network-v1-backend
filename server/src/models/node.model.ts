import mongoose from "mongoose";

const NodeSchema = new mongoose.Schema({
    nodeId: { type: String, unique: true },

    ownerEmail: String,
    


}, { timestamps: true });

export const Node = mongoose.model("Node", NodeSchema);
