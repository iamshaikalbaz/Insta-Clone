const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/insta-clone");

const postSchema = mongoose.Schema({
    picture: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
    },
    caption: String,
    date: {
        type: Date,
        default: Date.now,
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        }
    ]
}, { timestamps: true }); // ✅ Adds createdAt and updatedAt automatically

module.exports = mongoose.model("post", postSchema);
